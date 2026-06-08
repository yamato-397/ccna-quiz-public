# CCNA Quiz Data Update Report
**Date:** 2026-06-08
**Source:** https://baudroie.github.io/ccnatiger_practice/
**Updated by:** Automated extraction via GAS callback API

---

## Summary

| Item | Before | After | Diff |
|------|--------|-------|------|
| Total selection questions | 397 | 516 | +119 |
| Questions with images | 108 | 159 | +51 |
| Parts | 5 (part①〜⑤) | 6 (part①〜⑥) | +1 |

---

## Part Distribution

| Part | Count (Before) | Count (After) |
|------|----------------|---------------|
| part_① | 70 | 70 |
| part_② | 70 | 70 |
| part_③ | 64 | 64 |
| part_④ | 91 | 91 |
| part_⑤ | 102 | 102 |
| part_⑥ | 0 (new) | 119 |
| **Total** | **397** | **516** |

---

## Change Classification

### Added (119 questions)
- All 119 questions are new (part_⑥)
- IDs: `part_⑥-1` through `part_⑥-119`
- 51 questions have images
- 16 questions require multiple correct answers

### Unchanged (397 questions)
- All questions from part_①〜⑤ remain identical (content, answers, explanations)
- No modifications detected

### Modified: 0
### Removed: 0 (nothing deleted)
### Duplicates: 0

---

## New Part_⑥ Details

### Statistics
- Total: 119 questions (IDs: part_⑥-1 to part_⑥-119)
- Questions with images: 51
- Multi-answer questions: 16

### Multi-answer Questions
- **part_⑥-12**: SW1インターフェースg0/1がダウン/ダウン状態です。このインターフェース状態の原因を2つ挙げてください。(2つ選択してください。)...\n  Answers: 速度の不一致があります, インターフェースはエラー無効です...\n- **part_⑥-29**: 仮想化の 2 つの基本は何ですか? (2 つ選択してください。)...\n  Answers: 1 台の物理サーバー上で複数のオペレーティングシステムとアプリケーションを独立して実行できます。, 論理ネットワークデバイスが仮想マシンと物理ネットワークの残りの部分の間でトラフィックを移動できるようにします。...\n- **part_⑥-35**: IPv6 アドレスのステートレス割り当てをサポートするテクノロジはどれですか (2 つ選択してください)。...\n  Answers: DHCPv6, 自動構成...\n- **part_⑥-52**: ルーターを DHCP サーバーとして実装する場合、どの 2 つの機能を構成する必要がありますか? (2つ選んでください)...\n  Answers: アドレス プール, 手動綴じ...\n- **part_⑥-76**: 図を参照してください。エンジニアは、2.4GHzと5GHzで動作する無線ネットワーク向けに 、WPA2を使用して安全な事前共有キーベースのSSIDを作成していま...\n  Answers: WPA2 WPA3暗号化にAES (CCMP128)オプションを選択します。, 認証キー管理のPSKオプションを選択します...\n- **part_⑥-85**: 図を参照してください。ルータR1が安全なリモートアクセス接続を受け入れるようにする には、どの2つのコマンドを設定する必要がありますか？(2つ選択してください)...\n  Answers: crypto key generate RSA, username cisco password 0 Cisco...\n- **part_⑥-88**: 図を参照してください。エンジニアは、インターフェイスSe0/0/0をプライマリパスとして使用して、ニューヨークのルータがアトランタのルータのLo1インターフェイ...\n  Answers: ipv6 route 2000::1/128 2012::1, ipv6 route 2000::1/1282023::3 5...\n- **part_⑥-90**: 図を参照してください。アトランタルータの loopback1 インターフェースは、ワシントンルータの lookback3 インターフェースに到達する必要がありま...\n  Answers: ipv6 route 2000::1/128 2012::1, ipv6 route 2000::3/128 2023::3...\n- **part_⑥-98**: 図を参照してください。エンジニアは、スイッチSW1の管理アクセス設定を更新し、安全で暗号化されたリモート設定を可能にします。エンジニアはスイッチに適用する必要が...\n  Answers: SW1(config)#username admin secret R3mote123, SW1(config)#line vty 0 15
SW1(config-line)#transport input ssh...\n- **part_⑥-99**: 図を参照してください。ニューヨークのルータには、アトランタとワシントンのサイトを指す静的ルートが設定されています。
アトランタ ルータとワシントン ルータの S...\n  Answers: アトランタルータでipv6 route 2023::/126 2012::2コマンドを設定します。, ワシントンのルータでipv6 route 2012::/126 2023::2コマンドを設定します。...\n- **part_⑥-100**: 展示を参照してください。LDAPのドメイン資格情報を使用して最高レベルの暗号化と認証 を提供するために、エンジニアが実行する必要がある2つの手順は何ですか？...\n  Answers: レイヤー2セキュリティでWPA+WPA2を選択, 認証キー管理から802.1Xを選択します。...\n- **part_⑥-101**: 図を参照してください。ネットワークエンジニアがWPA2PSKを使用し、特定のクライアントのみの参加を許可するようにWLANを設定しようとしています。このプロセス...\n  Answers: WPA2 ポリシー オプションを有効にします。, MAC フィルタリング オプションを有効にします。...\n- **part_⑥-104**: 図を参照してください。ニューヨークのルータは、2000::1へのトラフィックが主にアトラ ンタサイト経由で送信され、セカンダリパスとして管理距離2のワシントンサ...\n  Answers: ipv6 route 2000::1/128 2012::1, ipv6 route 2000::1/128 2023::3 2...\n- **part_⑥-105**: 図を参照してください。アトランタルータの loopback1インターフェイスは、ワシントンルータの loopback3インターフェイスに到達する必要があります。...\n  Answers: ipv6 route 2000::1/128 2012::1, ipv6 route 2000::3/128 2023::3...\n- **part_⑥-108**: プライベート IPv4 アドレスの 2 つの利点は何ですか? (2 つ選択してください。)...\n  Answers: 複数のサイトでアドレスを再利用します, グローバルに一意のアドレス空間を節約する...\n- **part_⑥-116**: 企業内のファイアウォールの 2 つの機能は何ですか? (2 つ選択してください。)...\n  Answers: URL に基づいてトラフィック フィルタリングを有効にします, スタンドアロン モードでサイト間 VPN のエンドポイントとして機能します...\n
### Questions with Images
- part_⑥-57: `no3.png`\n- part_⑥-58: `no14.png`\n- part_⑥-59: `no15.png`\n- part_⑥-60: `no21.png`\n- part_⑥-61: `no31.png`\n- part_⑥-62: `no33.png`\n- part_⑥-63: `no38.png`\n- part_⑥-64: `no49.png`\n- part_⑥-65: `no58.png`\n- part_⑥-66: `no62.png`\n- ... and 41 more\n
---

## Source Site Announcements (as of 2026-06-08)

| Date | Content |
|------|---------|
| 05/29 | 直近受験者の振り返りよりpart⑥を作成しました。 |\n| 05/12 | partA,B,Cは15日に削除となります。 頻出問題についてはpart⑤に統合する形になります。 |\n| 04/02 | 現在問題更新にともない一時的に問題数増加しております。 詳細は人事担当までお願いします。 |\n| 03/12 | 直近の出題傾向から314問に変更となりました。 |\n
---

## Technical Details

- GAS Deployment ID: `AKfycbzIhnMUOAR5i-bYCyAhNVHT2rEOb2xXFHCReQfNx1hUFBuzfrpQ7IaWmKeH7SF2Lvo8`
- Extraction method: Playwright headless Chrome + GAS callback API
- Authentication: Client-side only (ccnatiger/ccnatiger); GAS data accessible without server-side login
- GAS functions called: `getDashboardData`, `getQuestions`

---

## Applied Changes

1. Added 119 new questions (part_⑥) to `questions.json`
2. Updated metadata:
   - `counts.selection`: 397 → 516
   - `counts.total`: 424 → 543
   - `counts.selectionWithImages`: 108 → 159
   - `extractedAt`: updated to 2026-06-08
3. No existing questions were modified or removed

---

## Notes

- The source site was updated on 05/29 to add part_⑥
- partA, partB, partC were merged into part_⑤ and have been deleted from the site
- Image files for new questions (no3.png through no1716.png) need to be downloaded separately
