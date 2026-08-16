# growi-plugin-react-table

[GROWI](https://github.com/weseek/growi) のプラグイン。ページ中の markdown の表に、
ソート・フィルタリングなどの機能を後付けする。内部では
[@tanstack/react-table](https://tanstack.com/table) v9 を使う。

先行実装の [growi-plugin-datatables](https://github.com/growilabs/growi-plugin-datatables)
（DataTables.net を DOM 操作で被せる方式）を、React ネイティブに解き直したもの。
拡張記法の計算はそちらに準拠する。

## 何ができるか

記事の中の表は基本的に「読む」ものなので、既定の見た目は素の表にできるだけ近い。
コンパクトなアイコン列が表の上に 1 行出るだけで、中身は開くまで現れない。

| 機能 | 説明 |
| --- | --- |
| **ソート** | 列見出しのボタンで **昇順 → 降順 → 元の順序** と巡回する。既定では markdown に書いた順序のまま。ソート中だけ一括解除ボタンが出る |
| 自然順ソート | `2.4m` < `4.5m` < `10.9m`。数値だけの列は算術順（`4` < `10`） |
| **全文検索** | 🔍 で検索欄をその場に開く。閉じると条件もクリアされる |
| **列フィルタ** | ⧉ で列ごとのフィルタ行を出す。値の種類が少ない列は自動でプルダウン、それ以外はテキスト入力 |
| 件数表示 | フィルタで行が隠れているときだけ `Showing 2 of 5 rows` を出す |
| **列の操作** | ▦ から表示/非表示・並べ替え・固定 |
| 列幅 | 見出しの右端をドラッグ |
| ページング | 200 行を超える表だけ 100 行ずつに分割 |
| **エクスポート** | ⬇ からクリップボードへコピー / CSV ダウンロード。**見えている行と列だけ** |
| **計算記法** | `{vsum}` `{havg}` など。下記参照 |
| 既定 OFF | ⋯ から行選択・行の固定・列でのグループ化と集計 |

### 計算記法

セルに次のいずれかだけを書くと、その場で計算結果に置き換わる。

`{vsum}` `{hsum}` `{vavg}` `{havg}` `{vmax}` `{hmax}` `{vmin}` `{hmin}` `{vmode}` `{hmode}` `{vmedian}` `{hmedian}`

`v` で始まるものは列（縦）を、`h` で始まるものは行（横）を集計する。
数値として読めないセルは集計に入らない。

```markdown
| A | B | C |
| --- | --- | --- |
| 7 | 13 | {hsum} |
| 15 | 1 | {havg} |
| {vsum} | {vmax} | |
```

- **計算は静的**。描画前に一度だけ行われるので、フィルタしても値は変わらない。
  合計は「著者が書いた表」のものであって、読み手がたまたま見ている部分集合のものではない
- 集計できるものが何も無い場合（数値を 1 つも含まない列の `{vavg}` など）は `!CalcErr!` と表示する
- growi-plugin-datatables と同じ結果になることを
  [`tests/calc/calc-method.spec.ts`](tests/calc/calc-method.spec.ts) で担保している

### 手を出さない表

次の表は素通しする。ツールバーも出ないので、読み手にはプラグインが入っていることが分からない。

- ヘッダ行が無い表
- 本文が 2 行未満の表（`MIN_BODY_ROWS`。並べ替える意味が無い）
- 行ごとにセル数が違う表（列に対応付けられない）

## 動作要件

- **GROWI v7.2 以降**。`growiFacade.react` が必要（下記）
- 統合テストは `growilabs/growi:8.0.1` で確認している

`growiFacade.react` が無い GROWI では、表の拡張を行わず計算記法だけが働く。
ページが壊れることはない。

## インストール

GROWI の管理画面 → プラグイン → このリポジトリの URL を追加する。

`dist/` はリポジトリにコミットされている。GROWI はプラグインを展開するだけでビルドしないため。

## しくみ

```
GROWI markdown renderer
  └ rehypePlugins に calcTable を追加        … {vsum} 等を hast の段階で数値へ置換
  └ components.table を包む
        └ ReactTableWrapper                  … children を解析。小さい表はそのまま
              └ EnhancedTable                … useTable() 本体
                    ├ Toolbar
                    ├ <Table>                … GROWI の TableWithEditButton をそのまま使う
                    └ Footer                 … 件数表示 / ページャ
```

要点が 2 つある。

### 元のセルを使い回す

react-table に渡すのは**セルのテキストだけ**で、描画には GROWI が作った
`<th>` / `<td>` の React 要素をそのまま使う。並べ替えや絞り込みは、その要素を移動させるだけ。

おかげでセル内のリンク・コード・強調に加えて、GROWI 独自のセルコンポーネント
（`components.img` の LightBox など）もそのまま生きる。
`<table>` を別の場所へ動かさないので、GROWI の「表を編集」ボタンとも衝突しない
— growi-plugin-datatables が `reactDomBridge.ts` と `ResizeObserver` で塞いでいた問題は、
そもそも発生しない。

### React を同梱しない

GROWI プラグインが自前の React を bundle すると、**フックが全て落ちる**。
描画するのは GROWI の reconciler なのに、フックはプラグイン側 React の
dispatcher を読みにいくため。growi-plugin-datatables の `DataTable.tsx` にも
`ReactCurrentDispatcher が null になる` というメモが残っている。

そこで [`src/growi-react/`](src/growi-react/) が `react` の代わりを務め、
GROWI が公開しているインスタンス (`growiFacade.react`) へ転送する。
[`vite/growi-react-resolver.ts`](vite/growi-react-resolver.ts) が、プラグインのソースと
`@tanstack/*` からの `react` import をこのブリッジへ差し替える。

GROWI はプラグインを `<head>` の `<script type="module">` として読み込むので、
このモジュールは `growiFacade.react` が用意される**前**に評価される。
だから全ての export が「使われた時に解決する」形になっている。

## 開発

```bash
pnpm install
pnpm exec playwright install --with-deps chromium

pnpm dev        # モックページ (index.html / growi.html / bench.html)
pnpm lint       # Biome (lint + format)
pnpm build      # tsc --noEmit && vite build
pnpm test       # モックページに対する Playwright
pnpm e2e        # GROWI 実機に対する Playwright（e2e/README.md 参照）
```

### モックページ

| ページ | 何を再現しているか |
| --- | --- |
| `index.html` | `components.table` が未設定の状態。GROWI のプレビュー描画と同じ形 |
| `growi.html` | GROWI の `TableWithEditButton` 付き。ページ表示と同じ形。編集ボタンとの重なりの確認用 |
| `bench.html` | 描画性能の計測 (`?tables=10&rows=200&cols=10`) |

モックは [`src/mock/harness.tsx`](src/mock/harness.tsx) 経由で
**`client-entry.tsx` の活性化経路そのもの**を通す。
「facade がまだ無い状態でモジュールが評価される」という一番壊れやすい順序を、
本番と同じに再現するため。

### ビルド成果物の制約

GROWI 側の実装（`growi-plugin.ts` / `_document.page.tsx`）に由来する制約が 3 つある。
CI で機械的に検査している。

1. エントリのファイル名は **`client-entry.tsx` 固定**（manifest のキーになる）
2. **CSS チャンクはちょうど 1 個**。GROWI は `manifest['client-entry.tsx'].css`（配列）を
   文字列に埋め込むので、2 個以上あると `"a.css,b.css"` という href になって壊れる
3. **`dist/` をコミットする**。GROWI はビルドしない

### なぜ mathjs なのか

ビルド後のプラグインは **175 KB / gzip 49.7 KB**（React は同梱しない）。内訳はおおよそ
react-table の全機能で 27 KB、mathjs/number で 18.5 KB、残りが自前のコードと CSS（いずれも gzip）。
**計算記法だけで全体の約 4 割**を占めるので、選定はひととおり測って決めた。

計算記法は `mathjs/number` を使う。6 関数だけを bundle した実測値:

| 方式 | raw | gzip |
| --- | --- | --- |
| `import { sum, … } from 'mathjs'` | 186 KB | 56.8 KB |
| `mathjs` + factory (`create`) | 197 KB | 59.8 KB |
| **`import { sum, … } from 'mathjs/number'`** | **62 KB** | **18.5 KB** |
| `mathjs/number` + factory | 72 KB | 21.7 KB |
| `simple-statistics` | 3.8 KB | 1.6 KB |

mathjs 公式のツリーシェイク手段である factory パターンは、`create()` 自体が
typed-function 機構を引き込むため**かえって太る**。`mathjs/number` の素の named import が最小。

`simple-statistics` は空集合で例外を投げる挙動まで mathjs と一致するが、
`mode()` がスカラーを返す点だけ違う。`{vmode}` が同数タイのときの表示が変わり、
datatables との互換テストが 1 セル書き換えになるため採らなかった。
