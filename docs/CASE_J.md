# CASE_J 高緯度Placidus失敗（2026-09-11）

トロムソ固定座標（北緯69.6492、東経18.9553）、2000-01-01 13:00:00（Europe/Oslo、+01:00、UTC 12:00:00、JD2451545）の架空入力です。公式swetest64 2.10.03はPlacidus失敗とPorphyry代替を明示します。

固定期待値はtest/fixtures/case-j.json、rawはcase-j-native.txt、生成処理はscripts/prepare-case-j.py。nativeが印字した代替カスプはrejected_native_cuspsに証跡として隔離し、期待する正式cuspsはnullとします。正常な10天体黄経・速度、ASC/MC、45組のアスペクト成立種類・不成立を固定します。アスペクトはnative黄経から別のPython処理で算出し、Worker応答を期待値生成に使いません。通常テストで再生成しません。

入力保持、全10天体のVALID・数値・フラグ258、全アスペクトを照合します。house.statusはUNAVAILABLE_PLACIDUS、system=null、返却コード負、fallback_detected=trueを要求。旧出力にカスプを返さず、正式結果の12カスプと天体所属ハウスも採用されないことを確認します。ASC299.0790476度とMC297.3499015度は数値照合しますが、同エンジンP/E照合によるCONDITIONALを維持します。独立エンジンの認証ではありません。

黄経許容差0.01度、ASC/MC0.05度、速度0.000001度/日、JD差1e-9日未満。速度とJDは開発用条件。アスペクト成立種類・不成立は完全一致です。カスプには数値許容差を適用せず、不採用の状態を検査します。参照ツールと配布データ0.2.2、引数・実行ファイルSHA-256を記録し、端末固有パスを置換しています。

ローカルWorkers互換環境で全87テスト成功。正常な結果を保持し、全体はPARTIALです。K02状態はfixtureの申告であり、本番承認・K19全体の受入は未完了。K09_USAGE_STATUSはLOCAL_BLOCKを維持します。高緯度の全地点・全日時の保証ではありません。

次はCASE_K（0度牡羊近辺）です。
