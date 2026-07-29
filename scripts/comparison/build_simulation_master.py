"""
data/simulation-questions.json を作成する。

- 既存10問(sim-01〜10)は data/check-test-11.json / check-test-12.json に
  埋め込まれた simulation_questions からそのまま抽出（内容変更なし）。
  既存の確認テストファイル自体は一切変更しない。
- 新規2問(ref-simulation-0001/0002)は、承認済みのref-sim-prob8/9を
  マイサイトのシミュレーションスキーマへ変換する。
  requiredCommandsは参考サイトのtasks[].commandsをそのまま転記したものであり、
  参考サイト本来の状態バリデーション方式(validations)そのものではない点に注意。
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIT_REF = os.path.join(ROOT, "audit", "reference-site")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    d11 = load(os.path.join(ROOT, "data", "check-test-11.json"))
    d12 = load(os.path.join(ROOT, "data", "check-test-12.json"))
    sims = {}
    for s in d11.get("simulation_questions", []):
        sims[s["id"]] = s
    for s in d12.get("simulation_questions", []):
        sims[s["id"]] = s

    existing = [sims[k] for k in sorted(sims.keys())]

    sim_raw = {r["id"]: r for r in load(os.path.join(AUDIT_REF, "simulation.raw.json"))}
    provenance = load(os.path.join(ROOT, "data", "source-provenance.json"))
    provenance.setdefault("simulation", {})

    new_entries = []
    for new_id, src_id in [("ref-simulation-0001", "prob8"), ("ref-simulation-0002", "prob9")]:
        r = sim_raw[src_id]
        dev_names = [d["name"] for d in r["devices"]]
        tasks = r.get("tasks", [])
        # prob8/prob9はいずれも devices と tasks が同数・同順（タスク1件=デバイス1台）であることを
        # 目視確認済み（guideフィールドがタスク1,2,3の順で各デバイスに1:1対応）。
        assert len(dev_names) == len(tasks), f"{src_id}: devices({len(dev_names)}) と tasks({len(tasks)}) の数が不一致"
        devices = []
        for name, task in zip(dev_names, tasks):
            cmds = [c.strip() for c in (task.get("commands") or "").split("\n") if c.strip()]
            devices.append({"name": name, "description": "", "requiredCommands": cmds})

        entry = {
            "id": new_id,
            "title": r["title"],
            "description": r["description"].replace("<div class=\"task-section\">", "").replace("</div>", "")
                .replace("<p><strong>ガイドライン</strong></p>", "").replace("<p>", "").replace("</p>", "").strip(),
            "devices": devices,
        }
        new_entries.append(entry)

        provenance["simulation"][new_id] = {
            "sourceSite": "reference-site",
            "sourceQuestionId": f"ref-sim-{src_id}",
            "sourceUrl": r["sourceUrl"],
            "scrapedAt": r["scrapedAt"],
            "note": (
                "requiredCommandsは参考サイトのtasks[].commands(模範コマンド例)を転記したもの。"
                "参考サイト本来の採点はデバイス状態のパスベースvalidationsであり、方式が異なる。"
                "参考サイトの実機問題機能は2026-07-27時点で仮導入とアナウンスされている。"
            ),
        }

    all_questions = existing + new_entries

    out = {
        "metadata": {
            "total": len(all_questions),
            "existingCount": len(existing),
            "addedCount": len(new_entries),
            "note": "既存sim-01〜10はcheck-test-11/12.jsonの埋め込みデータと同一内容。ref-simulation-0001/0002は突合フェーズで追加。",
        },
        "questions": all_questions,
    }
    write_json(os.path.join(ROOT, "data", "simulation-questions.json"), out)
    write_json(os.path.join(ROOT, "data", "source-provenance.json"), provenance)

    print(f"既存{len(existing)}問 + 新規{len(new_entries)}問 = 合計{len(all_questions)}問")
    for e in new_entries:
        print(" -", e["id"], e["title"])
        for d in e["devices"]:
            print("    ", d["name"], "requiredCommands:", d["requiredCommands"])


if __name__ == "__main__":
    main()
