"""
シミュレーション問題(スタンドアロン学習モード: data/simulation-questions.json)を
参考サイトの内容で更新する。

ユーザー指示: 「シミュレーション問題も参考サイトを正としてください」
方針:
  - 参考サイトの状態バリデーション方式(validations)＋トポロジー画像を持つ
    166KBの独自CLIシミュレーターエンジン(getEngineHtml)をまるっと移植することは
    検証されていない大規模な採点ロジックを試験対策サイトに組み込むリスクが大きいため
    見送り、既存の実績あるコマンド一致方式(js/simulationTest.js)は維持する。
  - その上で「内容」（問題文・シナリオ・タスク・必須コマンド・トポロジー画像）は
    参考サイトの最新版を全面的に反映する。
  - 対応関係が見つかった7問(sim-01,02,03,05,08,09,10)は内容を参考サイトの
    prob1,2,3,4,7,6,5でそれぞれ置き換える。対応が見つからなかった3問
    (sim-04,06,07)は変更しない。
  - 既存の確認テスト(check-test-*.json)に埋め込まれたシミュレーション問題の
    コピーはユーザーの明示的承認がないため一切変更しない。
"""
import json
import os
import re
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIT_REF = os.path.join(ROOT, "audit", "reference-site")
ASSET_SIM_DIR = os.path.join(ROOT, "audit", "assets", "simulation-images")
IMAGES_DIR = os.path.join(ROOT, "images")

# sim-XX (マイサイト既存ID) -> probN (参考サイトID) の対応
MAPPING = {
    "sim-01": "prob1",
    "sim-02": "prob2",
    "sim-03": "prob3",
    "sim-05": "prob4",
    "sim-08": "prob7",
    "sim-09": "prob6",
    "sim-10": "prob5",
}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def _is_ascii_alnum(ch):
    # Python の str.isalnum() は漢字・かな等も True を返すため、
    # デバイス名(半角英数字)の境界判定には使えない。ASCII の英数字のみを対象にする。
    return ch.isascii() and ch.isalnum()


def match_devices_in_text(text, dev_names):
    matched = []
    for name in dev_names:
        # 単語境界的に一致させる（"SW1"が"SW10"の一部に誤マッチしないよう簡易チェック）。
        # 前後が日本語文字の場合は常に境界とみなす（ASCII英数字が続く場合のみ拒否）。
        pattern = re.escape(name)
        for m in re.finditer(pattern, text):
            start, end = m.start(), m.end()
            before_ok = start == 0 or not _is_ascii_alnum(text[start - 1])
            after_ok = end == len(text) or not _is_ascii_alnum(text[end])
            if before_ok and after_ok:
                matched.append(name)
                break
    return matched


def split_inline_device_labels(cmd_lines, dev_names):
    """commands文字列内に "SW-1:" のような行内デバイスラベルがある場合、
    そのラベルより前の行を共通コマンド、以降を各デバイス専用コマンドとして分割する。
    ラベルが無ければ (None, cmd_lines) を返す（全行がそのまま1ブロック）。"""
    label_re = {name: re.compile(r"^\s*" + re.escape(name) + r"\s*:\s*$") for name in dev_names}
    label_positions = []
    for i, line in enumerate(cmd_lines):
        for name, pat in label_re.items():
            if pat.match(line):
                label_positions.append((i, name))
                break
    if not label_positions:
        return None
    common = cmd_lines[:label_positions[0][0]]
    per_device = {}
    for idx, (pos, name) in enumerate(label_positions):
        end = label_positions[idx + 1][0] if idx + 1 < len(label_positions) else len(cmd_lines)
        per_device.setdefault(name, []).extend(cmd_lines[pos + 1:end])
    return common, per_device


def build_devices_from_tasks(ref):
    dev_names = [d["name"] for d in ref["devices"]]
    dev_cmd_map = {name: [] for name in dev_names}
    unresolved = []

    for task in ref.get("tasks", []):
        text = task.get("text", "")
        raw_lines = [c.strip() for c in (task.get("commands") or "").split("\n") if c.strip()]
        if not raw_lines:
            continue

        split = split_inline_device_labels(raw_lines, dev_names)
        if split is not None:
            common, per_device = split
            for name in dev_names:
                dev_cmd_map[name].extend(common)
                dev_cmd_map[name].extend(per_device.get(name, []))
            continue

        matched = match_devices_in_text(text, dev_names)
        # "R1と同様にR2においても" のような「Aと同様にBも」参照パターンは、
        # 実際の設定対象はB(文中で最後に登場するデバイス)のみであるため、
        # 複数デバイスが一致した場合はその補正を行う。
        if len(matched) > 1 and re.search(r"と同様に|も同様に|においても", text):
            last_pos, last_name = -1, None
            for name in matched:
                pos = text.rfind(name)
                if pos > last_pos:
                    last_pos, last_name = pos, name
            matched = [last_name] if last_name else matched

        if not matched:
            # デバイス名がテキストから特定できない場合は全デバイス共通タスクとみなす
            matched = dev_names
            unresolved.append(task)
        for name in matched:
            dev_cmd_map[name].extend(raw_lines)

    devices = [{"name": n, "description": "", "requiredCommands": dev_cmd_map[n]} for n in dev_names]
    return devices, unresolved


def main():
    sim_raw = {r["id"]: r for r in load(os.path.join(AUDIT_REF, "simulation.raw.json"))}
    master_path = os.path.join(ROOT, "data", "simulation-questions.json")
    master = load(master_path)

    by_id = {q["id"]: q for q in master["questions"]}
    updated = []

    for my_id, ref_id in MAPPING.items():
        ref = sim_raw[ref_id]
        devices, unresolved = build_devices_from_tasks(ref)
        if unresolved:
            print(f"[WARN] {my_id} <- {ref_id}: デバイス名で振り分けられなかったタスクが{len(unresolved)}件"
                  f"（全デバイス共通として割当）")

        # トポロジー画像を本番images/へコピー
        src_img = None
        for ext in ("png", "jpg", "jpeg"):
            cand = os.path.join(ASSET_SIM_DIR, f"{ref_id}.{ext}")
            if os.path.isfile(cand):
                src_img = cand
                break
        image_path = None
        if src_img:
            ext = os.path.splitext(src_img)[1]
            dest_name = f"sim-topology-{my_id.split('-')[1]}{ext}"
            dest = os.path.join(IMAGES_DIR, dest_name)
            shutil.copyfile(src_img, dest)
            image_path = f"images/{dest_name}"

        old = by_id[my_id]
        new_entry = {
            "id": my_id,
            "title": ref["title"],
            "description": strip_html(ref.get("description", "")),
            "devices": devices,
        }
        if image_path:
            new_entry["imagePath"] = image_path
        by_id[my_id] = new_entry
        updated.append((my_id, ref_id, old["title"], new_entry["title"]))

    master["questions"] = [by_id[q["id"]] for q in master["questions"]]
    master["metadata"]["note"] = (
        master["metadata"].get("note", "") +
        " 2026-07-30: sim-01,02,03,05,08,09,10 を参考サイト最新版の内容(prob1,2,3,4,7,6,5)で更新"
        "（採点方式は既存のコマンド一致方式を維持、トポロジー画像を追加）。"
        "確認テストに埋め込まれた同ID問題のコピーは変更していない。"
    )
    write_json(master_path, master)

    print("\n更新結果:")
    for my_id, ref_id, old_title, new_title in updated:
        print(f"  {my_id} <- {ref_id}: 「{old_title}」 -> 「{new_title}」")


if __name__ == "__main__":
    main()
