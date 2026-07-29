"""
フェーズ5-8: 正規化済みデータの突合とレポート生成。

分類:
  EXACT_MATCH / EQUIVALENT / SIMILAR / REFERENCE_ONLY / MY_SITE_ONLY /
  ANSWER_CONFLICT / AMBIGUOUS

REFERENCE_ONLY だけを追加候補(reports/addition-candidates.json)とする。
SIMILAR / ANSWER_CONFLICT / AMBIGUOUS は自動追加しない。
"""
import csv
import difflib
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIT_MY = os.path.join(ROOT, "audit", "my-site")
AUDIT_REF = os.path.join(ROOT, "audit", "reference-site")
REPORTS = os.path.join(ROOT, "reports")
os.makedirs(REPORTS, exist_ok=True)


def load(dirpath, name):
    with open(os.path.join(dirpath, name), encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def text_ratio(a, b):
    return difflib.SequenceMatcher(None, a or "", b or "").quick_ratio()


def set_ratio(a, b):
    sa, sb = set(a or []), set(b or [])
    if not sa and not sb:
        return 1.0
    union = sa | sb
    if not union:
        return 1.0
    return len(sa & sb) / len(union)


ALL_RESULTS = []  # comparisonId, type, status, ...
CID = {"n": 0}


def new_cid(prefix):
    CID["n"] += 1
    return f"{prefix}-{CID['n']:05d}"


# ---------------------------------------------------------------------------
# 4択問題の突合
# ---------------------------------------------------------------------------

def compare_choice():
    my_q = load(AUDIT_MY, "choice.normalized.json")
    ref_q = load(AUDIT_REF, "choice.normalized.json")

    my_by_hash = {}
    my_by_id = {}
    my_by_text = {}
    for m in my_q:
        my_by_hash.setdefault(m["contentHash"], []).append(m)
        my_by_id[m["id"]] = m
        my_by_text.setdefault(m["question"], []).append(m)

    matched_my_ids = set()
    results = []

    for r in ref_q:
        status = None
        my_ids = []
        reason = ""
        q_sim = 1.0
        opt_sim = 1.0
        answer_match = True
        image_match = True

        cand = None
        if r["contentHash"] in my_by_hash:
            cand = my_by_hash[r["contentHash"]][0]
            status = "EXACT_MATCH"
            reason = "正規化後コンテンツハッシュが完全一致"
        elif r["id"] in my_by_id and my_by_id[r["id"]]["question"] == r["question"]:
            cand = my_by_id[r["id"]]
            if set(cand["correctAnswerTexts"]) != set(r["correctAnswerTexts"]):
                status = "ANSWER_CONFLICT"
                reason = "同一ID・同一問題文だが正解が異なる"
                answer_match = False
            elif set(cand["options"]) == set(r["options"]):
                status = "EQUIVALENT"
                reason = "同一ID・同一問題文・同一正解だが画像/解説等でハッシュが不一致"
            else:
                status = "EQUIVALENT"
                reason = "同一ID・同一問題文・同一正解（選択肢集合に軽微な差異）"
                opt_sim = set_ratio(cand["options"], r["options"])
        elif r["question"] in my_by_text:
            cand = my_by_text[r["question"]][0]
            if set(cand["correctAnswerTexts"]) != set(r["correctAnswerTexts"]):
                status = "ANSWER_CONFLICT"
                reason = "問題文一致(別ID)だが正解が異なる"
                answer_match = False
            else:
                status = "EQUIVALENT"
                reason = "問題文一致(別ID)・正解一致"
        elif r["id"] in my_by_id:
            cand = my_by_id[r["id"]]
            ratio = text_ratio(cand["question"], r["question"])
            q_sim = ratio
            if ratio >= 0.6:
                status = "AMBIGUOUS"
                reason = f"同一IDだが問題文が異なる(類似度{ratio:.2f}) - 自動判定不可"
            else:
                status = None  # 別問題として扱い、下のフォールバックで判定

        if status is None:
            # フォールバック: 未マッチのマイサイト問題からファジー検索
            best = None
            best_score = 0.0
            for m in my_q:
                if m["id"] in matched_my_ids:
                    continue
                score = 0.6 * text_ratio(m["question"], r["question"]) + 0.4 * set_ratio(m["options"], r["options"])
                if score > best_score:
                    best_score = score
                    best = m
            if best and best_score >= 0.85:
                cand = best
                status = "SIMILAR"
                q_sim = text_ratio(best["question"], r["question"])
                opt_sim = set_ratio(best["options"], r["options"])
                reason = f"高い類似度({best_score:.2f})だが問題文/選択肢が完全一致しないため要確認"
            elif best and best_score >= 0.6:
                cand = best
                status = "SIMILAR"
                q_sim = text_ratio(best["question"], r["question"])
                opt_sim = set_ratio(best["options"], r["options"])
                reason = f"同一知識領域の可能性(類似度{best_score:.2f})だが設問条件が異なる可能性"
            else:
                status = "REFERENCE_ONLY"
                reason = "マイサイトに対応する問題が見つからない"

        if cand:
            my_ids = [cand["id"]]
            matched_my_ids.add(cand["id"])
            image_match = set(cand.get("imageHashes", [])) == set(r.get("imageHashes", []))

        # part mapping
        # 注意: 参考サイトのお知らせ(06/13)によりpart_⑦は「①〜⑤の集約版」であり、
        # 独立した新カテゴリではない可能性が高いため、Part⑦由来の候補はconfidenceを下げる。
        proposed_part = r.get("part")
        if proposed_part == "part_⑦":
            part_confidence = "medium"
        elif proposed_part:
            part_confidence = "high"
        else:
            part_confidence = "low"

        results.append({
            "comparisonId": new_cid("choice"),
            "type": "choice",
            "status": status,
            "mySiteQuestionIds": my_ids,
            "referenceQuestionIds": [r["id"]],
            "questionSimilarity": round(q_sim, 3),
            "optionSimilarity": round(opt_sim, 3),
            "answerMatches": answer_match,
            "imageMatches": image_match,
            "proposedPart": proposed_part,
            "partConfidence": part_confidence,
            "reason": reason,
            "manualReviewRequired": status in ("SIMILAR", "ANSWER_CONFLICT", "AMBIGUOUS"),
            "referenceRecord": r,
        })

    for m in my_q:
        if m["id"] not in matched_my_ids:
            results.append({
                "comparisonId": new_cid("choice"),
                "type": "choice",
                "status": "MY_SITE_ONLY",
                "mySiteQuestionIds": [m["id"]],
                "referenceQuestionIds": [],
                "questionSimilarity": 0,
                "optionSimilarity": 0,
                "answerMatches": True,
                "imageMatches": True,
                "proposedPart": m.get("part"),
                "partConfidence": "high",
                "reason": "参考サイトに対応する問題が見つからない",
                "manualReviewRequired": False,
                "referenceRecord": None,
            })

    return results


# ---------------------------------------------------------------------------
# D&D問題の突合
# ---------------------------------------------------------------------------

def compare_dnd():
    my_q = load(AUDIT_MY, "dnd.normalized.json")
    ref_q = load(AUDIT_REF, "dnd.normalized.json")

    my_by_hash = {m["contentHash"]: m for m in my_q}
    my_by_id = {m["id"]: m for m in my_q}
    matched_my_ids = set()
    results = []

    for r in ref_q:
        status = None
        reason = ""
        my_ids = []
        answer_match = True
        image_match = True
        q_sim = 1.0
        opt_sim = 1.0
        cand = None

        if r["contentHash"] in my_by_hash:
            cand = my_by_hash[r["contentHash"]]
            status = "EXACT_MATCH"
            reason = "正規化後コンテンツハッシュが完全一致"
        elif r["id"] in my_by_id and my_by_id[r["id"]]["question"] == r["question"] and my_by_id[r["id"]]["type"] == r["type"]:
            cand = my_by_id[r["id"]]
            if set(cand["correctAnswerTexts"]) != set(r["correctAnswerTexts"]):
                status = "ANSWER_CONFLICT"
                reason = "同一ID・同一問題文だが正解マッピングが異なる"
                answer_match = False
            else:
                status = "EQUIVALENT"
                reason = "同一ID・同一問題文・同一マッピング（画像等でハッシュ不一致）"
        else:
            best = None
            best_score = 0.0
            for m in my_q:
                if m["id"] in matched_my_ids:
                    continue
                score = 0.5 * text_ratio(m["question"], r["question"]) + 0.5 * set_ratio(m["options"], r["options"])
                if score > best_score:
                    best_score = score
                    best = m
            if best and best_score >= 0.85:
                cand = best
                status = "SIMILAR"
                q_sim = text_ratio(best["question"], r["question"])
                opt_sim = set_ratio(best["options"], r["options"])
                reason = f"高い類似度({best_score:.2f})だが完全一致しないため要確認"
            else:
                status = "REFERENCE_ONLY"
                reason = "マイサイトに対応するD&D問題が見つからない（新規追加分の可能性、id={}）".format(r["id"])

        if cand:
            my_ids = [cand["id"]]
            matched_my_ids.add(cand["id"])
            image_match = set(cand.get("imageHashes", [])) == set(r.get("imageHashes", []))

        results.append({
            "comparisonId": new_cid("dnd"),
            "type": "dnd",
            "status": status,
            "mySiteQuestionIds": my_ids,
            "referenceQuestionIds": [r["id"]],
            "questionSimilarity": round(q_sim, 3),
            "optionSimilarity": round(opt_sim, 3),
            "answerMatches": answer_match,
            "imageMatches": image_match,
            "proposedPart": None,
            "partConfidence": "n/a",
            "reason": reason,
            "manualReviewRequired": status in ("SIMILAR", "ANSWER_CONFLICT", "AMBIGUOUS"),
            "referenceRecord": r,
        })

    for m in my_q:
        if m["id"] not in matched_my_ids:
            results.append({
                "comparisonId": new_cid("dnd"),
                "type": "dnd",
                "status": "MY_SITE_ONLY",
                "mySiteQuestionIds": [m["id"]],
                "referenceQuestionIds": [],
                "questionSimilarity": 0,
                "optionSimilarity": 0,
                "answerMatches": True,
                "imageMatches": True,
                "proposedPart": None,
                "partConfidence": "n/a",
                "reason": "参考サイトに対応するD&D問題が見つからない",
                "manualReviewRequired": False,
                "referenceRecord": None,
            })

    return results


# ---------------------------------------------------------------------------
# シミュレーション問題の突合（マイサイトとは形式が全く異なるため類似度ベース）
# ---------------------------------------------------------------------------

def compare_simulation():
    my_q = load(AUDIT_MY, "simulation.normalized.json")
    ref_q = load(AUDIT_REF, "simulation.normalized.json")

    matched_my_ids = set()
    results = []

    for r in ref_q:
        best = None
        best_score = 0.0
        for m in my_q:
            title_sim = text_ratio(m.get("title", ""), r.get("title", ""))
            cmd_overlap = set_ratio(
                [o.split(": ", 1)[-1].lower() for o in m.get("options", [])],
                [c.lower() for c in r.get("options", [])],
            )
            score = 0.4 * title_sim + 0.6 * cmd_overlap
            if score > best_score:
                best_score = score
                best = m

        if best and best_score >= 0.4:
            status = "SIMILAR"
            reason = (
                f"タイトル類似度/コマンド重複度から同一シナリオの可能性あり(score={best_score:.2f})。"
                "ただし採点方式(コマンド行一致 vs 状態バリデーション)が全く異なるため要手動確認。"
            )
            my_ids = [best["id"]]
            matched_my_ids.add(best["id"])
        else:
            status = "REFERENCE_ONLY"
            reason = "マイサイトに対応するシミュレーション問題が見つからない（新規シナリオ）"
            my_ids = []

        results.append({
            "comparisonId": new_cid("sim"),
            "type": "simulation",
            "status": status,
            "mySiteQuestionIds": my_ids,
            "referenceQuestionIds": [r["id"]],
            "questionSimilarity": round(best_score, 3) if best else 0,
            "optionSimilarity": 0,
            "answerMatches": False,
            "imageMatches": False,
            "proposedPart": None,
            "partConfidence": "n/a",
            "reason": reason,
            "manualReviewRequired": True,  # シミュレーションは常に要手動確認（採点方式が根本的に異なるため）
            "referenceRecord": r,
        })

    for m in my_q:
        if m["id"] not in matched_my_ids:
            results.append({
                "comparisonId": new_cid("sim"),
                "type": "simulation",
                "status": "MY_SITE_ONLY",
                "mySiteQuestionIds": [m["id"]],
                "referenceQuestionIds": [],
                "questionSimilarity": 0,
                "optionSimilarity": 0,
                "answerMatches": True,
                "imageMatches": True,
                "proposedPart": None,
                "partConfidence": "n/a",
                "reason": "参考サイトに対応するシミュレーション問題が見つからない",
                "manualReviewRequired": False,
                "referenceRecord": None,
            })

    return results


def main():
    choice_results = compare_choice()
    dnd_results = compare_dnd()
    sim_results = compare_simulation()
    all_results = choice_results + dnd_results + sim_results

    # レポート出力用にreferenceRecordを分離（detail.jsonには要約のみ含める）
    detail = []
    for r in all_results:
        d = {k: v for k, v in r.items() if k != "referenceRecord"}
        detail.append(d)

    write_json(os.path.join(REPORTS, "comparison-detail.json"), detail)

    with open(os.path.join(REPORTS, "comparison-detail.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["comparisonId", "type", "status", "mySiteQuestionIds", "referenceQuestionIds",
                    "questionSimilarity", "optionSimilarity", "answerMatches", "imageMatches",
                    "proposedPart", "partConfidence", "reason", "manualReviewRequired"])
        for r in detail:
            w.writerow([
                r["comparisonId"], r["type"], r["status"],
                ";".join(r["mySiteQuestionIds"]), ";".join(r["referenceQuestionIds"]),
                r["questionSimilarity"], r["optionSimilarity"], r["answerMatches"], r["imageMatches"],
                r["proposedPart"] or "", r["partConfidence"], r["reason"], r["manualReviewRequired"],
            ])

    by_status = {}
    for r in all_results:
        by_status.setdefault(r["status"], []).append(r)

    def dump_status(status, filename):
        items = by_status.get(status, [])
        write_json(os.path.join(REPORTS, filename), [
            {k: v for k, v in r.items()} for r in items
        ])
        return len(items)

    counts = {}
    counts["EXACT_MATCH"] = dump_status("EXACT_MATCH", "exact-matches.json")
    counts["EQUIVALENT"] = dump_status("EQUIVALENT", "equivalent-matches.json")
    counts["SIMILAR"] = dump_status("SIMILAR", "similar-candidates.json")
    counts["ANSWER_CONFLICT"] = dump_status("ANSWER_CONFLICT", "answer-conflicts.json")
    counts["AMBIGUOUS"] = dump_status("AMBIGUOUS", "ambiguous-candidates.json")
    counts["MY_SITE_ONLY"] = dump_status("MY_SITE_ONLY", "my-site-only.json")
    counts["REFERENCE_ONLY"] = dump_status("REFERENCE_ONLY", "reference-only-full.json")

    # 追加候補 = REFERENCE_ONLY のみ、Part確信度別に整理
    ref_only = by_status.get("REFERENCE_ONLY", [])
    addition_candidates = []
    for r in ref_only:
        addition_candidates.append({
            "comparisonId": r["comparisonId"],
            "type": r["type"],
            "referenceQuestionId": r["referenceQuestionIds"][0],
            "proposedPart": r["proposedPart"],
            "partConfidence": r["partConfidence"],
            "approved": False,
        })
    write_json(os.path.join(REPORTS, "addition-candidates.json"), addition_candidates)

    # Part対応マッピング
    part_mapping = []
    for r in choice_results:
        if r["status"] == "REFERENCE_ONLY":
            rec = r["referenceRecord"]
            is_part7 = rec.get("part") == "part_⑦"
            part_mapping.append({
                "sourceQuestionId": rec["id"],
                "sourceCategory": rec.get("category"),
                "proposedPart": rec.get("part"),
                "confidence": "medium" if is_part7 else "high",
                "reason": (
                    "part_⑦は参考サイトのお知らせ(06/13)により「①〜⑤の集約版」と説明されており、"
                    "独立した新カテゴリか既存Partへの再分類が必要か要確認"
                    if is_part7 else
                    "参考サイトのシート名(part)をそのまま踏襲（同一サイト内の自己申告分類のため）"
                ),
                "manualReviewRequired": is_part7,
            })
    for r in dnd_results + sim_results:
        if r["status"] == "REFERENCE_ONLY":
            rec = r["referenceRecord"]
            part_mapping.append({
                "sourceQuestionId": rec["id"],
                "sourceCategory": rec.get("category"),
                "proposedPart": None,
                "confidence": "n/a",
                "reason": "D&D/シミュレーションはPart分類の対象外（既存データにもPart概念なし）",
                "manualReviewRequired": False,
            })
    write_json(os.path.join(REPORTS, "part-mapping.json"), part_mapping)

    # 画像比較サマリー
    def image_summary(results, my_norm, ref_norm):
        my_with_img = sum(1 for m in my_norm if m.get("imagePaths"))
        ref_with_img = sum(1 for r in ref_norm if r.get("imagePaths"))
        matched_img = sum(1 for r in results if r["status"] in ("EXACT_MATCH", "EQUIVALENT") and r.get("imageMatches") is False)
        return {"mySiteWithImage": my_with_img, "referenceWithImage": ref_with_img, "matchedButImageDiffers": matched_img}

    image_comparison = {
        "choice": image_summary(choice_results, load(AUDIT_MY, "choice.normalized.json"), load(AUDIT_REF, "choice.normalized.json")),
        "dnd": image_summary(dnd_results, load(AUDIT_MY, "dnd.normalized.json"), load(AUDIT_REF, "dnd.normalized.json")),
        "simulation": image_summary(sim_results, load(AUDIT_MY, "simulation.normalized.json"), load(AUDIT_REF, "simulation.normalized.json")),
    }
    write_json(os.path.join(REPORTS, "image-comparison.json"), image_comparison)

    # scraping-errors.json はaudit/reference-siteのものをそのままコピー
    errors_path = os.path.join(AUDIT_REF, "scraping-errors.json")
    if os.path.isfile(errors_path):
        with open(errors_path, encoding="utf-8") as f:
            errors = json.load(f)
    else:
        errors = []
    write_json(os.path.join(REPORTS, "scraping-errors.json"), errors)

    print(json.dumps(counts, ensure_ascii=False, indent=2))

    # サマリー用の集計をJSONで返す（Markdown生成は別途)
    summary = {
        "counts": counts,
        "byType": {
            "choice": {s: len([r for r in choice_results if r["status"] == s]) for s in
                       ["EXACT_MATCH", "EQUIVALENT", "SIMILAR", "REFERENCE_ONLY", "MY_SITE_ONLY", "ANSWER_CONFLICT", "AMBIGUOUS"]},
            "dnd": {s: len([r for r in dnd_results if r["status"] == s]) for s in
                    ["EXACT_MATCH", "EQUIVALENT", "SIMILAR", "REFERENCE_ONLY", "MY_SITE_ONLY", "ANSWER_CONFLICT", "AMBIGUOUS"]},
            "simulation": {s: len([r for r in sim_results if r["status"] == s]) for s in
                           ["EXACT_MATCH", "EQUIVALENT", "SIMILAR", "REFERENCE_ONLY", "MY_SITE_ONLY", "ANSWER_CONFLICT", "AMBIGUOUS"]},
        },
        "additionCandidates": len(addition_candidates),
        "additionCandidatesByType": {
            "choice": len([a for a in addition_candidates if a["type"] == "choice"]),
            "dnd": len([a for a in addition_candidates if a["type"] == "dnd"]),
            "simulation": len([a for a in addition_candidates if a["type"] == "simulation"]),
        },
        "additionCandidatesByPart": {},
    }
    part_counter = {}
    for a in addition_candidates:
        p = a["proposedPart"] or "分類保留"
        part_counter[p] = part_counter.get(p, 0) + 1
    summary["additionCandidatesByPart"] = part_counter

    write_json(os.path.join(REPORTS, "_summary_data.json"), summary)


if __name__ == "__main__":
    main()
