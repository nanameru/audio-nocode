# 🎵 Audio Processing Studio

レゴブロック式音声処理システム - ドラッグ&ドロップで音声処理パイプラインを構築できるNext.jsアプリケーション

## ✨ 特徴

- **🧩 モジュラー設計**: 音声処理の各ステップを独立したモジュールとして実装
- **🎨 ビジュアルエディター**: ドラッグ&ドロップでパイプラインを直感的に構築
- **⚡ リアルタイム実行**: パイプラインの実行状況をリアルタイムで監視
- **🔧 パラメータ調整**: 各モジュールのパラメータを動的に調整
- **📊 システム監視**: メモリ、CPU、GPU使用率の監視
- **💾 パイプライン保存**: 作成したパイプラインの保存・読み込み

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   FastAPI       │    │   Python        │
│   Frontend      │◄──►│   Backend       │◄──►│   Processing    │
│                 │    │                 │    │   Modules       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 セットアップ

### 前提条件

- Node.js 18+ 
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd audio-processing-studio

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

アプリケーションは `http://localhost:3000` で利用できます。

## 📦 利用可能なモジュール

### 📥 Input Modules
- **File Upload**: ローカルファイルからの音声読み込み
- **Microphone**: マイクからのリアルタイム録音
- **URL Import**: URLからの音声ダウンロード

### 🎵 Processing Modules
- **VAD (Voice Activity Detection)**: 音声区間検出
- **Noise Suppression**: ノイズ除去
- **Dereverberation**: 残響除去
- **Beamforming**: 空間音声処理
- **Normalization**: 音量正規化
- **ASR (Automatic Speech Recognition)**: 音声認識
- **Speaker Diarization**: 話者分離

### 📤 Output Modules
- **File Output**: 音声ファイル出力
- **JSON Output**: 結果のJSON出力
- **Text Output**: テキスト形式での出力

## 🎯 使用方法

1. **モジュール追加**: 左側のライブラリからキャンバスにモジュールをドラッグ
2. **接続作成**: モジュール間を線で接続してデータフローを定義
3. **パラメータ設定**: 右側のプロパティパネルでモジュールの設定を調整
4. **実行**: ヘッダーの「Execute」ボタンでパイプラインを実行
5. **監視**: 下部のモニターで実行状況を確認

## 🛠️ 技術スタック

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Headless UI, Lucide React
- **Pipeline Editor**: React Flow
- **Animation**: Framer Motion

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
├── components/             # Reactコンポーネント
│   ├── layout/            # レイアウトコンポーネント
│   ├── modules/           # モジュール関連
│   ├── pipeline/          # パイプラインエディター
│   ├── properties/        # プロパティパネル
│   └── monitor/           # 実行監視
├── data/                  # モジュール定義データ
├── lib/                   # ユーティリティ関数
├── store/                 # 状態管理
└── types/                 # TypeScript型定義
```

## 🔧 開発

### 新しいモジュールの追加

1. `src/data/modules.ts` にモジュール定義を追加
2. 必要に応じてパラメータ型を `src/types/pipeline.ts` に定義
3. バックエンドに対応する処理ロジックを実装

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果の確認
npm start
```

### リンター・フォーマッター

```bash
# ESLint実行
npm run lint

# 自動修正
npm run lint -- --fix
```

## 🤝 コントリビューション

1. フォークを作成
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- [React Flow](https://reactflow.dev/) - パイプラインエディターのベース
- [Tailwind CSS](https://tailwindcss.com/) - スタイリング
- [Zustand](https://github.com/pmndrs/zustand) - 状態管理
- [Lucide React](https://lucide.dev/) - アイコン