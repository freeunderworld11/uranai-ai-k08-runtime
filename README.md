# uranai-ai-k08-runtime

Cloudflare Workers runtime for K08 Swiss Ephemeris integration

## 現在の段階

K08 RuntimeのAPI入口のみを実装しています。Swiss Ephemeris本体・WASM・天文暦データは未導入です。
`K08_v2.2_PRODUCTION` は引き継いだ仕様識別子であり、計算の実装完了を意味しません。
`ephemeris: "SWISS_EPHEMERIS"` は予定するエンジン名です。現段階では天文値を生成しません。

| リクエスト | 応答 |
| --- | --- |
| `GET /`、`GET /health` | 200、`SHELL_ACTIVE`、`calculation_ready: false` |
| `POST /calculate` | 503、`RUNTIME_NOT_READY`、`calculation_performed: false` |
| 上記パスへの `OPTIONS` | 204、本文なし、CORSヘッダー |
| 上記パスで非対応のメソッド | 405、`Allow` ヘッダー |
| 不明なパス | 404、`NOT_FOUND` |

計算入力はまだ解析・検証しません。不正JSONを含め、計算要求は常に未準備として返します。
CORSは公開API入口として `*` を使用し、認証・入力保存・外部通信は行いません。

## 開発・検証

Node.js 22以上とnpmを使用します。

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm test` はNode.jsのWeb APIで応答契約を検証します。
`npm run build` はWranglerでバンドルするdry runで、公開はしません。
ローカル起動後は `http://localhost:8787/health` で確認できます。

## Cloudflareへの反映

対象アカウント・既存Worker・GitHub連携の設定を確認した次の段階で実施します。
手動で反映する場合は、認証済み環境で `npm run deploy` を実行します。
Worker名は `uranai-ai-k08-runtime` です。同名Workerへのデプロイは既存コードを更新します。
このリポジトリには自動デプロイ用のGitHub Actionsを含めていません。

## Swiss Ephemerisの採用判定（未完了）

Cloudflare WorkersはWASMに対応していますが、それだけで個々のSwiss Ephemerisラッパーの互換性は保証されません。
次の段階で候補を固定し、静的WASMインポート、初期化、仮想ファイルシステムと暦データ、CPU・メモリ制限、基準値との一致、配布条件を検証します。
互換性と精度の確認が完了するまで `calculation_ready` はfalseを維持します。

既存WASMラッパーが適合しない場合はWorkers向けの専用WASMビルドを検討します。
それも困難なら、Swiss Ephemerisを別のサーバー／コンテナで動かし、Workerから呼び出す構成を代替案とします。
異なる天文エンジンへの無断の置換は行いません。

- [Cloudflare WASM公式ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/webassembly/)
- [Swiss Ephemeris公式サイト](https://www.astro.com/swisseph/)

## ライセンス

このリポジトリのコードは **GNU AGPL v3のみ（AGPL-3.0-only）** で提供します。全文は [LICENSE](LICENSE) を参照してください。
ライセンス本文はSPDXのAGPL-3.0-onlyテキストから取得しています。
APIの稼働確認応答に公開ソースURLを含めています。派生版を公開する場合は実際の対応ソースのURLに更新してください。
将来追加するSwiss Ephemeris本体・ラッパー・暦データについては、それぞれのライセンスと必要な通知を採用時に確認します。
