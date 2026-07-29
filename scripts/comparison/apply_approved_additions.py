"""
フェーズ10: 承認済み候補（4択16件・D&D1件）を本番 data/questions.json へ追加する。

厳守事項:
  - 既存問題(id)は一切変更・削除しない
  - 承認されたID以外は追加しない
  - 正解・解説をAIで補完しない（参考サイトから取得した値をそのまま使用）
  - 取得元情報(sourceSite/sourceQuestionId/sourceUrl/scrapedAt/contentHash)は
    内部管理データ(data/source-provenance.json)へ保存し、本番画面には表示しない
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QUESTIONS_PATH = os.path.join(ROOT, "data", "questions.json")
AUDIT_REF = os.path.join(ROOT, "audit", "reference-site")
PROVENANCE_PATH = os.path.join(ROOT, "data", "source-provenance.json")

APPROVED_CHOICE_IDS = [
    "part_⑦-4", "part_⑦-5", "part_⑦-6", "part_⑦-8", "part_⑦-10", "part_⑦-15",
    "part_⑦-16", "part_⑦-18", "part_⑦-25", "part_⑦-27", "part_⑦-31",
    "part_⑦-201", "part_⑦-202", "part_⑦-203", "part_⑦-204", "part_⑦-205",
]
APPROVED_DND_SOURCE_ID = "dd-28"

# 参考サイトimageName -> 本番images/配下ファイル名（コピー済み、拡張子は既存命名規則に合わせ小文字化）
IMAGE_FILE_MAP = {
    "q-11-30-60.jpg": "q-11-30-60.jpg",
    "q-12-29-2.jpg": "q-12-29-2.jpg",
    "q-12-29-12.jpg": "q-12-29-12.jpg",
    "q-12-29-15.jpg": "q-12-29-15.jpg",
    "no543.JPG": "no543.jpg",
    "no585.JPG": "no585.jpg",
    "q-11-8-72.jpg": "q-11-8-72.jpg",
    "q-10-26-2.jpg": "q-10-26-2.jpg",
    "no_16.png": "no_16.png",
    "no259.png": "no259.png",
    "no_402.png": "no_402.png",
    "no527.png": "no527.png",
    "no921.png": "no921.png",
}
DND_IMAGE_FILE = "dd28.jpg"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    questions = load(QUESTIONS_PATH)
    existing_ids = {q["id"] for q in questions["selection_questions"]}
    existing_dd_ids = {q["id"] for q in questions["dd_questions"]}

    ref_choice_raw = {r["sourceQuestionId"]: r for r in load(os.path.join(AUDIT_REF, "choice.raw.json"))}
    ref_dnd_raw = {r["sourceQuestionId"]: r for r in load(os.path.join(AUDIT_REF, "dnd.raw.json"))}

    provenance = load(PROVENANCE_PATH) if os.path.isfile(PROVENANCE_PATH) else {"choice": {}, "dnd": {}, "simulation": {}}

    # --- 4択問題 16件 ---
    new_choice_entries = []
    for i, src_id in enumerate(APPROVED_CHOICE_IDS, start=1):
        new_id = f"ref-choice-{i:04d}"
        assert new_id not in existing_ids, f"ID衝突: {new_id}"
        r = ref_choice_raw[src_id]

        entry = {
            "id": new_id,
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
            local_name = IMAGE_FILE_MAP[r["imageName"]]
            entry["localImagePath"] = f"images/{local_name}"

        new_choice_entries.append(entry)
        provenance.setdefault("choice", {})[new_id] = {
            "sourceSite": "reference-site",
            "sourceQuestionId": src_id,
            "sourceUrl": r["sourceUrl"],
            "scrapedAt": r["scrapedAt"],
        }

    # --- D&D 1件 ---
    r = ref_dnd_raw[APPROVED_DND_SOURCE_ID]
    new_dnd_id = "ref-dnd-0001"
    assert new_dnd_id not in existing_dd_ids, f"ID衝突: {new_dnd_id}"
    dnd_entry = {
        "id": new_dnd_id,
        "title": r["title"],
        "category": "D&D",
        "type": r["type"],
        "problemTitle": r["problemTitle"],
        "question": r["question"],
        "choices": r["choices"].split("|"),
        "answer": r["answer"],
        "placeholders": r["placeholders"].split("|"),
        "grouplimits": r.get("grouplimits", ""),
        "imagePath": f"images/{DND_IMAGE_FILE}" if r.get("imagePath") else "",
    }
    provenance.setdefault("dnd", {})[new_dnd_id] = {
        "sourceSite": "reference-site",
        "sourceQuestionId": APPROVED_DND_SOURCE_ID,
        "sourceUrl": r["sourceUrl"],
        "scrapedAt": r["scrapedAt"],
    }

    # --- 反映 ---
    questions["selection_questions"].extend(new_choice_entries)
    questions["dd_questions"].append(dnd_entry)

    with_images_added = sum(1 for e in new_choice_entries if e["hasImage"])
    questions["metadata"]["counts"]["selection"] = len(questions["selection_questions"])
    questions["metadata"]["counts"]["dd"] = len(questions["dd_questions"])
    questions["metadata"]["counts"]["total"] = questions["metadata"]["counts"]["selection"] + questions["metadata"]["counts"]["dd"]
    questions["metadata"]["counts"]["selectionWithImages"] = questions["metadata"]["counts"].get("selectionWithImages", 0) + with_images_added
    questions["metadata"]["comparisonAddition"] = {
        "addedAt": "2026-07-29T23:40:00+09:00",
        "addedChoice": len(new_choice_entries),
        "addedDnd": 1,
        "note": "参考サイト(ccnatiger)との突合により不足していたpart_⑦相当16問とD&D 1問(dd-28)を追加。extractedAtは既存分の取得日時のため変更していない。",
    }

    write_json(QUESTIONS_PATH, questions)
    write_json(PROVENANCE_PATH, provenance)

    print(f"選択問題を{len(new_choice_entries)}件追加（画像あり{with_images_added}件）")
    print(f"D&D問題を1件追加: {new_dnd_id}")
    print(f"合計: 選択問題{questions['metadata']['counts']['selection']}問 / D&D{questions['metadata']['counts']['dd']}問")


if __name__ == "__main__":
    main()
