# K19固定テスト・監査照合（2026-09-10）

対象はK08第132〜139節とK19第45〜47節。これは開発時の対応表であり、K19受入合格の証明ではありません。資料で指定されているのはケースの分類であり、具体的な出生入力と全expected値は別途固定する必要があります。

| 固定ケース | 現在の証拠 | 残作業 |
| --- | --- | --- |
| A 北半球・DSTなし | K02固定入力、10天体黄経・速度、ASC/MC、12カスプ、45組の成立状態をnative参照で照合。ローカル成功 | 本番環境受入・最終承認 |
| B 北半球・DSTあり | ロンドン2000-07-01のK02入力・全参照値を固定、冬時間offset誤用拒否。ローカル成功 | 本番環境受入・最終承認 |
| C 南半球 | 座標の入力範囲検査 | 南半球出生図と全expected値 |
| D 西経 | 座標の入力範囲検査 | 西経出生図と全expected値 |
| E 歴史的offset変更 | 歴史的秒offset等の時刻検査 | 歴史的変更前後のK02接続と全expected値 |
| F 太陽サイン境界 | 2000年春分、nativeとの時刻区間照合 | 境界両側の全出生図expected値 |
| G 月サイン境界 | 汎用サイン境界探索のテスト | 実際の月の境界入力・全expected値 |
| H 水星逆行付近 | 速度符号から順行・逆行を判定するテスト | 実際の水星逆行付近の固定入力・全expected値 |
| I station付近 | ZERO_SPEEDを区別、感度は未認証 | 実際のstation近傍・数値精度根拠・全expected値 |
| J 高緯度Placidus失敗 | Tromso J2000、正常天体保持・P/E角度条件付き照合 | failureを含む完全な固定expected契約 |
| K 0度牡羊近辺 | 春分黄経、0/360度の境界検査 | Fとは目的を区別した固定expected契約 |
| L 日付変更線付近 | Apiaの欠落日、現地日とUTC日跨ぎ検査 | 日付変更線近傍の出生図・全expected値 |

固定expectedには10天体の黄経・速度、ASC、MC、12カスプ、主要アスペクトが必要です。資料の許容差は黄経0.01度、ASC/MCとカスプ0.05度、アスペクトは黄経から再計算して完全一致。速度の許容差はこの節に数値指定がないため、根拠を別途記録します。実装自身の結果をそのまま期待値にして合格扱いにはしません。

| Deployment Gate | 現状 |
| --- | --- |
| SWISS_EPHEMERIS_DEPLOYMENT_TEST | ローカルworkerdで実WASM検証あり。本番環境受入は未実施 |
| RETURN_FLAG_TEST | 必須フラグ欠落・異常・未知例外を検査 |
| EPHEMERIS_MODE_RETURNED_TEST | Moshier等へのfallbackを拒否。全モード組合せの固定監査は未完了 |
| EPHEMERIS_MANIFEST_TEST | ビルド時の依存版・データハッシュ確認あり。正式承認は未完了 |
| LICENSE_GATE_TEST | 表示とライセンスファイルあり。最終確認・承認は未完了 |
| K02_UTC_CONTRACT_TEST | 日時算術整合・固定TZDB・不確実性ゲートを検証。一部履歴・範囲条件は留保 |
| K02_GEO_CONTRACT_TEST | 座標不明時は天体を残しハウスを留保。全精度区分の受入は未完了 |
| PLACIDUS_FAILURE_TEST | 高緯度失敗時に代替カスプを不採用、正常天体を保持 |
| FIXED_NATAL_REGRESSION_SUITE | 上表A〜Lの完全な固定スイートは未完了 |
| VERSION_UPDATE_REGRESSION_GATE | 現版固定・不一致拒否あり。更新時の全受入工程は未完了 |

今回の修正は監査の構造検査です。TEN_PLANETS_VALIDは既知の10天体が各1件であることも検査し、PLANET_HOUSES_VALIDは所属番号1〜12の整数も確認します。ASPECT_45_PAIRS_VALIDは既知天体の異なる2体からなる45組が重複なく揃うことを確認します。順序反転は同一組として扱います。数値・オーブ・時間安定性の正式監査とは別です。

未承認ゲートはfalse、未評価はnull、総合はFAIL、K09_USAGE_STATUSはLOCAL_BLOCKを維持します。他占術の継続制御はこのRuntime外のため、今回実装済みとは扱いません。

CASE_Aの入力・native参照値・取得条件・許容差・ローカル実行結果を固定しました。詳細はCASE_A.mdを参照。CASE_Bも固定参照値でローカル照合済みです（CASE_B.md）。次工程はCASE_C（南半球）です。
