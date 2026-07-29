"""
マイサイト（ccna-quiz-public）の問題棚卸しスクリプト。

読み込み専用。本番データ（data/, images/）は一切変更しない。
出力先: audit/my-site/{choice,dnd,simulation}.{raw,normalized}.json

対象:
  - 4択問題   : data/questions.json の selection_questions[]
  - D&D問題   : data/questions.json の dd_questions[]
  - シミュレーション問題:
        data/questions.json には存在しないため、
        data/check-test-*.json と data/midterm-test.json に埋め込まれた
        simulation_questions[] を id 単位で重複排除して集約する
        (sim-01〜sim-10 が複数ファイルに同一内容で重複埋め込みされていることを確認済み)。
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from normalize import normalize_prose, normalize_command, sha256_file, content_hash

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(ROOT, "data")
IMAGES_DIR = os.path.join(ROOT, "images")
AUDIT_DIR = os.path.join(ROOT, "audit", "my-site")

os.makedirs(AUDIT_DIR, exist_ok=True)


def image_hash_for(local_image_path):
    if not local_image_path:
        return None
    abs_path = os.path.join(ROOT, local_image_path)
    if not os.path.isfile(abs_path):
        return None
    return sha256_file(abs_path)


# ---------------------------------------------------------------------------
# 4択問題 (choice)
# ---------------------------------------------------------------------------

def build_choice():
    with open(os.path.join(DATA_DIR, "questions.json"), encoding="utf-8") as f:
        d = json.load(f)
    sel = d["selection_questions"]

    raw = []
    normalized = []
    for q in sel:
        raw.append({
            "site": "my-site",
            "sourceFile": "data/questions.json#selection_questions",
            **q,
        })

        image_paths = [q["localImagePath"]] if q.get("hasImage") and q.get("localImagePath") else []
        image_hashes = [h for h in (image_hash_for(p) for p in image_paths) if h]
        missing_images = [p for p in image_paths if image_hash_for(p) is None]

        options = [normalize_prose(c) for c in q.get("choices", [])]
        correct = [normalize_prose(c) for c in q.get("correctAnswers", [])]

        normalized.append({
            "site": "my-site",
            "id": q["id"],
            "displayId": q.get("displayId"),
            "type": "multiple" if (q.get("correctCount") or 1) > 1 else "single",
            "part": q.get("part"),
            "category": q.get("category", "選択問題"),
            "question": normalize_prose(q.get("question", "")),
            "options": options,
            "correctAnswerTexts": correct,
            "explanation": normalize_prose(q.get("explanation", "")),
            "imagePaths": image_paths,
            "imageHashes": image_hashes,
            "missingImageFiles": missing_images,
            "contentHash": content_hash(q.get("question", ""), q.get("choices", []), q.get("correctAnswers", []), image_hashes),
        })

    write_json(os.path.join(AUDIT_DIR, "choice.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "choice.normalized.json"), normalized)
    return len(raw), sum(1 for n in normalized if n["missingImageFiles"])


# ---------------------------------------------------------------------------
# D&D問題
# ---------------------------------------------------------------------------

def parse_dnd_answer(dd):
    """js/dnd.js の normalizeDndQuestion() 相当のロジックを再実装し、
    target -> [correct items] の対応表を作る。"""
    placeholders = [p for p in dd.get("placeholders", []) if p != ""]
    answer_raw = dd.get("answer", "")
    dtype = dd.get("type")
    mapping = {}

    if dtype == "Grouping":
        parts = [p for p in answer_raw.split("|") if p]
        for part in parts:
            if ":" not in part:
                continue
            name, items_str = part.split(":", 1)
            items = [i for i in items_str.split(",") if i != ""]
            mapping[name] = items
    else:
        # Matching: pipe区切りでplaceholdersとindex対応
        answers = answer_raw.split("|")
        for i, ph in enumerate(placeholders):
            if i < len(answers):
                mapping[ph] = [answers[i]] if answers[i] != "" else []

    return placeholders, mapping


def build_dnd():
    with open(os.path.join(DATA_DIR, "questions.json"), encoding="utf-8") as f:
        d = json.load(f)
    dds = d["dd_questions"]

    raw = []
    normalized = []
    for dd in dds:
        raw.append({
            "site": "my-site",
            "sourceFile": "data/questions.json#dd_questions",
            **dd,
        })

        placeholders, mapping = parse_dnd_answer(dd)
        choices = [c for c in dd.get("choices", []) if c != ""]  # dd-17 known to have empty entries

        image_paths = [dd["imagePath"]] if dd.get("imagePath") else []
        image_hashes = [h for h in (image_hash_for(p) for p in image_paths) if h]
        missing_images = [p for p in image_paths if image_hash_for(p) is None]

        mapping_texts = sorted(
            f"{normalize_prose(target)}: {', '.join(sorted(normalize_prose(i) for i in items))}"
            for target, items in mapping.items()
        )

        normalized.append({
            "site": "my-site",
            "id": dd["id"],
            "type": dd.get("type"),
            "part": None,
            "category": dd.get("category", "D&D"),
            "question": normalize_prose(dd.get("problemTitle") or dd.get("title", "")),
            "instructions": normalize_prose(dd.get("problemTitle", "")),
            "options": [normalize_prose(c) for c in choices],
            "targets": [normalize_prose(p) for p in placeholders],
            "correctAnswerTexts": mapping_texts,
            "allowMultiItemsPerTarget": dd.get("type") == "Grouping",
            "groupLimits": dd.get("grouplimits", ""),
            "imagePaths": image_paths,
            "imageHashes": image_hashes,
            "missingImageFiles": missing_images,
            "contentHash": content_hash(
                dd.get("problemTitle") or dd.get("title", ""),
                choices + placeholders,
                mapping_texts,
                image_hashes,
            ),
        })

    write_json(os.path.join(AUDIT_DIR, "dnd.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "dnd.normalized.json"), normalized)
    return len(raw), sum(1 for n in normalized if n["missingImageFiles"])


# ---------------------------------------------------------------------------
# シミュレーション問題（check-test-*.json / midterm-test.json から重複排除）
# ---------------------------------------------------------------------------

def build_simulation():
    files = sorted(glob.glob(os.path.join(DATA_DIR, "check-test-*.json"))) + \
        [os.path.join(DATA_DIR, "midterm-test.json")]

    by_id = {}
    for fp in files:
        if not os.path.isfile(fp):
            continue
        with open(fp, encoding="utf-8") as f:
            d = json.load(f)
        sims = d.get("simulation_questions") or []
        rel = os.path.relpath(fp, ROOT)
        for s in sims:
            sid = s["id"]
            entry = by_id.setdefault(sid, {"data": s, "sourceFiles": []})
            entry["sourceFiles"].append(rel)
            # 内容差異があれば記録（本来は全ファイルで同一のはず）
            if entry["data"] != s:
                entry.setdefault("variants", []).append({"file": rel, "data": s})

    raw = []
    normalized = []
    for sid in sorted(by_id.keys()):
        entry = by_id[sid]
        s = entry["data"]
        raw.append({
            "site": "my-site",
            "sourceFiles": entry["sourceFiles"],
            "hasVariants": "variants" in entry,
            **s,
        })

        devices = s.get("devices", [])
        options = []
        for dev in devices:
            for cmd in dev.get("requiredCommands", []):
                options.append(f"{dev.get('name','')}: {normalize_command(cmd)}")

        normalized_devices = [{
            "name": dev.get("name"),
            "description": normalize_prose(dev.get("description", "")),
            "requiredCommands": [normalize_command(c) for c in dev.get("requiredCommands", [])],
        } for dev in devices]

        normalized.append({
            "site": "my-site",
            "id": sid,
            "type": "simulation",
            "part": None,
            "category": "シミュレーション",
            "question": normalize_prose((s.get("title", "") or "") + "\n" + (s.get("description", "") or "")),
            "title": normalize_prose(s.get("title", "")),
            "scenario": normalize_prose(s.get("description", "")),
            "devices": normalized_devices,
            "options": options,
            "correctAnswerTexts": options,  # 必須コマンド自体が採点基準
            "imagePaths": [],
            "imageHashes": [],
            "gradingStatus": "available",
            "occurrencesInCheckTests": entry["sourceFiles"],
            "contentHash": content_hash(
                (s.get("title", "") or "") + (s.get("description", "") or ""),
                options,
                options,
                [],
            ),
        })

    write_json(os.path.join(AUDIT_DIR, "simulation.raw.json"), raw)
    write_json(os.path.join(AUDIT_DIR, "simulation.normalized.json"), normalized)
    return len(raw), sum(1 for e in by_id.values() if "variants" in e)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    n_choice, missing_choice_img = build_choice()
    n_dnd, missing_dnd_img = build_dnd()
    n_sim, sim_variants = build_simulation()

    print(f"choice: {n_choice} 件 (画像欠落 {missing_choice_img} 件)")
    print(f"dnd: {n_dnd} 件 (画像欠落 {missing_dnd_img} 件)")
    print(f"simulation: {n_sim} 件 (ユニークID, check-test間の内容差異 {sim_variants} 件)")


if __name__ == "__main__":
    main()
