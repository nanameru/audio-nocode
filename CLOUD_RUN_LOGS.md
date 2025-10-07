# Cloud Runログの確認方法

## 🔍 完全なログを確認

### Google Cloud Consoleで確認
1. https://console.cloud.google.com/run を開く
2. `audio-processing-api` サービスを選択
3. **「ログ」** タブをクリック
4. 最新のリクエストを探す
5. ログの最後まで確認

### 成功の確認ポイント

#### ✅ 成功している場合
```
Diarization completed
Speaker count: X
Segment count: Y
Output saved to: gs://bucket/path/result.json
Status code: 200
```

#### ❌ 失敗している場合
```
ERROR: ...
Exception: ...
Status code: 500/400
```

---

## 📊 警告メッセージについて

### 現在表示されている警告の意味

```
UserWarning: torchaudio._backend.utils.info has been deprecated
```

**これは問題ではありません**：
- PyTorchのライブラリが将来的に変更される予定という通知
- 現在のバージョンでは正常に動作する
- 2.9リリース（将来）で削除される予定

### 警告を非表示にする方法（オプション）

不要な警告を非表示にしたい場合、`api/app/main.py` に以下を追加：

```python
import warnings

# torchaudioの非推奨警告を抑制
warnings.filterwarnings('ignore', category=UserWarning, module='torchaudio')
```

ただし、**処理には影響がないので放置しても問題ありません**。

---

## 🎯 次のステップ

1. **ログの最後まで確認**
   - エラーがなければ成功

2. **フロントエンドでテスト**
   - 実際に音声をアップロードして実行

3. **結果が返ってくればOK**
   - 警告は無視してOK

---

## 💡 ヒント

警告が多くて見づらい場合は、Cloud Runログで「重大度」フィルタを使用：
- **エラーのみ表示**: 重大度 = ERROR
- **警告を除外**: 重大度 ≠ WARNING

