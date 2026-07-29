"""
比較用の共通正規化ユーティリティ。

やってよい正規化: 前後空白除去 / 改行コード統一(\\n) / HTMLエンティティ復元 /
  通常文章内の連続空白の整理 / 比較用ハッシュ生成。
やってはいけない正規化: CLIコマンド内の空白変更 / 全角半角の一律変換 /
  IPアドレスやサブネット表記の変更 / 選択肢の削除 / 言い換え。

このモジュールはテキストを book-keeping 目的でのみ変換し、
CLIコマンド文字列（simulationのrequiredCommands等）には空白整理を適用しない。
"""
import hashlib
import html
import re
import unicodedata

_WS_RUN = re.compile(r"[ \t　]+")


def normalize_newlines(s: str) -> str:
    if s is None:
        return ""
    return s.replace("\r\n", "\n").replace("\r", "\n")


def normalize_prose(s: str) -> str:
    """通常文章（問題文・選択肢など）向けの正規化。CLIコマンドには使わない。"""
    if s is None:
        return ""
    s = normalize_newlines(s)
    s = html.unescape(s)
    s = s.strip()
    # 各行内の連続する半角/全角スペース・タブを1つに整理（改行は保持）
    lines = [_WS_RUN.sub(" ", line).strip() for line in s.split("\n")]
    return "\n".join(lines)


def normalize_command(s: str) -> str:
    """CLIコマンド用: 前後空白除去と改行統一のみ。内部の空白・省略形は変更しない。"""
    if s is None:
        return ""
    return normalize_newlines(s).strip()


def sha256_text(s: str) -> str:
    return hashlib.sha256((s or "").encode("utf-8")).hexdigest()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def content_hash(question: str, options: list, correct_texts: list, image_hashes: list) -> str:
    payload = "␟".join([
        normalize_prose(question),
        "␞".join(sorted(normalize_prose(o) for o in (options or []))),
        "␞".join(sorted(normalize_prose(c) for c in (correct_texts or []))),
        "␞".join(sorted(image_hashes or [])),
    ])
    return sha256_text(payload)
