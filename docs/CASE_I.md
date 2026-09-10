# CASE_I 留（station）付近（2026-09-11）

ロンドン固定座標（北緯51.5074、東経-0.1278）、2000-02-21 12:45:00と12:48:00（Europe/London、+00:00、UTC同時刻）の架空入力を使います。公式swetest64の速度符号を用いて同日の符号反転区間を探索し、印字丸めの影響を避けた前後3分の2時点を固定しました。水星参照速度は+0.0001647度/日と-0.0001888度/日です。厳密なゼロ時刻を求めたケースではありません。

入力・期待値はtest/fixtures/case-i-before.jsonとcase-i-after.json、参照出力は対応する-native.txt、生成処理はscripts/prepare-case-i-before.pyとprepare-case-i-after.py。公式swetest64 2.10.03・配布データ0.2.2の別プロセスから10天体黄経・速度、ASC/MC、12カスプを取得しました。引数と実行ファイルSHA-256を記録し、端末固有パスのみ置換。45組のアスペクト成立種類・不成立はnative黄経からPythonで算出します。Worker実装や応答を期待値生成に使わず、通常テストで期待値を再生成しません。

共通照合は黄経0.01度、ASC/MC・カスプ0.05度、速度0.000001度/日、JD差1e-9日未満。速度とJDは開発用条件です。アスペクト成立種類・不成立は完全一致。水星の速度符号、DIRECT/RETROGRADE、正式出力MOTIONを追加確認します。速度絶対値0.001未満の確認はこのfixtureが低速域にあることの検査であり、製品の留判定閾値ではありません。

小さい速度をZERO_SPEEDに丸めず、station_sensitive=nullとNUMERICAL_PRECISION_NOT_ESTABLISHEDを保持することを確認します。速度が厳密にゼロの場合は既存の単体テストで扱い、このnativeケースの期待値にはしません。留判定の数値精度根拠と正式承認は未完了です。

全86テストがローカルWorkers互換環境で成功。CASE_Iの低速域前後の回帰照合は完了ですが、stationの確定認証を意味しません。nativeとWASMは同系統エンジン・同じデータの比較で独立モデル認証ではありません。K02状態はfixtureの申告。本番承認とK19全体の受入は保留し、K09_USAGE_STATUSはLOCAL_BLOCKです。

次はCASE_J（高緯度でのPlacidus失敗）です。
