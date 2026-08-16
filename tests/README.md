# tests

モックページに対する Playwright テスト。GROWI 実機に対するものは [`../e2e/`](../e2e/) にある。

| ディレクトリ | 内容 |
| --- | --- |
| `ui/` | ツールバー・ソート・フィルタ・列操作・エクスポート、GROWI の編集ボタンとの共存 |
| `calc/` | 独自の計算記法 (`{vsum}` など) の互換性 |
| `perf/` | 描画性能の計測と、行数の固定 |

```bash
pnpm exec playwright install --with-deps chromium
pnpm test                    # 全部
pnpm test --grep ソート       # 絞り込み
pnpm test:report
```

vite の dev server は Playwright が自動で起動する（`playwright.config.ts` の `webServer`）。
既に `pnpm dev` で 5173 番が上がっていればそれを再利用する。

## モックページ

| ページ | `components.table` | 何を再現しているか |
| --- | --- | --- |
| `index.html` | 未設定 | GROWI のプレビュー描画。プラグイン側の代替 table 要素を通る |
| `growi.html` | `MockTableWithEditButton` | GROWI のページ表示。編集ボタンとの重なりの確認用 |
| `bench.html` | 未設定 | 描画性能の計測 |

**`growi.html` は GROWI 本体の `TableWithEditButton.tsx` / `.module.scss` を写している。**
このプラグインが実際に包む相手は素の `<table>` ではなくこのコンポーネントなので、
両者の重なりに起因する不具合は `index.html` 側では原理的に検出できない。
GROWI 本体のこのコンポーネントが変わったら
[`src/mock/MockTableWithEditButton.tsx`](../src/mock/MockTableWithEditButton.tsx) と
`growi.html` の `<style>` を追随させること。

## 勘所

- **モックは `client-entry.tsx` の活性化経路を通る。**
  [`src/mock/harness.tsx`](../src/mock/harness.tsx) が
  「プラグインの評価 → facade の公開 → `activate()` → 描画」を本番と同じ順序で行う。
  この順序こそが一番壊れやすい部分なので、ラッパーを直接 import してはいけない
- **`ui/react-bridge.spec.ts` は他の全てを支える。**
  プラグインは React を同梱せず `growiFacade.react` を借りている。
  これが崩れると全てのフックが落ちるので、
  ホストと同一インスタンスであること・re-export に漏れが無いことを直接確かめている
- **性能テストは時間を assert しない。** マシン負荷でぶれるため、数値は標準出力に出すだけ。
  代わりに行数を固定してある。描画方式を変えたらログの数値が動き、
  挙動が壊れていればテストが落ちる
