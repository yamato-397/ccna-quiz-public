# CCNA問題 突合レポート

- 実施日: 2026-07-29
- マイサイト: https://yamato-397.github.io/ccna-quiz-public/ （リポジトリ: ccna-quiz-public）
- 参考サイト: https://baudroie.github.io/ccnatiger_practice/
- 取得方式: ユーザー承認済みの方式（内部ログインUIは経由せず、サイト自身のフロントエンドが呼んでいる読み取り専用GAS関数をgoogle.script.run経由で直接呼び出し）。書き込み系関数（saveLog/logUserAction/debugListFiles）は一切呼び出していない。

## 全体件数

| 形式 | マイサイト | 参考サイト |
|---|---|---|
| 4択問題 | 516 (単一451/複数65) | 721 (うちpart_⑦=205は①〜⑤の「集約版」) |
| D&D問題 | 27 (Grouping15/Matching12) | 28 (Grouping15/Matching13) |
| シミュレーション | 10 (コマンド一致方式・トポロジー画像なし) | 9 (状態バリデーション方式・トポロジー画像あり、07/27時点「仮導入」) |

## 突合結果（全体）

| 分類 | 件数 |
|---|---|
| EXACT_MATCH | 668 |
| EQUIVALENT | 58 |
| SIMILAR | 7 |
| ANSWER_CONFLICT | 6 |
| AMBIGUOUS | 0 |
| REFERENCE_ONLY（追加候補） | 19 |
| MY_SITE_ONLY | 11 |

## 形式別内訳

### 4択問題
EXACT_MATCH 647 / EQUIVALENT 52 / SIMILAR 0 / ANSWER_CONFLICT 6 / REFERENCE_ONLY 16 / MY_SITE_ONLY 8

- part_①〜⑥は参考サイトと**完全に1:1対応**（新規に増えた問題はゼロ）。
- part_⑦（205問）は参考サイトのお知らせ（06/13「①〜⑤の集約版⑦を作成しました」）の通り、大半（183問）が①〜⑤の既存問題と内容ハッシュ完全一致（重複）。
- part_⑦のうち**16問だけが真に新規**（REFERENCE_ONLY、下記参照）。
- ANSWER_CONFLICT 6件：同一問題文で正解が異なる（同一ID内2件 part_⑤-10 / part_⑥-63、part_⑦経由の重複コピーで正解が違う4件）。**内容は既存のため自動追加対象外**、参考情報として記録のみ。
- MY_SITE_ONLY 8件（part_④-76, part_⑤-58/59/63/76/82/95/99）：参考サイト側に対応が見つからず。削除・変更は一切行っていません。

### D&D問題
EXACT_MATCH 21 / EQUIVALENT 6 / REFERENCE_ONLY 1 / MY_SITE_ONLY 0

- 既存27問はすべて参考サイト側に対応あり。
- **dd-28が新規**（Matching、「設定コマンドを設定内の位置に対応する文字にドラッグ＆ドロップ」、スタティックルートのコマンドとインターフェース対応）。

### シミュレーション問題
SIMILAR 7 / REFERENCE_ONLY 2 / MY_SITE_ONLY 3

参考サイトのシミュレーションは、マイサイト（コマンド行の順不同一致判定）とは**根本的に異なる採点方式**（トポロジー画像＋デバイス状態パス単位のバリデーション、例: `runningConfig.interfaces.e0/0.ip == 10.0.12.5`）。テーマが重なる7件は内容的に近い可能性がありますが、**フォーマットが全く異なるため自動的に「同一」とは判定していません**（SIMILARとして手動確認対象）。

| マイサイト | 参考サイト | 類似度 | 備考 |
|---|---|---|---|
| sim-01 IPv4/IPv6アドレス設定 | ref-sim-prob1 IPv4/IPv6アドレス設定 | 0.71 | 設定値(IPアドレス等)も一致。表現形式が違うだけの可能性 |
| sim-02 トランク・LACP・VLAN設定 | ref-sim-prob2 トランクとLACP設定 | 0.54 | |
| sim-03 OSPF設定(R2/R1) | ref-sim-prob3 OSPF設定 | 0.55 | |
| sim-05 VLAN35/39・アクセスポート・LLDP | ref-sim-prob4 VLANとLLDP構成 | 0.55 | |
| sim-10 トランク・native VLAN35・LACP | ref-sim-prob5 トランク・ネイティブVLAN・LACP | 0.47 | |
| sim-09 OSPF(インターフェース,R1) | ref-sim-prob6 OSPF設定(インターフェース) | 0.54 | |
| sim-08 VoiceVLAN・LLDP/CDP | ref-sim-prob7 VLANとLLDP/CDP設定 | 0.65 | |

新規候補（REFERENCE_ONLY、テーマ自体がマイサイトに存在しない）:
- **ref-sim-prob8「Staticルート①」**
- **ref-sim-prob9「Staticルート②」**

マイサイトのみ（MY_SITE_ONLY、参考サイトに対応なし）: sim-04, sim-06, sim-07

**採点方式の注意**: 参考サイトの「実機問題」セクションは2026-07-27時点で「新シミュ問題実装予定です。※本日時点で仮導入。合格にならないエラーが発生しますが気にせずに触ってみてください」とアナウンスされており、**採点エンジン自体が試験導入・不安定な状態**です。`validations`データ自体は取得できていますが、内容の信頼性について参考サイト側も保証していません。

## 追加候補（REFERENCE_ONLYのみ、合計19件）

- 4択問題: 16件（すべてpart_⑦経由の真に新規な問題）
- D&D問題: 1件（dd-28）
- シミュレーション: 2件（ref-sim-prob8, prob9）

## Part別追加候補

| Part | 件数 | 確信度 |
|---|---|---|
| part_⑦（新規16件） | 16 | **medium**（要確認：後述） |
| 分類保留（D&D 1件 + シミュレーション2件、Part概念なし） | 3 | n/a |

**要確認事項**: part_⑦は参考サイト自身が「①〜⑤の集約版」と説明している便宜的な集約シートであり、⑥のような独立した新カテゴリではない可能性があります。この16件の新規問題を
1. マイサイトに新設する「Part⑦」に入れるか、
2. 内容に応じて既存Part①〜⑥のいずれかに割り振るか
はユーザーの判断が必要なため、確信度を medium とし自動配置対象から外しています。

## 画像

- マイサイト: 4択159件、D&D 3件に画像あり。参考サイト: 4択172件、D&D 7件に画像あり、シミュレーション9件全てにトポロジー画像あり。
- 画像取得: 4択172/172成功、D&D 7/7成功、シミュレーション9/9成功。失敗0件。
- EXACT_MATCH/EQUIVALENTと判定された問題のうち画像ハッシュが不一致だったものはレポート参照（`reports/image-comparison.json`）。

## 確認が必要な項目

- 4択の正解競合6件（`reports/answer-conflicts.json`）
- シミュレーション7件の類似候補（同一シナリオの可能性はあるが、採点方式が根本的に異なるため統合しない）
- part_⑦由来16件のPart割り当て（medium confidence、要ユーザー判断）
- シミュレーション採点エンジンが参考サイト側で「仮導入」とアナウンスされている点（データの信頼性に注意）
- マイサイトのみに存在する11件（4択8件・シミュレーション3件）は今回の作業では一切変更していません

## 生成ファイル

`reports/` 配下: comparison-summary.md（本ファイル）, comparison-detail.json/csv, addition-candidates.json, exact-matches.json, equivalent-matches.json, similar-candidates.json, answer-conflicts.json, ambiguous-candidates.json, my-site-only.json, part-mapping.json, image-comparison.json, scraping-errors.json
