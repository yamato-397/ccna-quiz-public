"""
ユーザーの明確化指示に基づき、参考サイトのpart_⑦（205問）を全問マイサイトへ反映する。

これは「不足16問だけの追加」から「part_⑦シートを丸ごとミラー」への方針変更。
そのため、直前のラウンドで追加した ref-choice-0001〜0016（16問のみ）を削除し、
part_⑦-1〜205（205問全て）を参考サイトの生データのまま追加し直す。

方針:
  - IDは参考サイトと同じ "part_⑦-<N>" をそのまま使用する
    （このIDは今回新規作成したものであり、他の既存Part①〜⑥のIDとは独立している）
  - 選択肢・正解・画像は参考サイトのpart_⑦の値をそのまま使用する
    （Part①〜⑤に同一内容の問題が既に存在していても、正解が異なる場合があるが、
      これは参考サイト自身の「集約版」データをそのまま反映するという指示に基づき、
      Part①〜⑥側の既存問題は一切変更せず、part_⑦側も参考サイトの値をそのまま採用する）
  - 画像はpart_⑦の64問分すべてを本番images/へコピーする
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QUESTIONS_PATH = os.path.join(ROOT, "data", "questions.json")
FETCH_LOG_PATH = os.path.join(ROOT, "audit", "reference-site", "choice.fetch-log.json")
PROVENANCE_PATH = os.path.join(ROOT, "data", "source-provenance.json")
IMAGES_DIR = os.path.join(ROOT, "images")

REMOVE_IDS = {f"ref-choice-{i:04d}" for i in range(1, 17)}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def dest_image_filename(image_name):
    # 既存の命名規則(拡張子小文字化)に合わせる。バックスラッシュ等は含まれない想定。
    base, ext = os.path.splitext(image_name)
    return base + ext.lower()


def main():
    questions = load(QUESTIONS_PATH)
    fetch_log = load(FETCH_LOG_PATH)
    image_map = fetch_log["imageFileMap"]
    part7_raw = [r for r in fetch_log["questions"] if r["sheet"] == "part_⑦"]
    assert len(part7_raw) == 205, f"想定外のpart_⑦件数: {len(part7_raw)}"

    sel = questions["selection_questions"]
    before_count = len(sel)
    sel = [q for q in sel if q["id"] not in REMOVE_IDS]
    removed_count = before_count - len(sel)
    print(f"削除: 前回追加のref-choice-0001〜0016 {removed_count}件")

    existing_ids = {q["id"] for q in sel}

    new_entries = []
    img_ok, img_fail = 0, 0
    for r in part7_raw:
        qid = r["id"]  # "part_⑦-<N>"
        assert qid not in existing_ids, f"ID衝突: {qid}"

        entry = {
            "id": qid,
            "displayId": r.get("displayId"),
            "category": "選択問題",
            "part": "part_⑦",
            "question": r["question"],
            "choices": [c["text"] for c in r["choices"]],
            "correctAnswers": [c["text"] for c in r["choices"] if c.get("isCorrect")],
            "correctCount": r.get("correctCount"),
            "explanation": r.get("explanation", ""),
            "imageName": r.get("imageName", ""),
            "hasImage": bool(r.get("imageName")),
        }

        if entry["hasImage"]:
            src = image_map.get(r["imageName"])
            if src and os.path.isfile(src):
                dest_name = dest_image_filename(r["imageName"])
                dest = os.path.join(IMAGES_DIR, dest_name)
                if not os.path.isfile(dest):
                    with open(src, "rb") as fsrc, open(dest, "wb") as fdst:
                        fdst.write(fsrc.read())
                entry["localImagePath"] = f"images/{dest_name}"
                img_ok += 1
            else:
                img_fail += 1
                print(f"[WARN] 画像取得失敗のため画像なしで追加: {qid} ({r.get('imageName')})")
                entry["hasImage"] = False
                entry["imageName"] = ""

        new_entries.append(entry)

    sel.extend(new_entries)
    questions["selection_questions"] = sel

    questions["metadata"]["counts"]["selection"] = len(sel)
    questions["metadata"]["counts"]["total"] = len(sel) + len(questions["dd_questions"])
    questions["metadata"]["counts"]["selectionWithImages"] = sum(1 for q in sel if q.get("hasImage"))
    questions["metadata"]["comparisonAddition"] = {
        "updatedAt": "2026-07-30T00:00:00+09:00",
        "note": (
            "ユーザー指示により方針変更: part_⑦(205問)を参考サイトからそのまま全問ミラー。"
            "前回追加したref-choice-0001〜0016(16問)はpart_⑦-4等へ置き換えられた。"
            "Part①〜⑥の既存516問は一切変更していない。"
        ),
    }
    write_json(QUESTIONS_PATH, questions)

    # provenance更新: 個別16件のエントリを削除し、part_⑦全体の一括記録に置き換え
    prov = load(PROVENANCE_PATH)
    for old_id in REMOVE_IDS:
        prov.get("choice", {}).pop(old_id, None)
    prov.setdefault("choicePart7FullMirror", {
        "sourceSite": "reference-site",
        "sourceSheet": "part_⑦",
        "sourceUrl": fetch_log["sourceUrl"],
        "scrapedAt": fetch_log["fetchedAt"],
        "count": 205,
        "note": "参考サイトのpart_⑦シートを205問すべてそのまま反映（ユーザー指示、2026-07-30）。",
    })
    write_json(PROVENANCE_PATH, prov)

    print(f"追加: part_⑦-1〜205 全{len(new_entries)}件（画像あり{img_ok}件・画像取得失敗{img_fail}件）")
    print(f"選択問題合計: {len(sel)}問")


if __name__ == "__main__":
    main()
