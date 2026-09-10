# uranai-ai-k08-runtime

## 固定タイムゾーンデータへの移行（現在の仕様）

時刻照合はmoment-timezone 0.6.3 / moment 2.30.1の全期間データ、TZDB 2026cへ固定しました。ビルド時に版とdata/packed/latest.jsonのSHA-256 `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81` を検査します。後述のIntl照合・データ版未取得の記録は旧方式の経緯です。process.versionsの値は診断情報としてのみ残し、時刻判定には使いません。

K02のTZDB_VERSIONが2026cと異なる場合はK02_TZDB_VERSION_MISMATCHで留保します。呼出側の版名だけを書き換えて通過させないでください。実際のK02使用データと版をそろえて再検証する必要があります。入力例の2026cはテスト用の申告で、K02の出典認証の証拠ではありません。

単一時点では現地日時に対応するUTC候補を遷移データから列挙し、0件・複数件・UTC不一致を局所停止します。Momentの自動補正パーサーは使いません。範囲APIは同じ固定データでUTC両端を現地時刻へ戻して照合し、単一offsetを範囲全体に流用しません。K02正本値の修正・置換はしません。

timezone_auditにvalidation_data_version/source/sha256/comparison/integrityを追加しました。配布データの版・ハッシュ確認と、K02出典の認証は別です。K02出典、全地域の歴史精度、K19承認が未完了のためproduction_eligible=false、本番ゲートPENDINGを維持します。

全60テストと統合ビルドが成功。統合バンドルはgzip 2205.76 KiB。npmの実行用依存監査は0件、開発用依存（sharpを経由するminiflare/wrangler）にはhighの報告3件があり、公開前の開発環境確認事項です。自動の強制更新は行っていません。全試験には通常時刻・版違い・曖昧時刻・存在しない日・歴史的な秒単位offsetを含みます。

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

機械用の暫定表現として、緯度・経度は数値またはnull、残りは文字列またはnull。すべてのキーを含め、不明値はnullとします。UTCは `YYYY-MM-DDTHH:mm:ss[.SSS]Z`、うるう秒表記・不正日付・24時は拒否。offsetは元の文字列を保存し、日時の整合性検査にだけ使用して、K02のUTCを別の時差で置換しません。

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
Placidus失敗時はhouses.statusをUNAVAILABLE_PLACIDUSとし、代替カスプを返しません。正常な天体は保持します。ASC/MCは下記の条件付き照合に一致した項目だけを保持します。

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

### 単一時点の天体所属ハウス

Placidusが正常な場合、swe_house_posへARMC・地理緯度・真黄道傾斜角・天体黄経・黄緯を渡します。house_positionは1以上13未満の連続値、houseはその整数部（1〜12）です。単純なカスプ黄経の大小比較で代用しません。正常天体にはhouse_status=VALID、失敗時はhouse=null / UNAVAILABLEと理由を返します。地理不足、Placidus失敗、警告や異常な戻り値でも正常な天体位置を保持します。

東京・JD2451545の10天体を公式swetest64 2.10.03（`-bj2451545 -ut -p0123456789 -fPj -g, -head -eswe -house139.6503,35.6762,P`、同じ暦データ）と照合し、house_position差1e-6未満を確認しました。全46テストとビルドが成功しています。全地域のK19回帰群は未完了です。カスプ感度は以下の黄経距離方式で判定し、範囲内の所属安定性は未確定です。本番承認はPENDINGです。

### 単一時点のサイン・運行方向

`/calculate` と `/calculate/k02` の正常な天体に、sign（英名）、sign_name（日本語）、sign_index（牡羊座=0）、sign_degree、sign_boundary_distance、sign_boundary_sensitive、motionを追加します。黄経は0以上360未満に正規化し、変更時だけraw_longitudeに元値を残します。既に範囲内の黄経はそのまま保持します。サインと境界判定は表示丸め前に行い、境界距離0.1度以下を感度ありとします。

速度が負ならRETROGRADE、正ならDIRECT、厳密にゼロならZERO_SPEEDです。station_sensitiveはnull、station_statusはNUMERICAL_PRECISION_NOT_ESTABLISHEDとし、任意の微小速度閾値で留を断定しません。太陽・月のmotionも計算値として保持しますが、一般的な惑星逆行の解釈を適用するものではありません。

UNAVAILABLE天体には派生値を追加しません。時刻範囲APIには代表時刻のサインを入れません。今回追加後、全43テストとビルドが成功しました。本番承認はPENDINGです。

### 単一時点のアスペクト

`/calculate` と `/calculate/k02` は `aspects` を追加で返します。K08第93〜102節に従い、10天体の重複・自己組を除く45組を固定順に評価します。範囲APIには単一時点の結果を流用しません。

| 種類 | 角度 | 固定許容幅 |
| --- | --- | --- |
| CONJUNCTION | 0° | 8° |
| SEXTILE | 60° | 5° |
| SQUARE | 90° | 7° |
| TRINE | 120° | 7° |
| OPPOSITION | 180° | 8° |

最小角距離からのずれdeltaが許容幅以下ならFORMED、正常に計算できて不成立ならNOT_FORMED、依存天体の計算不可はUNAVAILABLEです。成立時は `exactness_ratio = clamp(1 - delta / orb, 0, 1)`、0.75以上TIGHT、0.40以上MODERATE、それ未満WIDEを返します。判定前の丸めや天体別の許容幅変更はしません。角度計算用に黄経を正規化しますが、元の天体結果を改変しません。

1天体の失敗は関連9組だけに影響し、他の36組を保持します。NOT_FORMEDとUNAVAILABLEは区別してください。applying/separatingはINACTIVEです。scopeはSINGLE_INSTANTで、出生時刻の精度が分単位の場合も範囲全体の成立を保証しません。本番承認はPENDINGのままです。今回の追加後、全34テストが通過しました。

### 明示UTC範囲の予備検査

v2で範囲の整合性検査を追加し、v3で概算時刻の保存と日付をまたぐ明示範囲を追加しました。旧v1の任意のUTC範囲は受理されない場合があります。UTCの両端は秒単位で、終了を含みます。

| TIME_PRECISION | 入力条件 |
| --- | --- |
| UNKNOWN | NORMALIZED_BIRTH_TIME / LOCAL_CIVIL_DATETIME / UTC_DATETIMEはnull。出生地の当日00:00:00〜23:59:59に両端が一致すること。 |
| HOUR | この追加APIのNORMALIZED_BIRTH_TIMEは時だけの2桁文字列（例 `14`）。LOCAL_CIVIL_DATETIME / UTC_DATETIMEはnull。その時の00分00秒〜59分59秒と一致し、UTC幅が3599秒であること。 |
| APPROXIMATE | UTC_DATETIMEはnull。概算時刻欄は保持可能（下記参照）。外側に `local_range: {start_local: "2000-01-01T13:30:00", end_local: "2000-01-01T14:30:00"}` を明示。UTC両端を出生地時刻に戻した値と一致すること。 |

HOURの2桁表現とlocal_rangeは追加APIの取り決めであり、K02正本自体の機械形式を確定するものではありません。APPROXIMATEは明示された日付付き範囲なら日付をまたいで受け付けます。UNKNOWNは夏時間の23時間・25時間の日に対応しますが、現地の午前0時が存在しない歴史的な日などは別途扱いが必要です。曖昧時刻の判定はK02のLOCAL_TIME_STATUSに依存し、この検査だけで再認証しません。

矛盾は422で拒否し、天体計算に進めません。受理時も `range_consistency_status: CONDITIONAL` と、版照合未完了の制限を返します。元の入力値を訂正・補完しません。

`POST /calculate/k02/range` は `{ "k02": <正本19項目>, "start_utc": <UTC文字列>, "end_utc": <UTC文字列> }` を受け取ります。これは `K08_EXPLICIT_UTC_RANGE_v3` という追加の入出力形式であり、K02正本19項目の変更ではありません。TIME_PRECISIONはHOUR/APPROXIMATE/UNKNOWNのみ。両端は通常APIと同じ厳密なUTC形式・1900〜2099年、開始より終了が後、最大26時間です。範囲は両端を含み、切り詰めません。

呼出元が確認済みの範囲を明示してください。Runtimeは正午・午前0時・概算幅を補いません。現地日付・精度・UTC両端の対応を実行環境のIntlで検査します。K02のTZDB_VERSIONとの版一致は未確認のため、正式な時間範囲監査の代替にはなりません。曖昧な現地時刻、未確認タイムゾーン、受理不可の監査状態は停止します。元の入力はinput_echoに保存します。

最大5分間隔（最大313点）で10天体を検査します。observed_sign_indicesは牡羊座=0〜魚座=11。複数サインを観測した天体だけSIGN_TIME_DEPENDENT=true、SIGN_STABLE_WITHOUT_TIME=falseです。サンプルが一致しても間の変化を否定できないため、両フラグはnull、status=CONDITIONALとします。1点でも失敗した天体はUNAVAILABLEですが、複数サインを既に観測した場合はTIME_DEPENDENTを保持します。failed_sample_countで欠落を確認できます。他の正常天体は残します。

各天体の `transition_brackets` に、観測できたサイン切り替わりを挟むUTC区間を返します。異なる隣接サインの間を二分探索し、区間幅を1秒以内に絞ります。from_sign_index / to_sign_index、境界黄経、DIRECT / RETROGRADE、両端黄経を付けます。0度をまたぐ場合にも対応します。5分格子の両端で黄経速度の符号が反転した場合は速度ゼロ付近を探して区間を分割し、往復の切り替わりを調べます。

失敗点をまたいで境界を作りません。失敗または探索上限到達は `boundary_search_status: INCOMPLETE` と `unresolved_interval_count` に記録し、取得済みの境界や他の正常天体を保持します。初期格子は `sample_count`、追加探索を含む実評価点数は `evaluated_sample_count` です。リクエストごとの上限は2048点で、上限到達時は `search_budget_exhausted: true`。これは実環境のCPU時間制限への適合保証ではありません。

1秒は数値探索の区間幅で、入力時刻・時系変換・天文モデルの絶対精度ではありません。UTC文字列はミリ秒に丸めます。格子間に隠れた複数の折り返しや境界への接触を完全検出したとは断定せず、`all_transitions_certified` は常にfalseです。`OBSERVED_TRANSITIONS_REFINED` も全境界の網羅を意味しません。SIGN_STABLE_WITHOUT_TIME=trueは返しません。

代表時刻の出生図を返しません。ASC・MC・ハウスの範囲判定は未実装です。アスペクトは下記の予備検査に対応しています。範囲応答はCOMPLETEにならず、本番承認もPENDINGです。24時間のローカルWorkers実行、標準実行版との太陽境界照合、逆行・0度通過・折り返し・失敗・探索上限を含む31テストを通過しました。

1リクエストごとにWASMインスタンスを生成し、暦ファイルを配置して計算し、finallyでdisposeします。天体設定や入力を別リクエストと共有しません。
3ファイルはビルドに同梱され、計算時の外部通信はありません。対応範囲はデータ全体より狭く制限しています。
CPU・メモリ・高負荷時の実環境測定は未実施です。ローカルの成功からFreeプランでの本番運用可否を断定しません。

## 公開前の残作業

### アスペクトの時間範囲予備検査

範囲APIの `aspects.scope: EXPLICIT_UTC_RANGE` は、5分以内の格子点とサイン境界探索で実際に評価した追加点を利用し、全45組を検査します。評価点を共有し、観測した状態変化には追加の二分探索を行い、時刻順に状態を集計します。`observed_states` は成立した種類名またはNOT_FORMEDと、その状態を最初・最後に観測したUTC、観測点数です。これらの時刻は成立開始・終了時刻ではありません。

成立→不成立、または種類変更を観測した組はTIME_DEPENDENT、STABLE_WITHOUT_TIME=falseです。観測点が一致した組はCONDITIONAL、STABLE_WITHOUT_TIME=nullのままです。欠落点がある組はUNAVAILABLEとしますが、既に変化を観測した場合はTIME_DEPENDENTを保持し、failed_sample_countも返します。失敗をNOT_FORMEDとして数えません。他の正常な組を保持します。

観測点間の短い変化や全境界の網羅性は保証しません。観測した変化を挟む区間を二分探索し、1秒以内に絞った結果を各組のtransition_bracketsに返します。from_state / to_stateは成立種類名またはNOT_FORMED、両端の角距離も記録します。幅は数値探索の精度であり、出生時刻や天文モデルの絶対精度ではありません。初期観測点の間に隠れた往復変化は見逃す可能性があります。失敗点をまたいで境界を作らず、INCOMPLETEと未解決区間数を返します。全体の2048評価点上限をサイン探索と共有し、取得済みの正常結果を保持します。applying/separatingはINACTIVE、本番承認はPENDINGです。今回の追加後、全40テストが通過しました。

K08正本の要件照合と正式I/O、時刻変換・監査情報、実環境のCPU/メモリ・回帰試験、ライセンスと対応ソース公開の最終確認が必要です。
次の公開工程で対象アカウントとWorkerを確認してから `npm run deploy` を使います。同名の既存Workerを更新するため、現段階では実行していません。自動デプロイ用Actionsは含みません。

## ライセンス・証跡

プロジェクトは [AGPL-3.0-only](LICENSE)。依存の権利表示・改変箇所は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、初期互換性検証は [docs/WASM_COMPATIBILITY.md](docs/WASM_COMPATIBILITY.md) を参照してください。
稼働確認応答のsource_urlはこのリポジトリです。派生版は実際の対応ソースのURLへ更新してください。

## カスプ近傍の補足判定

正常な単一時点の天体所属ハウスに、12カスプとの最小黄経角距離を追加します。1.0度以下をhouse_cusp_sensitive=trueとし、距離・最寄りのカスプ番号・1度以内のカスプ番号を返します。同距離の候補はすべて保持します。表示丸め前に判定し、0/360度をまたぐ距離にも対応します。

距離方式はMINIMUM_ECLIPTIC_LONGITUDE_SEPARATIONと明示します。これは補足情報であり、黄緯を含むswe_house_posの所属判定や空間的なハウス境界距離と同一ではありません。所属を変更せず、二重所属や隣のハウスの解釈を自動確定しません。K08第74節は距離の具体的方式を規定していないため、正式監査での確認事項として残します。

ハウス・天体の失敗時は感度をnullとし、境界データが欠ける場合もfalseと取り違えません。今回追加後、全49テストとビルドが成功しました。本番承認はPENDINGです。

## 高緯度のASC・MC確認

Placidusが負の返却コードで代替計算になった場合、同じ日時・場所のE方式を角度照合にだけ使います。ASC・MCをそれぞれ比較し、正常な返却コード・警告なし・有限の0以上360未満の角度で、最小角差1e-7度以内ならCONDITIONALとして保持します。一方だけ不一致なら、その項目だけを留保します。緯度±90度は留保します。E方式のカスプと所属ハウスは採用しません。

同じエンジンの計算法間の一致であり、独立エンジンによる認証ではありません。house.statusはUNAVAILABLE_PLACIDUS、systemはnullのままです。基盤のメタデータ破損や未知の例外は全体停止します。

公式swetest64 2.10.03、JD2451545、東経18.9553・北緯69.6492、P/EでASC=299.0790476、MC=297.3499015を確認し、Workers結果と差1e-6度未満で一致しました。全51テストとビルドが成功。本番承認・全高緯度条件の正式監査は未完了です。

## 単一時点の日時整合性

/calculate/k02は、NORMALIZED_BIRTH_DATEとNORMALIZED_BIRTH_TIMEがLOCAL_CIVIL_DATETIMEに一致し、現地日時からUTC_OFFSET_EFFECTIVEを引いた瞬間がUTC_DATETIMEと一致することを確認します。不一致は422で計算前に拒否し、元値を補正しません。

このAPIの表現は日付YYYY-MM-DD、SECOND時刻HH:mm:ss、MINUTE時刻HH:mmまたはHH:mm:00、LOCAL_CIVIL_DATETIMEはYYYY-MM-DDTHH:mm:ssです。offsetは符号付きHH:mmまたはHH:mm:ss（時は00〜23）を受け付けます。分精度に非ゼロ秒は入れられません。秒未満UTCは、秒単位の現地日時と整合しない場合は拒否されます。資料自体の機械型を新たに規定するものではありません。

成功時はtime_consistency_status=ARITHMETICALLY_CONSISTENTと派生値derived_utc_offset_secondsを返します。算術的な一致であり、そのoffsetが地域・年代の正式時刻規則に正しいことやTZDB版の認証ではありません。範囲APIは別の両端整合性検査を使い、単一offsetを全範囲に流用しません。全53テストとビルドが成功。本番承認はPENDINGです。

## 概算時刻を保持する範囲契約v3

APPROXIMATEではNORMALIZED_BIRTH_TIMEにHH:mmまたはHH:mm:ssの概算時刻を残せます。LOCAL_CIVIL_DATETIMEはnullまたは同じ日付・時刻のYYYY-MM-DDTHH:mm:ssです。両方nullの従来入力も受理します。UTC_DATETIMEはnullを維持し、概算中心を確定出生時刻として計算しません。input_echoは元の表現とTIME_PRECISIONを保持します。

日付付きlocal_rangeとUTC両端の一致を確認し、概算中心があれば指定範囲内にあること、中心がなければ出生現地日と範囲が重なることを検査します。許容幅・中点を生成せず、範囲を切り詰めません。最大26時間・対応年・探索上限は従来どおりです。概算中心のタイムゾーン上の曖昧性を新たに認証する機能ではなく、K02の状態と既存のCONDITIONAL制限を引き継ぎます。

v2の正当な入力は引き続き受理しますが、応答range_contractはv3に変わります。呼出側で固定版を検査している場合は更新が必要です。全56テストとビルドが成功。本番承認はPENDINGです。

## タイムゾーン版・出典の監査

K02時点結果・範囲結果とhealthにtimezone_auditを追加しました。K02申告版、実行環境がprocess.versions.tzで報告する版、ICU報告版を分けます。報告値が空ならnullとし、K02申告版・互換日・ビルド用Nodeの版から推測しません。2026-09-10のローカルworkerd検証ではtzとicuは空文字でした。

比較はK02_VERSION_MISSING / RUNTIME_VERSION_UNAVAILABLE / REPORTED_VERSIONS_MATCH / REPORTED_VERSIONS_MISMATCHです。一致もデータ出典の認証ではありません。現在は両側の出典確認false、data_source_artifactとdata_manifest_hashはnull、timezone_certification_status=UNVERIFIED、production_eligible=falseを維持します。IANAのURLは公式参考先であり、実際に使われたデータの出典証明として扱いません。

この変更は証跡の記録であり、新しいタイムゾーンデータの導入や本番承認は行いません。既存の開発用計算は従来の入力ゲートで動作し、版申告の一致だけで制約を解除しません。確認用参考：[IANA Time Zones](https://www.iana.org/time-zones)、[Cloudflare process](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/)。全58テストとビルドが成功。次に、版と配布データを固定できる検証方法を選び、実際の出典・ハッシュ・回帰結果をそろえる必要があります。

## K02向け太陽黄経境界サービス

POST /calculate/solar-boundary はK08_SOLAR_LONGITUDE_BOUNDARY_SERVICE_v1の開発用入口です。必須項目はTARGET_SOLAR_LONGITUDE_DEG（0以上360未満の数値）、SEARCH_START_UTC、SEARCH_END_UTC、TIME_SCALE_REQUIREMENT（現在UTのみ）、K02_VERSION（K02_v2.4_PRODUCTION）。UTCは秒単位のYYYY-MM-DDTHH:mm:ssZ、1900〜2099年、開始より後の終了、最大32日、両端を含みます。座標・出生図・K09解釈は不要です。

最大6時間間隔で太陽を検査し、観測した到達区間が1つの場合に二分探索で0.1秒以内の区間へ絞ります。各計算のSWIEPH・SPEEDフラグ、正の速度、警告・黄経範囲を確認します。戻り値はBOUNDARY_UTC_DATETIME（区間中点の数値推定）、SOLAR_LONGITUDE_AT_BOUNDARY、BOUNDARY_BRACKET_UTC、版・データ識別情報です。CALCULATION_STATUS=CALCULATEDでもCONFIDENCE_STATUS=CONDITIONAL、本番ゲートPENDINGです。0.1秒は探索幅で、絶対UTC精度や全ケースの一意性の認証ではありません。

到達なし、複数候補、採用不可の計算値はUNRESOLVED（HTTP 422）で時刻を返しません。基盤破損は全体停止します。名称・立春区分・月支等の意味はK02の責任で、本APIは付けません。K02専用は論理的な呼出契約であり、現在の開発用APIに呼出元認証は未実装です。本番公開前に実際の接続と時系の受入確認が必要です。

2000-03-20の0度到達を公式swetest64の07:35:14〜07:35:15 UTC参照と照合しました。端点到達・未到達・入力不正・フラグ破損を含む全64テストとビルドが成功しました。
