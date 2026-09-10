# uranai-ai-k08-runtime

Cloudflare Workers runtime for K08 Swiss Ephemeris integration

Swiss Ephemeris **2.10.03** のWASMと暦データを組み込んだ計算アダプターです。ローカルworkerdで検証済み。本番未公開・K08 Deployment Gate未承認です。

## 現在の範囲

`POST /calculate` で太陽〜冥王星の10天体とPlacidusハウスを計算します。
これは `K08_ENGINE_ADAPTER_v0.2` という暫定の技術用I/Oです。UTC/K02/TZDB入力契約、Custom GPT Action、K19の認証は後続工程です。
`K08_v2.2_PRODUCTION` は引き継いだ仕様識別子であり、全仕様適合・本番承認を表しません。

稼働確認では `engine_integrated: true`、`runtime_status: ENGINE_INTEGRATED` を返します。`calculation_ready: false` はK08としての利用承認待ちを意味します。計算アダプターの試験実行は可能ですが、応答の `k08_deployment_gate` は常に `PENDING` です。

## 起動と検証

Node.js 22以上、npmを使用します。

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm test` は実際のローカルworkerdでWASM、ネイティブ参照値、入力拒否、Placidus失敗、データ欠落、同時リクエストを検証します。
`npm run build` は公開しないdry runです。Wranglerはビルド・起動時に `scripts/prepare-runtime.mjs` を実行し、固定した依存から `.generated/` を生成します。
この処理は元のnode_modulesを変更せず、版・SHA-256・パッチ対象の一致を確認します。想定と異なる依存はビルド時に拒否します。生成物はGitへ登録しません。

## 計算API

### K02正式フィールドの受付（今回追加）

`POST /calculate/k02` はK02_TO_K08_ASTRO_TIME_GEO_v1の19項目をJSONオブジェクトとして直接受け取ります。フィールド名は [src/k02-adapter.js](src/k02-adapter.js) のK02_FIELDS、入力例は [test/fixtures/k02.js](test/fixtures/k02.js) を参照してください。入力例のTZDB_VERSIONは試験用の値で、承認済みTZDBを意味しません。

機械用の暫定表現として、緯度・経度は数値またはnull、残りは文字列またはnull。すべてのキーを含め、不明値はnullとします。UTCは `YYYY-MM-DDTHH:mm:ss[.SSS]Z`、うるう秒表記・不正日付・24時は拒否。offsetは元の文字列を保存するだけで計算に使用せず、K02のUTCを別の時差で置換しません。

K02_v2.4_PRODUCTIONとPASS/PARTIAL_PASSを確認し、LOCAL_TIME_STATUS=NORMAL、TIMEZONE_STATUS=CONFIRMEDおよびtimezone ID・TZDB版の記録が必要です。利用可能なUTCをSwiss EphemerisのjulianDayで変換し、input_echoに元の19項目、derived_runtime_valueに生成したJDを返します。

SECONDは時点計算、MINUTEは入力UTC時点の条件付き試算です。分の中での境界安定性を保証しません。HOUR・APPROXIMATE・UNKNOWNは範囲探索が未実装のためLOCAL_BLOCKにします。DSTの曖昧時刻・存在しない時刻を勝手に補正しません。

GEO_STATUS=CONFIRMEDかつGEO_PRECISION=EXACT/CITY_CENTERで座標が有効な場合だけハウスを計算します。それ以外はUNAVAILABLE_GEOとし、UTCが利用できれば天体は残します。LOCALITY_CENTER等を正確な座標へ格上げしません。

1970年以前の信頼性がMEDIUM/LIMITEDなら条件付き、HIGH/MEDIUM/LIMITED以外なら時刻依存計算を留保。元の時刻精度と履歴信頼性は変更しません。time_status=CONDITIONALの場合、各数値のVALIDは「エンジン計算として利用可能」という意味で、出生時刻全体の確定を意味しません。

この入口はK02宣言の受領と状態判定を行います。IANA TZDBの実照合、local日時とoffsetとUTCの整合検証、K02提供元の認証、時間範囲探索は未実装です。K02の正式入力フィールド対応と、K02実行基盤全体の検証済みを混同しないでください。本番GateはPENDINGです。

### 開発用JD入力

```http
POST /calculate
Content-Type: application/json

{"jd_ut":2451545,"latitude":35.6762,"longitude":139.6503}
```

| 入力 | 意味・制約 |
| --- | --- |
| jd_ut | UTのユリウス日（TTではない）。2415020.5以上、2488069.5未満。1900-01-01〜2099-12-31の範囲 |
| latitude | 北緯を正とする数値、-90〜90 |
| longitude | 東経を正とする数値、-180〜180 |

3項目すべて必須。数値文字列・未知の項目を拒否します。JSON本文は4096 bytesまで。日時文字列・タイムゾーン・夏時間変換は未実装です。UTCをUTへどう扱うかを含め、正式な時刻契約を後続工程で確定します。

計算条件は地心・トロピカル・日付の黄道座標、`SEFLG_SWIEPH | SEFLG_SPEED = 258`、Placidus固定。変更用のflags入力は受け付けません。
成功時は200で以下を返します。

- `calculation_performed: true`、`runtime_status: CALCULATED`
- 実際のruntime_version、ephemeris_mode、ephemeris_data_version、calc_flags、delta_t_seconds
- positions: 10天体の黄経・黄緯（度）、距離（AU）、各速度（度/日またはAU/日）、Cが返したreturn_flag
- houses: ASC・MC・12ハウスカスプ（度、配列先頭が第1ハウス）、Cのreturn_flag
- `k08_deployment_gate: PENDING`

内部でMoshier等に切り替わった場合、return flag不一致、警告や非有限値は該当天体だけをUNAVAILABLEにし、その数値を返しません。他の正常な天体はVALIDとして残します。positionsは常に10天体の順序を保ち、失敗項目にはstatus・error・取得できたreturn_flagを記録します。
Placidus失敗時はhouses.statusをUNAVAILABLE_PLACIDUSとし、代替カスプを返しません。正常な天体は保持します。ASC/MCの独立検証は未実装のため、ハウス失敗時は両方をUNAVAILABLEとして留保します。

正常な項目が一つでもあればHTTP 200、result_status: PARTIAL、runtime_status: PARTIAL_RESULT、calculation_performed: trueで返します。すべて正常ならCOMPLETE/CALCULATEDです。HTTP 200だけで完全な出生図と判断せず、各項目のstatusを確認してください。
全項目が利用不可なら422、result_status: UNAVAILABLE、calculation_performed: falseです。このfalseは利用可能な結果がないという意味で、拒否検出の内部計算は行われる場合があります。
return flags欠落、未知の実行例外・WASM trapなどはGLOBAL_RUNTIME_FAILとして全結果を破棄します。版不一致も全体停止です。本番承認はすべての応答でPENDINGのままです。

| 応答 | 状況 |
| --- | --- |
| 400 | JSON・入力・座標不正、未知の項目 |
| 413 / 415 | 本文過大 / Content-Type非対応 |
| 422 | 対応日付範囲外、全項目が利用不可 |
| 503 | 初期化失敗、実行版不一致、異常なエンジン出力 |

入力拒否・実行不可時はLOCAL_HOLD、基盤の信頼性不良はGLOBAL_RUNTIME_FAILと安定したerrorコードを返します。入力値や内部エラー全文をログ出力・レスポンスへ転載しません。
GET / と GET /health は200、既知パスのOPTIONSは204、非対応メソッドは405、不明パスは404。CORSは公開API用の `*` です。

## 状態分離とデータ

1リクエストごとにWASMインスタンスを生成し、暦ファイルを配置して計算し、finallyでdisposeします。天体設定や入力を別リクエストと共有しません。
3ファイルはビルドに同梱され、計算時の外部通信はありません。対応範囲はデータ全体より狭く制限しています。
CPU・メモリ・高負荷時の実環境測定は未実施です。ローカルの成功からFreeプランでの本番運用可否を断定しません。

## 公開前の残作業

K08正本の要件照合と正式I/O、時刻変換・監査情報、実環境のCPU/メモリ・回帰試験、ライセンスと対応ソース公開の最終確認が必要です。
次の公開工程で対象アカウントとWorkerを確認してから `npm run deploy` を使います。同名の既存Workerを更新するため、現段階では実行していません。自動デプロイ用Actionsは含みません。

## ライセンス・証跡

プロジェクトは [AGPL-3.0-only](LICENSE)。依存の権利表示・改変箇所は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、初期互換性検証は [docs/WASM_COMPATIBILITY.md](docs/WASM_COMPATIBILITY.md) を参照してください。
稼働確認応答のsource_urlはこのリポジトリです。派生版は実際の対応ソースのURLへ更新してください。
