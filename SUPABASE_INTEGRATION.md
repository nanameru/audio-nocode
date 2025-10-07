# Supabase統合ガイド

このドキュメントでは、Audio Processing StudioでSupabaseを使用する方法を説明します。

## 📊 概要

Supabaseは以下のデータを管理します：

- **ワークフロー定義** - パイプラインの構成（モジュール、接続）
- **音声ファイル** - アップロードされた音声ファイルのメタデータ
- **実行履歴** - ワークフローの実行記録
- **実行ログ** - パイプライン実行時の詳細なログ
- **実行結果** - モジュールの処理結果（話者分離結果など）

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Project name**: `audio-processing-studio`
   - **Database Password**: 強力なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)` 推奨
4. 「Create new project」をクリック（数分かかります）

### 2. データベーススキーマの適用

1. Supabaseダッシュボードで **SQL Editor** を開く
2. 「New query」をクリック
3. `db/migrations/001_initial_schema.sql` の内容をコピー&ペースト
4. 「Run」をクリックして実行
5. 同様に `db/migrations/002_add_files_and_executions.sql` も実行

### 3. APIキーの取得

1. Supabaseダッシュボードで **Settings** → **API** を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# API URL (既存)
NEXT_PUBLIC_API_URL=https://audio-processing-api-576239773901.us-central1.run.app

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ 重要**: `SUPABASE_SERVICE_ROLE_KEY`は絶対にGitにコミットしないでください！

## 📋 使用方法

### ワークフローの保存

1. パイプラインキャンバスでワークフローを作成
2. ヘッダーの「保存」ボタンをクリック（既存の更新）
3. または「名前を付けて保存」で新規保存

### ワークフローの読み込み

1. ヘッダーの「読み込み」ボタンをクリック
2. ワークフロー一覧から選択
3. パイプラインキャンバスに読み込まれます

### 実行履歴の確認

実行時に以下のデータが自動的にSupabaseに保存されます：

- **実行開始/完了時刻**
- **実行ステータス** (running, completed, failed)
- **実行ログ** (各ステップの詳細)
- **音声ファイルのメタデータ**
- **処理結果** (話者数、セグメント数、結果ファイルURI)

これらのデータはSupabaseダッシュボードの **Table Editor** から確認できます。

## 🔍 データ構造

### workflows テーブル

```typescript
{
  id: string;              // UUID
  name: string;            // ワークフロー名
  description: string;     // 説明
  pipeline_data: {         // パイプライン設定
    modules: [...],        // モジュール一覧
    connections: [...]     // 接続情報
  };
  created_at: timestamp;
  updated_at: timestamp;
}
```

### workflow_executions テーブル

```typescript
{
  id: string;              // UUID
  workflow_id: string;     // ワークフローID
  audio_file_id: string;   // 音声ファイルID
  status: string;          // pending/running/completed/failed
  started_at: timestamp;
  completed_at: timestamp;
  total_duration_ms: number;
  error_message: string;
}
```

### execution_logs テーブル

```typescript
{
  id: string;              // UUID
  workflow_id: string;
  workflow_execution_id: string;
  level: string;           // info/success/warning/error
  message: string;
  details: string;
  module_name: string;
  timestamp: timestamp;
}
```

### execution_results テーブル

```typescript
{
  id: string;              // UUID
  workflow_id: string;
  module_id: string;
  module_name: string;
  status: string;          // success/error
  output_gs_uri: string;   // GCS結果ファイル
  speaker_count: number;
  segment_count: number;
  execution_time_ms: number;
}
```

## 🔧 トラブルシューティング

### 接続エラー

```
Supabase環境変数が設定されていません
```

→ `.env.local` ファイルが正しく設定されているか確認してください。

### 保存エラー

```
ワークフローの保存に失敗しました
```

→ Supabaseのダッシュボードで以下を確認：
1. テーブルが正しく作成されているか
2. APIキーが有効か
3. Row Level Security (RLS) ポリシーが正しく設定されているか

### データが表示されない

1. Supabaseダッシュボードの **Table Editor** でデータを確認
2. ブラウザのコンソールでエラーを確認
3. 環境変数が正しく読み込まれているか確認

## 📚 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Database Schema](./db/README.md)

## 🎯 次のステップ

- [ ] ワークフロー実行履歴の可視化
- [ ] 実行ログのリアルタイム表示
- [ ] 実行統計ダッシュボード
- [ ] ワークフローのバージョン管理
- [ ] ユーザー認証とRLS有効化

