# NEON GAMES デザイン仕様（Neon Arcade）

TOPページ、共通ゲームページ、404ページのデザイン仕様です。機能要件は [spec.md](./spec.md) を正とし、この資料は見た目・挙動・文言を定義します。

> サービス名は **NEON GAMES**（ロゴ表記 `NEON_GAMES`）です。リポジトリ名は `neon_games` です。spec.md の `ai_games` という表記は旧名です。画面に出す名前はこの資料に従ってください。

## 0. 参照モック

- **見た目の正解: [temp/design.html](../temp/design.html)**（ブラウザで直接開けます）
  - 骨格CSS: [temp/common.css](../temp/common.css)、色と装飾: design.html 内の `<style>`、挙動: [temp/common.js](../temp/common.js)
  - 迷ったらモックの CSS の値を優先してください。この資料の数値はモックから抜き出したものです。
  - 左下の操作バーで TOP、ゲームページ、404 を切り替えられます。
- モック固有で**実装しないもの**
  - 左下の操作バー（`.mock-bar`）
  - hash ルーティング（`#/game/{id}`）。本実装は Next.js の `/` と `/game/[id]` です
  - サムネイルの絵文字と色相グラデーション。本実装は `game.image`（16:9の画像）です
  - GameFrame の中の「PRESS START」画面と注記。これは各ゲーム側の責務で、GameFrame は枠だけです
  - モックのゲームとカテゴリのデータ（12件・6カテゴリ）。表示確認用のサンプルです
- 各ゲームのモックは `temp/<ゲーム>/` にあります。ゲームごとのデザイン仕様は `docs/games/<ゲーム名>_design.md` です（例：[小僧ラン](./games/小僧ラン_design.md)）
- `temp/` は実装が終わったら削除する予定の作業ディレクトリです。実装中は残してください。

### spec.md との対応

| spec.md | この資料での扱い |
|---|---|
| GameItem・GameFrame の「横長で9/16の比率」 | 横16：縦9（`aspect-ratio: 16 / 9`）と解釈しています |
| GameItem「PCで5つ、スマホで2つ」 | そのとおりにし、中間のタブレット幅を3列にしました（§1 ブレークポイント） |
| 共通コンポーネント6種 | §5 のとおりです。デザイン上の追加として SearchBox、CategoryChips、NotFound があります（§5 冒頭の表） |

---

## 1. デザイントークン

SCSS 変数（または CSS カスタムプロパティ）として、`styles/_tokens.scss` などに定義する想定です。

### カラー

| トークン | 値 | 用途 |
|---|---|---|
| `$color-bg` | `#07070F` | ページ背景 |
| `$color-surface` | `#10111E` | カード、入力欄、モーダル |
| `$color-surface-2` | `#171A2C` | secondary ボタン |
| `$color-ink` | `#ECEBFF` | 本文 |
| `$color-muted` | `#8D8FB5` | 補足テキスト、非選択チップ |
| `$color-placeholder` | `#777AA8` | input の placeholder（surface 上でコントラスト比 4.5 以上） |
| `$color-line` | `#262A45` | 罫線、通常時の枠線 |
| `$color-cyan` | `#00F0FF` | メインアクセント（フォーカス、ホバー、primary） |
| `$color-magenta` | `#FF2BD6` | サブアクセント（選択中チップ、終了系の danger、404） |
| `$color-yellow` | `#FFE600` | 点滅ラベル（FREE COIN） |

ページ背景には、2つの淡い発光を `background-attachment: fixed` で重ねます。

```scss
background-color: $color-bg;
background-image:
  radial-gradient(60% 40% at 15% 0%, rgba(255, 43, 214, .16), transparent 70%),
  radial-gradient(50% 40% at 90% 10%, rgba(0, 240, 255, .12), transparent 70%);
background-attachment: fixed;
```

### 発光（グロー）

| 名前 | 値 |
|---|---|
| cyan glow（ホバー、フォーカス） | `0 0 0 1px $color-cyan, 0 0 26px rgba(0,240,255,.35)` |
| magenta glow（選択中チップ） | `0 0 14px rgba(255,43,214,.45), inset 0 0 10px rgba(255,43,214,.25)` |
| ロゴ文字 | `text-shadow: 0 0 8px $color-cyan, 0 0 22px rgba(0,240,255,.6)`（`_` だけ magenta 版） |

### フォント

`next/font/google` で読み込んでください。

| 用途 | フォント | ウェイト |
|---|---|---|
| 和文・本文全般 | M PLUS 1p | 400 / 700 / 800 |
| 英字ディスプレイ（ロゴ、FREE COIN、件数、404 など） | Orbitron | 600 / 800 |

- 本文は `15px / line-height 1.6`
- Orbitron には `letter-spacing: .08em〜.3em` を付けます（値は要素ごとに後述）

### 角丸・サイズ

| 対象 | 値 |
|---|---|
| チップ / タグ | 6px / 4px |
| ボタン | 8px |
| 入力欄 | 10px |
| GameItem | 12px |
| GameFrame、モーダル | 14px |
| コンテナ幅 | `min(1200px, 100% - 32px)`（左右16pxの余白） |
| ゲームページの最大幅 | 960px |

### ブレークポイント

| 名前 | 条件 | GameItem の列数 |
|---|---|---|
| PC | `>= 1024px` | 5 |
| Tablet | `640px – 1023px` | 3 |
| SP | `<= 639px` | 2 |
| SP横持ち（ゲームページ専用） | `(orientation: landscape) and (max-height: 520px)` | — |

### モーション

- ホバーとフォーカス: `transition: .15s〜.2s`
- 点滅: `@keyframes blink { to { visibility: hidden; } }` を `1.2s steps(2, start) infinite` で使います
- `prefers-reduced-motion: reduce` のときは、点滅を含むアニメーションとトランジションをすべて止めてください

---

## 2. 共通レイアウト（layout.tsx）

- `<html lang="ja">`、viewport は `width=device-width, initial-scale=1, viewport-fit=cover`
- body は `min-height: 100svh` の縦 flex にし、main を `flex: 1` にします。中身が少ないページでもフッターが画面下に付きます

### AppHeader

- `position: sticky; top: 0; z-index: 10`、高さ 64px
- 背景 `rgba(7,7,15,.8)` と `backdrop-filter: blur(10px)`、下線 `1px solid $color-line`
- 左にロゴ「NEON_GAMES」だけを置き、右には何も置きません
  - Orbitron 800 / 20px / `letter-spacing: .12em` / 白文字 + cyan glow
  - `_` だけ magenta + magenta glow
  - クリックで `/` へ移動します。**ゲームページでは移動せず、ConfirmModal を開きます**（§4「ゲームページからの離脱」）

### AppFooter

- 上線 `1px solid $color-line`、文字は `$color-muted` の 12px、上下 padding 24px
- 左にリンク（ゲーム一覧 / 利用規約 / プライバシー。gap 20px、ホバーで cyan）、右に `© 2026 NEON_GAMES`（Orbitron）。両者の gap は `8px 24px`
- 幅が足りなければ折り返します（`flex-wrap`）
- 「ゲーム一覧」は `/` へのリンクです。ゲームページでは ConfirmModal を開きます
- 利用規約とプライバシーはページがまだないので、リンク先は `#` にしておいてください（§7）

### main

- 上下 padding：PC `40px / 72px`、SP `28px / 48px`

---

## 3. TOPページ（`/`）

上から、ヒーロー → 検索 → カテゴリ → 件数 → グリッドの順に並べます。ヒーロー・検索・カテゴリは中央揃え、件数とグリッドは左揃えです。

### 余白

| 箇所 | 値 |
|---|---|
| ヒーロー | padding `8px 0 4px`、キッカーと見出しの間 8px |
| 検索とカテゴリのまとまり | 上下 margin 28px、検索とカテゴリの間 16px |
| 件数とグリッドの間 | 14px |

### ヒーロー

| 要素 | 文言 | スタイル |
|---|---|---|
| キッカー | `FREE COIN` | Orbitron 600 / 13px / `letter-spacing: .3em` / yellow / 点滅 |
| 見出し h1 | ログイン不要、無料で遊べる**ゲームセンター** | M PLUS 1p 800 / `clamp(24px, 4vw, 40px)` / line-height 1.3。「ゲームセンター」だけ cyan + `text-shadow: 0 0 12px rgba(0,240,255,.7)`。この部分は `white-space: nowrap` にし、単語の途中で改行しないようにします |

### 検索ボックス（SearchBox）

- 幅 `min(560px, 100%)`、高さ 50px、角丸 10px、背景 surface、枠 `1px solid $color-line`
- 左端に `SEARCH` ラベルを置きます（Orbitron 600 / 11px / `letter-spacing: .14em` / cyan、`pointer-events: none`）。input の左 padding は 88px です。**SP ではラベルを消し、左 padding を 16px にします**
- placeholder：`ゲーム名を入力`
- フォーカスすると枠が cyan になり、`0 0 0 1px cyan, 0 0 24px rgba(0,240,255,.35)` が付きます
- `<input type="search" aria-label="ゲーム名でさがす">` を `role="search"` の form で囲みます。submit しても画面遷移しないようにします
- **入力するたびに、すぐ絞り込みます**。前後の空白を除いたうえで、大文字小文字を区別せずに部分一致で判定します

### カテゴリチップ（CategoryChips）

- 先頭に `ALL`、続けてカテゴリをデータの順に並べます。単一選択で、初期値は `ALL` です
- 高さ 34px、padding 0 16px、角丸 6px、M PLUS 1p 700 / 13px
  - 通常：背景透明、枠 line、文字 muted
  - ホバー：文字 ink、枠 `#3B4066`
  - 選択中：文字白、枠 magenta、背景 `rgba(255,43,214,.12)`、magenta glow
- `role="group" aria-label="カテゴリ"` の中に `<button type="button" aria-pressed>` を並べます
- PC と Tablet は、中央揃えで折り返します。**SP は折り返さずに横スクロール**にします。左揃えにし、スクロールバーを隠し、左右に -16px の負マージンで画面の端まで広げます（内側に padding 16px）
- **検索とカテゴリは AND 条件**で組み合わせます

### 件数表示

- `{n} GAMES`（Orbitron 600 / 12px / `letter-spacing: .14em` / muted）。グリッドの直前に置きます
- 絞り込むと件数が変わるので、`aria-live="polite"` を付けます

### 0件のとき

- グリッドを隠し、中央に `NO GAME FOUND — 別のキーワードで探してみてください` を muted で表示します（上下 padding 64px）

### ゲーム一覧グリッド

- 列数は §1 のブレークポイント表のとおりです
- gap：PC と Tablet は `24px 20px`、SP は `16px 12px`

### 絞り込み状態の保持

- 検索語と選択カテゴリは画面内の state だけで持ち、URL には載せません。ゲームページから戻ると初期状態に戻ります（§7）

---

## 4. ゲームページ（`/game/[id]`）

`.game-wrap`（最大幅 960px、中央寄せ）の中に、上から次の順で並べます。

1. **見出し**：ゲーム名 h1（M PLUS 1p 800 / `clamp(18px, 2.4vw, 24px)`、左揃え、下の余白 14px）。長い名前は折り返します（省略はしません）
2. **GameFrame**
3. **横向きヒント**：SP の縦持ちのときだけ `端末を横向きにすると大画面でプレイできます` を表示します（muted / 13px / 中央 / 上余白 12px）。条件は `(max-width: 639px) and (orientation: portrait)` です
4. **AppButton（danger）**：`◀ EXIT ／ TOPに戻る`。中央寄せ、上余白 26px。押すと ConfirmModal を開きます

### ゲームページからの離脱

ゲームの途中で誤って離脱するのを防ぐため、画面内の操作でTOPへ戻るときは、必ず ConfirmModal を挟みます。

| 操作 | 挙動 |
|---|---|
| 戻るボタン（AppButton） | ConfirmModal を開く |
| ヘッダーのロゴ | ConfirmModal を開く |
| フッターの「ゲーム一覧」 | ConfirmModal を開く |
| ブラウザの戻るボタン、タブを閉じる | 止めません（確認は出さない） |

### SP横持ち（`landscape and max-height: 520px`）

ゲームを最大化するレイアウトに切り替えます。

- AppHeader、AppFooter、ゲーム名の見出しを隠します
- main の上下 padding を 8px にします。下は `max(8px, env(safe-area-inset-bottom))` です
- コンテナの左右の余白を `max(16px, env(safe-area-inset-left), env(safe-area-inset-right))` にし、ノッチに重ならないようにします
- GameFrame の幅を `min(100%, calc((100svh - 96px) * 16 / 9))` にして、ボタンまで1画面に収めます
- AppButton の上余白を 8px にします
- ゲームページだけに付ける class（例：`body.is-game` や layout のバリアント）で切り替えてください。TOP を横持ちにしても、レイアウトは変えません

---

## 5. 共通コンポーネント

| コンポーネント | spec.md | 使う場所 |
|---|---|---|
| AppHeader / AppFooter | あり | layout |
| GameItem | あり | TOP |
| GameFrame | あり | ゲームページ |
| AppButton | あり | ゲームページ、ConfirmModal、404 |
| ConfirmModal | あり | ゲームページ |
| SearchBox / CategoryChips | **デザインで追加** | TOP（§3） |
| NotFound（`not-found.tsx`） | **デザインで追加** | 存在しない id（§5 NotFound） |
| ResultModal | **デザインで追加** | 各ゲームの終了時（§5 ResultModal） |
| ShareButtons | **デザインで追加**（各ゲームの仕様書で共通化が決定） | ResultModal の中 |

### GameItem

```
┌──────────────┐  ← 枠 1px line / 角丸 12px / 背景 surface / overflow hidden
│   image 16:9 │  ← object-fit: cover
├──────────────┤
│ タイトル（2行まで、…）│  padding 10px 12px 12px
│ [タグ][タグ]   │  ← タイトルとの間 6px
└──────────────┘
```

- 全体を `<Link href="/game/{id}">` にします
- 画像：`next/image`、`alt=""`（直下にゲーム名があるため、装飾として扱います）。画像の読み込み前と、画像がないときは、背景を `$color-surface-2` にします
- 画像の上にスキャンラインを重ねます（`::after`、`pointer-events: none`）

  ```scss
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px);
  ```

- タイトル：M PLUS 1p 700 / 14px / line-height 1.45。`-webkit-line-clamp: 2` で、3行目以降を省略します
- タグ（カテゴリ名）：10px / cyan / 枠 `1px solid rgba(0,240,255,.35)` / 角丸 4px / padding 0 6px / gap 4px / 折り返しあり。spec にはない追加要素なので、props で表示と非表示を切り替えられるようにしてください（§7）
- ホバーとフォーカス：枠を cyan にし、cyan glow を付けて `translateY(-2px)` で浮かせます（transition .2s）
- `focus-visible` でも同じ見た目にします（outline の代わりに glow を使います）

### GameFrame

- `aspect-ratio: 16 / 9; width: 100%`、背景 `#000`、角丸 14px、`overflow: hidden`、`position: relative`
- 2px のグラデーション枠：

  ```scss
  border: 2px solid transparent;
  background: linear-gradient(#000, #000) padding-box,
              linear-gradient(120deg, $color-cyan, $color-magenta) border-box;
  box-shadow: 0 0 40px rgba(0,240,255,.25), 0 0 80px rgba(255,43,214,.15);
  ```

- 中身は `children` で受け取り、各ゲームを描画します。ゲームは枠いっぱい（`position: absolute; inset: 0` 相当）に描画する前提です

### AppButton

| variant | 枠 | 背景 | 影 | 用途 |
|---|---|---|---|---|
| `primary`（default） | cyan | `rgba(0,240,255,.08)` | `0 0 12px rgba(0,240,255,.25), inset 0 0 12px rgba(0,240,255,.12)` | 汎用、404の「TOPに戻る」 |
| `danger` | magenta | `rgba(255,43,214,.1)` | `0 0 12px rgba(255,43,214,.3), inset 0 0 12px rgba(255,43,214,.15)` | ゲーム終了、モーダルの「はい」 |
| `secondary` | line | surface-2 | なし | モーダルの「いいえ」 |

- 共通：高さ 46px、padding 0 26px、角丸 8px、M PLUS 1p 800 / 15px、文字は白（secondary は ink）、gap 10px（アイコン用）
- hover と focus-visible は同じ見た目です
  - primary：背景 `rgba(0,240,255,.18)`、影 `0 0 22px rgba(0,240,255,.6), inset 0 0 14px rgba(0,240,255,.25)`
  - danger：背景 `rgba(255,43,214,.22)`、影 `0 0 22px rgba(255,43,214,.65), inset 0 0 14px rgba(255,43,214,.3)`
  - secondary：枠を muted、背景を `#1F2340` にします
- 基本は `<button type="button">` で、`onClick` と `children` を受け取ります。リンクとして使う場合（404の「TOPに戻る」）は、同じ見た目で `<Link>` を描画できるようにしてください

### ConfirmModal

- props の例：`isOpen`、`title`、`message`、`onConfirm`、`onCancel`
- `position: fixed; inset: 0; z-index: 100`、パネルは中央に置き、外側の padding は 16px です
- 背景：`rgba(3,3,10,.75)` と `blur(3px)`。**背景をクリックしたら onCancel**
- パネル：幅 `min(400px, 100%)`、surface、枠 `1px solid magenta`、角丸 14px、padding `28px 24px 22px`、中央揃え、`box-shadow: 0 0 40px rgba(255,43,214,.35)`
- 開くとき：`opacity 0→1` と `translateY(8px)→0` を .2s で動かします
- 内容は上から次のとおりです
  1. `QUIT GAME?`（Orbitron 600 / 12px / `letter-spacing: .3em` / magenta / 下余白 6px）
  2. タイトル `ゲームを終了しますか？`（19px / 800 / 下余白 6px）
  3. 本文 `プレイ中の内容は保存されません。`（13px / muted / 下余白 22px）
  4. ボタン2つを等幅で横並びにします（gap 12px）。**左が「いいえ」（secondary）、右が「はい」（danger）**
- 挙動
  - 「はい」で `/` へ移動します。「いいえ」、Esc、背景クリックではモーダルを閉じ、ゲームを続けます
  - 開いたら**「いいえ」にフォーカス**します（安全側）。閉じたら、開く前の要素にフォーカスを戻します
  - `role="dialog" aria-modal="true" aria-labelledby` を付け、モーダル内でフォーカスを循環（focus trap）させます
  - 開いている間は、背面のスクロールを止めます
  - モーダルを開いている間にゲームを一時停止するかは、各ゲームの実装次第です。GameFrame から子に「モーダル表示中」を伝えられる設計にしておくと、後で楽です

### NotFound（404）

存在しない `/game/[id]` を開いたときは、`notFound()` から `app/not-found.tsx` を表示します。ヘッダーとフッターは通常どおり出します。**PMの確認待ちのため暫定デザイン**です（§7）。

- 中央揃え、上下 padding `48px 24px`
- 上から次のとおりです
  1. `404`（Orbitron 800 / `clamp(48px, 10vw, 96px)` / line-height 1 / `letter-spacing: .08em` / magenta / `text-shadow: 0 0 12px magenta, 0 0 32px rgba(255,43,214,.6)` / 下余白 16px）
  2. h1 `GAME NOT FOUND`（Orbitron 800 / `clamp(18px, 2.4vw, 24px)` / `letter-spacing: .14em` / 下余白 8px）
  3. 本文 `お探しのゲームは見つかりませんでした。`（14px / muted / 下余白 28px）
  4. AppButton（primary）`TOPに戻る`。`/` へのリンクで、確認モーダルは挟みません

### ResultModal（ゲーム終了モーダル）

各ゲームの終了時に、**GameFrame の中**に重ねて表示します（ページ全体ではありません）。中身は「スコア」「もう1度プレイ」「ShareButtons」の3つだけです。ゲームの世界観に関係なく、プラットフォームの見た目で統一します。

参照モック：[temp/kozo-run/design.html](../temp/kozo-run/design.html) の `#over`（スタイルは [temp/kozo-run/shell.css](../temp/kozo-run/shell.css) の `.result-modal`）

```
┌──────────── GameFrame ────────────┐
│     ┌──────────────────────┐      │ ← 背景 rgba(5,3,14,.6) + blur(2px)
│     │      逃げた距離       │      │ ← scoreLabel
│     │       586 m          │      │ ← score + unit
│     │  [ もう1度プレイする ] │      │
│     │ ─────────────────── │      │
│     │     結果をシェア       │      │
│     │ [X][LINE][FB][コピー]  │      │ ← ShareButtons
│     └──────────────────────┘      │
└───────────────────────────────────┘
```

- props の例：`isOpen`、`scoreLabel`（例「逃げた距離」）、`score`（数値）、`unit`（例「m」）、`shareText`、`onRetry`
- **寸法は GameFrame の幅に比例**させます。GameFrame の中身に `container-type: size` を付け、`cqw`（GameFrame 幅の1%）で指定します。画面の幅（vw）では指定しないでください
- 背景：GameFrame 全面に `rgba(5,3,14,.6)` と `backdrop-filter: blur(2px)`。背景クリックでは閉じません（もう1度プレイするか、EXIT するかを選ばせるため）
- パネル：幅 56cqw、padding `2.6cqw 3cqw 2.4cqw`、角丸 1.6cqw、背景 `rgba(16,17,30,.94)`、枠 `2px solid magenta`、`box-shadow: 0 0 3cqw rgba(255,43,214,.5)`、中身は中央揃え
- 内容（上から）
  1. scoreLabel：M PLUS 1p 800 / `max(11px, 1.6cqw)` / `letter-spacing: .1em` / magenta / `text-shadow: 0 0 1cqw rgba(255,43,214,.8)` / 下余白 .6cqw
  2. score：Orbitron 800 / 8cqw / line-height 1 / yellow（`#FFE600`）/ `text-shadow: 0 0 1.4cqw rgba(255,230,0,.7)` / 下余白 2cqw。unit は `.4em`、左余白 `.2em`。数値は `toLocaleString()` で3桁区切りにします
  3. 「もう1度プレイする」ボタン：高さ `5cqw`（最小 34px）、padding `0 3.6cqw`、角丸 .9cqw、枠 `2px solid cyan`、背景 `rgba(0,240,255,.12)`、M PLUS 1p 800 / `max(12px, 1.8cqw)`、`box-shadow: 0 0 1.4cqw rgba(0,240,255,.45)`。hover と focus-visible では背景 `rgba(0,240,255,.25)`、影 `0 0 2.6cqw rgba(0,240,255,.8)`
  4. 区切り線（上余白 1.8cqw、`1px solid $color-line`、その下に padding 1.4cqw）と ShareButtons
- 動き：背景は opacity を .25s でフェード、パネルは `translateY(1cqw)→0` と opacity を .25s
- 挙動
  - 開いたら「もう1度プレイする」にフォーカスします。Space や Enter で、すぐに再スタートできます
  - `role="dialog" aria-modal="true" aria-labelledby`（scoreLabel を指す）を付けます
  - 開いている間は、ゲームの入力（ジャンプなど）を受け付けません

### ShareButtons

ResultModal の中で使う、SNS シェアのボタン群です。ゲームごとに `shareText` を渡します。

| ボタン | ラベル | 動作 |
|---|---|---|
| X | ポスト | `https://x.com/intent/post?text={text}&url={url}` を別ウィンドウで開く |
| LINE | LINE | `https://social-plugins.line.me/lineit/share?url={url}&text={text}` を別ウィンドウで開く |
| Facebook | Facebook | `https://www.facebook.com/sharer/sharer.php?u={url}` を別ウィンドウで開く（Facebook は文章を渡せません） |
| URLコピー | URLをコピー | `{text} {url}` をクリップボードにコピーし、ラベルを1.6秒間「コピーしました」に変える |

- `{url}` はそのゲームページの URL、`{text}` はゲームから渡す文章です（例：`小僧ランで母ちゃんから{score}m逃げた！ #小僧ラン #NEON_GAMES`）
- 上に小見出し `結果をシェア`（`max(10px, 1.2cqw)`、不透明度 .75）を置きます
- ボタン：横並び、中央揃え、gap 1cqw、幅が足りなければ折り返し。高さ `4.4cqw`（最小 30px）、padding `0 1.4cqw`、角丸 999px、枠 `1px solid #3B4066`、背景透明、文字 `#C9CBF0` / `max(11px, 1.45cqw)` / 700。アイコンは 1.5cqw（最小 12px）で、ラベルの左に置きます
- hover と focus-visible：背景 `rgba(0,240,255,.14)`、focus-visible では枠も cyan にします
- アイコンはモックでは仮の SVG です。**本実装では各社の公式ロゴを、それぞれのブランドガイドラインに従って使ってください**
- 色やふち取りは CSS カスタムプロパティ（`--share-border`、`--share-bg`、`--share-bg-hover`、`--share-ink`、`--share-radius`）で上書きできるようにしておいてください。今は ResultModal の中でしか使いませんが、別の場所で使うときに困らないようにするためです

---

## 6. 文言一覧

| 場所 | 文言 |
|---|---|
| ロゴ | NEON_GAMES |
| TOPキッカー | FREE COIN |
| TOP見出し | ログイン不要、無料で遊べるゲームセンター |
| 検索 placeholder | ゲーム名を入力 |
| 検索 aria-label | ゲーム名でさがす |
| 全カテゴリのチップ | ALL |
| 件数 | {n} GAMES |
| 0件 | NO GAME FOUND — 別のキーワードで探してみてください |
| 横向きヒント | 端末を横向きにすると大画面でプレイできます |
| 戻るボタン | ◀ EXIT ／ TOPに戻る |
| モーダル | QUIT GAME? / ゲームを終了しますか？ / プレイ中の内容は保存されません。 / いいえ / はい |
| 404 | 404 / GAME NOT FOUND / お探しのゲームは見つかりませんでした。 / TOPに戻る |
| フッター | ゲーム一覧 / 利用規約 / プライバシー / © 2026 NEON_GAMES |
| ResultModal | {scoreLabel} / {score}{unit} / もう1度プレイする |
| ShareButtons | 結果をシェア / ポスト / LINE / Facebook / URLをコピー / コピーしました |
| `<title>` | TOP：`NEON_GAMES`、ゲーム：`{ゲーム名} | NEON_GAMES`、404：`GAME NOT FOUND | NEON_GAMES` |

---

## 7. 実装メモ・未決事項

### アクセシビリティ

- 文字色のコントラスト比は、使っている組み合わせすべてで 4.5 以上を確認済みです（muted は背景に対して約 6.4、placeholder は surface に対して約 4.6）。新しい色の組み合わせを増やすときも、4.5 以上を保ってください
- キーボードで操作するとき、すべての操作要素に cyan glow のフォーカス表示が出るようにしてください（ボタン、チップ、GameItem、リンク、検索欄）
- 点滅（FREE COIN）は、`prefers-reduced-motion` のときは止めてください（§1 モーション）

### 未決事項（PM確認中）

暫定の対応で実装を進めてください。決まったら、この資料を更新します。

| # | 内容 | 暫定の対応 |
|---|---|---|
| 1 | 存在しない `/game/[id]` の表示 | §5 NotFound の暫定デザインで実装 |
| 2 | GameItem にカテゴリ名のタグを表示するか | 表示する。props で消せるようにしておく |
| 3 | 利用規約・プライバシーのページ | リンク先は `#` |
| 4 | TOP の絞り込み状態を、ゲームページから戻ったときに保持するか | 保持しない（初期状態に戻す） |
| 5 | ShareButtons に Instagram 向けの「画像でシェア」を足すか（スコア入り画像を作り、スマホの共有メニューで渡す案） | 今は入れない。X / LINE / Facebook / URLコピーの4つで実装 |
| 6 | ResultModal のスコアの上の見出し（scoreLabel）を残すか | 残す。props で渡す |

### 素材

- ゲームの画像は 16:9（推奨 640×360 以上）です。各ゲームの画像はゲームごとのデザイン仕様にあります（例：[小僧ラン §8](./games/小僧ラン_design.md)）
