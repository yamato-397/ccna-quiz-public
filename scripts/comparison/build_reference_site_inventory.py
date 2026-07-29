"""
参考サイト（ccnatiger）の問題棚卸しスクリプト。

入力: audit/reference-site/{choice,dnd,simulation}.fetch-log.json
      (scripts/comparison/05_full_extract.js が google.script.run 経由で取得した生データ)
出力: audit/reference-site/{choice,dnd,simulation}.{raw,normalized}.json

読み取り専用。参考サイトへのアクセスは行わない（既に取得済みのfetch-logを変換するのみ）。
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from normalize import normalize_prose, sha256_file, content_hash

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIT_DIR = os.path.join(ROOT, "audit", "reference-site")
SOURCE_TOP_URL = "https://baudroie.github.io/ccnatiger_practice/"


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load(name):
    with open(os.path.join(AUDIT_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def rel_hash(path_abs):
    if not path_abs or not os.path.isfile(path_abs):
        return None
    return sha256_file(path_abs)


# ---------------------------------------------------------------------------
# 4択問題
# ---------------------------------------------------------------------------

def build_choice():
    data = load("choice.fetch-log.json")
    scraped_at = data["fetchedAt"]
    source_url = data["sourceUrl"]
    image_map = data.get("imageFileMap", {})
    questions = data["questions"]

    raw = []
    normalized = []
    for q in questions:
        raw.append({
            "site": "reference-site",
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
            "sourceQuestionId": q.get("id"),
            **q,
        })

        choices = q.get("choices", [])
        options = [normalize_prose(c.get("text", "")) for c in choices]
        correct = [normalize_prose(c.get("text", "")) for c in choices if c.get("isCorrect")]

        image_name = q.get("imageName") or ""
        local_file = image_map.get(image_name) if image_name else None
        image_paths = [image_name] if image_name else []
        image_hashes = [h for h in [rel_hash(local_file)] if h]
        missing = [image_name] if image_name and not image_hashes else []

        normalized.append({
            "site": "reference-site",
            "id": q.get("id"),
            "displayId": q.get("displayId"),
            "type": "multiple" if (q.get("correctCount") or 1) > 1 else "single",
            "part": q.get("sheet"),
            "category": "選択問題",
            "question": normalize_prose(q.get("question", "")),
            "options": options,
            "correctAnswerTexts": correct,
            "explanation": normalize_prose(q.get("explanation", "")),
            "imagePaths": image_paths,
            "imageHashes": image_hashes,
            "missingImageFiles": missing,
            "contentHash": content_hash(
                q.get("question", ""),
                [c.get("text", "") for c in choices],
                [c.get("text", "") for c in choices if c.get("isCorrect")],
                image_hashes,
            ),
            "sourceQuestionId": q.get("id"),
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
        })

    write_json(os.path.join(AUDIT_DIR, "choice.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "choice.normalized.json"), normalized)
    return len(raw), sum(1 for n in normalized if n["missingImageFiles"])


# ---------------------------------------------------------------------------
# D&D問題
# ---------------------------------------------------------------------------

def parse_dnd_answer(dd_type, placeholders, answer_raw):
    mapping = {}
    if dd_type == "Grouping":
        parts = [p for p in answer_raw.split("|") if p]
        for part in parts:
            if ":" not in part:
                continue
            name, items_str = part.split(":", 1)
            items = [i for i in items_str.split(",") if i != ""]
            mapping[name] = items
    else:
        answers = answer_raw.split("|")
        for i, ph in enumerate(placeholders):
            if i < len(answers):
                mapping[ph] = [answers[i]] if answers[i] != "" else []
    return mapping


def build_dnd():
    data = load("dnd.fetch-log.json")
    scraped_at = data["fetchedAt"]
    source_url = data["sourceUrl"]
    image_map = data.get("imageFileMap", {})
    questions = data["questions"]

    raw = []
    normalized = []
    for dd in questions:
        raw_id = f"dd-{dd['id']}"
        raw.append({
            "site": "reference-site",
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
            "sourceQuestionId": raw_id,
            **dd,
        })

        placeholders = [p for p in dd.get("placeholders", "").split("|") if p != ""]
        choices = [c for c in dd.get("choices", "").split("|") if c != ""]
        mapping = parse_dnd_answer(dd.get("type"), placeholders, dd.get("answer", ""))

        image_path = dd.get("imagePath") or ""
        local_file = image_map.get(image_path) if image_path else None
        image_paths = [image_path] if image_path else []
        image_hashes = [h for h in [rel_hash(local_file)] if h]
        missing = [image_path] if image_path and not image_hashes else []

        mapping_texts = sorted(
            f"{normalize_prose(target)}: {', '.join(sorted(normalize_prose(i) for i in items))}"
            for target, items in mapping.items()
        )

        normalized.append({
            "site": "reference-site",
            "id": raw_id,
            "type": dd.get("type"),
            "part": None,
            "category": "D&D",
            "question": normalize_prose(dd.get("problemTitle") or dd.get("title", "")),
            "instructions": normalize_prose(dd.get("problemTitle", "")),
            "options": [normalize_prose(c) for c in choices],
            "targets": [normalize_prose(p) for p in placeholders],
            "correctAnswerTexts": mapping_texts,
            "allowMultiItemsPerTarget": dd.get("type") == "Grouping",
            "groupLimits": dd.get("grouplimits", ""),
            "imagePaths": image_paths,
            "imageHashes": image_hashes,
            "missingImageFiles": missing,
            "contentHash": content_hash(
                dd.get("problemTitle") or dd.get("title", ""),
                choices + placeholders,
                mapping_texts,
                image_hashes,
            ),
            "sourceQuestionId": raw_id,
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
        })

    write_json(os.path.join(AUDIT_DIR, "dnd.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "dnd.normalized.json"), normalized)
    return len(raw), sum(1 for n in normalized if n["missingImageFiles"])


# ---------------------------------------------------------------------------
# シミュレーション問題
# ---------------------------------------------------------------------------

HTML_TAG = re.compile(r"<[^>]+>")


def strip_html(s):
    return normalize_prose(HTML_TAG.sub(" ", s or ""))


def build_simulation():
    data = load("simulation.fetch-log.json")
    scraped_at = data["fetchedAt"]
    source_url = data["sourceUrl"]
    scenarios = data["scenarios"]

    raw = []
    normalized = []
    for sc in scenarios:
        raw_id = f"ref-sim-{sc['id']}"
        raw.append({
            "site": "reference-site",
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
            "sourceQuestionId": raw_id,
            **sc,
        })

        tasks = sc.get("tasks", [])
        validations = sc.get("validations", [])
        devices = sc.get("devices", [])

        task_texts = [normalize_prose(t.get("text", "")) for t in tasks]
        # コマンド例はCLIコマンドなので空白は変更しない（strip・改行統一のみ）
        command_texts = []
        for t in tasks:
            cmds = (t.get("commands") or "").split("\n")
            for c in cmds:
                c = c.strip()
                if c:
                    command_texts.append(c)

        validation_texts = sorted(
            f"{v.get('device','')}: {v.get('path','')} {v.get('match','')} {v.get('expected','')}"
            for v in validations
        )

        image_paths = [sc["localImagePath"]] if sc.get("localImagePath") else []
        image_hashes = []
        if image_paths:
            abs_path = os.path.join(ROOT, image_paths[0])
            h = rel_hash(abs_path)
            if h:
                image_hashes.append(h)
        missing = [sc.get("imageName")] if sc.get("imageName") and not image_hashes else []

        grading_status = "available" if validations else "manual-review-required"

        normalized.append({
            "site": "reference-site",
            "id": raw_id,
            "type": "simulation",
            "part": None,
            "category": "シミュレーション",
            "question": strip_html(sc.get("description", "")) + "\n" + " / ".join(task_texts),
            "title": normalize_prose(sc.get("title", "")),
            "scenario": strip_html(sc.get("description", "")),
            "devices": [{"name": d.get("name"), "type": d.get("type"), "physicalPorts": d.get("physicalPorts", [])} for d in devices],
            "tasks": task_texts,
            "options": command_texts,
            "correctAnswerTexts": validation_texts if validations else command_texts,
            "validations": validations,
            "imagePaths": image_paths,
            "imageHashes": image_hashes,
            "missingImageFiles": missing,
            "gradingStatus": grading_status,
            "sourceSiteTrialWarning": True,
            "sourceSiteTrialWarningDetail": "参考サイトの「実機問題」セクションは2026-07-27時点で「仮導入」とアナウンスされており、採点エンジンが不安定な可能性がある。",
            "contentHash": content_hash(
                sc.get("title", "") + strip_html(sc.get("description", "")),
                command_texts,
                validation_texts if validations else command_texts,
                image_hashes,
            ),
            "sourceQuestionId": raw_id,
            "sourceUrl": source_url,
            "scrapedAt": scraped_at,
        })

    write_json(os.path.join(AUDIT_DIR, "simulation.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "simulation.normalized.json"), normalized)
    return len(raw), sum(1 for n in normalized if n["gradingStatus"] != "available")


def main():
    n_choice, missing_choice = build_choice()
    n_dnd, missing_dnd = build_dnd()
    n_sim, manual_sim = build_simulation()
    print(f"choice: {n_choice} 件 (画像欠落 {missing_choice} 件)")
    print(f"dnd: {n_dnd} 件 (画像欠落 {missing_dnd} 件)")
    print(f"simulation: {n_sim} 件 (要手動確認 {manual_sim} 件)")


if __name__ == "__main__":
    main()
