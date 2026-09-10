# K08 Swiss Ephemeris WASM互換性検証

検証日: 2026-09-10

## 判定

**条件付き採用可能。** `@kuntay/swisseph@0.2.2` は無修正では初期化に失敗したが、生成JavaScriptのWASM読み込み部分を修正すると、Cloudflareのローカルworkerdで暦ファイルを使った計算が成功した。本番デプロイ、負荷試験、K08全要件の適合判定は未実施。既存の `/calculate` は引き続き503を返す。

## 候補

| 候補 | 確認結果 |
| --- | --- |
| @kuntay/swisseph 0.2.2 | Swiss Ephemeris 2.10.03。AGPL-3.0-or-later。今回実行検証した候補 |
| sweph-wasm 2.6.9 | npm宣言はAGPL-3.0-or-later。比較候補として調査、実行未検証 |
| swisseph-wasm 0.1.0 | npm宣言はGPL-3.0-or-later。Swiss Ephemeris由来部分との条件整合の追加確認が必要。今回未採用、実行未検証 |

## 実測

- Wrangler 4.130.0、workerd 1.20260908.1、compatibility_date 2026-09-10、nodejs_compatを使用。
- 無修正: HTTP 500。Node向け初期化でパスがundefinedとなり失敗。
- 修正後・暦ファイルなし: 太陽の計算は成功したが `ephemeris: moshier`。これはSwiss暦ファイル利用の成功には数えない。
- 修正後・暦ファイルあり: 44件すべて `ephemeris: swiss`、warningなし。
- 使用データ: `@kuntay/swisseph-data@0.2.2` の sepl_18.se1、semo_18.se1、seas_18.se1。計2,011,836 bytes。
- UTのJD 2415020.5、2451545、2461293.5、2488069.5で、太陽・月・水星〜冥王星・キロンの11天体を計算。
- 東京（緯度35.6762、経度139.6503）、Placidusのハウス計算も4日付で応答成功。ただしハウス数値の独立照合は未実施。
- 暦データ込みdry run: 2681.99 KiB、gzip 2122.32 KiB（約2.07 MiB）。この容量だけで本番の受入やCPU制限への適合は保証しない。

## 公式ネイティブ実行版との照合

aloistr/swissephの `windows/programs/swetest64.exe`（表示バージョン2.10.03）に同一暦ファイルとUTを指定。44件の最大絶対差:

| 項目 | 最大差 |
| --- | --- |
| 黄経（度） | 4.9476511776447296e-8 |
| 黄緯（度） | 4.952658372303631e-8 |
| 距離（AU） | 4.99021268751676e-10 |
| 黄経速度（度/日） | 4.85832220009641e-8 |

比較許容差は角度・角速度1e-6、距離1e-8。全件合格。差は比較用CLIの出力桁による丸め程度。これは同じSwiss Ephemeris版の移植互換性検証であり、天文観測に対する独立した精度保証ではない。

比較コマンド例:

```sh
swetest64.exe -bj2451545 -ut -p0123456789D -fPlbRs -g, -head -eswe -edir<ephe-directory>
```

## 必要な読み込み修正

生成された `wasm/swisseph.mjs` に静的インポートを追加する。

```js
import compiledWasm from './swisseph.wasm';
```

このWorkers専用コピーでは `ENVIRONMENT_IS_NODE` をfalseにし、createWasm内のファイル読み込み・動的コンパイル経路を次へ置換した。

```js
var result = { instance: await WebAssembly.instantiate(compiledWasm, info) };
```

C/WASMバイナリ自体は変更していない。Node専用のmountEphemerisDirectoryは使わず、WranglerのDataモジュールでse1を取り込み、mountEphemerisで仮想FSへ配置する。ファイル配置後に計算を開始する。
本実装ではバージョンとハッシュを固定し、修正対象が変わったらビルドを失敗させる再現可能なパッチか、Workers向け専用ビルドとして管理する。

## 採用条件と次の段階

1. K08の要求する天体・日付範囲・時刻系・ハウス・黄道方式を確認する。今回の44件で全仕様が満たされたとは判断しない。
2. 暦不足や対象範囲外でのMoshierへの切替を検出し、Swiss暦必須の計算はエラーにする。必要な暦の対応期間端点も試験する。
3. リクエスト間のsidereal/topocentric等の状態混入を防止する。今回の試験はリクエストごとにインスタンスを作成・disposeした。
4. ステージングで初期化時間・CPU・メモリ・同時実行を測る。ローカル実行の成功を本番検証済みとは扱わない。
5. AGPLのLICENSE/NOTICE、上流ソース、WASMビルド手順、変更内容、暦データの由来を対応ソースとともに管理する。

コアとデータの配布物はいずれもAGPL-3.0-or-laterと宣言されている。今回のAGPL v3方針で進める候補となる。商用ライセンスをこのラッパーから取得できるという意味ではない。公開時の具体的な対応ソースの範囲は構成確定時に確認する。

## 代替案

このパッチ方式を安定運用できなければ、上流CからWorkers向けWASMを再ビルドする。それでもCPU・メモリ等の制約を満たせない場合は、別サーバー／コンテナのSwiss EphemerisをWorkerから呼ぶ。無断で別エンジンに置換しない。

## 検証資材のSHA-256

| 資材 | SHA-256 |
| --- | --- |
| core 0.2.2 npm tarball | C4172E0D234BE19CA141BE9596A7A8E54BDCF6493B3D3E7508B97DACA7420698 |
| data 0.2.2 npm tarball | EB67C1D510CFD383E3156587F7CD7BF70E3C56AEE91CF86F20307AA81AB7DC49 |
| swisseph.wasm | DC1B271513CFD971878BDA7019AE0A48190ABB8648DC90ADDB9ADA75ABA1628B |
| swetest64.exe | C44D29554927AD1BA44196B5B274904F012DACAA3B4797F7F4AE6A48618FC1C5 |

## 出典

- [候補の上流コード・ライセンス](https://github.com/kuntayerkus/swisseph-wasm)
- [Swiss Ephemeris公式](https://www.astro.com/swisseph/)
- [公式ネイティブ比較実行版](https://github.com/aloistr/swisseph/tree/master/windows/programs)
- [CloudflareのWASM読み込み方式](https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/)
- [Cloudflareの制限](https://developers.cloudflare.com/workers/platform/limits/)

