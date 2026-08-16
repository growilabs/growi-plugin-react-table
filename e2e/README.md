# e2e — GROWI 実機との統合テスト

`tests/` のモックページは、プラグインのロジックしか守れない。
GROWI 本体のレンダラ・プラグインローダ・`TableWithEditButton`、そして
**React インスタンスの共有**と噛み合っているかは実機でしか分からない。
ここはその確認をする。

とくに [`specs/react-instance.spec.ts`](specs/react-instance.spec.ts) は本プラグインの設計そのものの検証にあたる。
プラグインは React を同梱せず `growiFacade.react`（GROWI 自身のインスタンス）を借りている
（[`src/growi-react/index.ts`](../src/growi-react/index.ts) を参照）。
これが崩れると全てのフックが `Invalid hook call` で落ちる。

## 前提

**devcontainer の中には docker が入っていない。** 実行経路は 2 つ。

### 1. ホスト側 / CI から（既定）

```bash
pnpm build                       # dist/ を bind mount するので先にビルドする
pnpm e2e:up                      # docker compose up + プラグインの登録
pnpm e2e
pnpm e2e:down
```

`pnpm e2e:up` は `docker compose -f e2e/docker-compose.yaml up -d` に続けて
[`seed-plugin.sh`](seed-plugin.sh) を叩く。
GROWI の起動（MongoDB のレプリカセット初期化を含む）に 1〜2 分かかるが、
`global-setup.ts` がヘルスチェックを待つので、すぐ `pnpm e2e` を叩いてよい。

### 2. devcontainer の中から

`.devcontainer/docker-compose.yml` に `e2e` プロファイル付きで同じサービスがある。
**ホスト側**で起動する:

```bash
docker compose -f .devcontainer/docker-compose.yml --profile e2e up -d
```

devcontainer の中からは兄弟サービスとして見えるので、ベース URL を差し替える:

```bash
E2E_BASE_URL=http://growi:3000 pnpm e2e
```

（この経路では `seed-plugin.sh` の `COMPOSE_FILE` も
`.devcontainer/docker-compose.yml` を指すように渡すこと。）

## インストールのしくみ

GROWI の `install()` は GitHub の zip を落として展開し、
`growiplugins` に 1 件ドキュメントを書くだけ。ここでは GitHub を経由せずに同じ状態を作る。

| GROWI がやること | ここでの再現 |
| --- | --- |
| アーカイブを `PLUGIN_STORING_PATH` へ展開 | `docker-compose.yaml` の bind mount（`dist/` と `package.json` を `/opt/growi/apps/app/tmp/plugins/growilabs/growi-plugin-react-table/` へ） |
| `growiplugins` にドキュメントを保存 | [`seed-plugin.sh`](seed-plugin.sh) の upsert |

**プラグインを更新しても GROWI の再起動は要らない。**
`_document.page.tsx` はリクエストのたびに `retrieveAllPluginResourceEntries()` を呼ぶ。
`pnpm build` し直せば次のリロードで反映される（`dist/` はマウントなので同期は自動）。

`seed-plugin.sh` も 1 度流せば十分（冪等なので再実行しても害はない）。

## バージョンを固定している理由

公式イメージは **`weseek/growi` から `growilabs/growi` へ移行している**
（`weseek/growi` は 7.4.2 で止まっている）。`docker-compose.yaml` は
`growilabs/growi:8.0.1` を固定で指す。

`latest` にしないのは、テストが落ちたときに
「プラグインが壊れたのか GROWI が変わったのか」を切り分けられるようにするため。
GROWI への追随は「タグを上げて `pnpm e2e` を回す」という明示的な作業にする。

なお **GROWI v8 は MongoDB のレプリカセットを要求する**（change streams を使うため）。
単一ノードで足りるので、公式 compose と同じ `rs.initiate` 付き healthcheck を写してある。

## 認証とページの用意

[`global-setup.ts`](global-setup.ts) がやること:

1. `GET /_api/v3/healthcheck?connectToMiddlewares=true` を待つ
   （`AUTO_INSTALL_*` による初期セットアップの完了待ちを兼ねる）
2. `POST /_api/v3/login` で管理者ログインし、セッションを `.auth/admin.json` に保存
3. [`pages.ts`](pages.ts) の markdown を `POST /_api/v3/page` で投入（既にあれば `PUT`）

CSRF トークンは要らない。GROWI は csurf を
`ignoreMethods: ['GET','HEAD','OPTIONS','PUT','POST','DELETE']` で設定しており、実質無効。
`/_api` の `CertifyOrigin` は `Origin` ヘッダが無いリクエストを同一オリジン扱いするので、
Playwright の `APIRequestContext` からそのまま叩ける。

spec は 2 つのプロジェクトに分かれる:

| プロジェクト | 対象 | 認証 |
| --- | --- | --- |
| `admin` | `*.spec.ts`（`*.guest.spec.ts` を除く） | `.auth/admin.json` |
| `guest` | `*.guest.spec.ts` | 無し（`AUTO_INSTALL_ALLOW_GUEST_MODE=true`） |

## コンソールエラーの監視

React ブリッジが壊れても画面は真っ白にならない。
React は失敗したサブツリーだけを巻き戻すので、記事の他の部分は描画されたままになる。
つまり DOM のアサーションだけでは取り逃がす。

そこで [`test.ts`](test.ts) の `consoleErrors` フィクスチャで
コンソールを拾い、`expectNoReactFailures()` で React 由来の失敗だけを弾く。
実機の GROWI は無関係なエラー（Elasticsearch 未接続など）も吐くので、
全部を失敗扱いにはしない。
