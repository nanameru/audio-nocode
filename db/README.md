# Audio Processing Studio - Database Schema

このディレクトリには、Supabase用のデータベーススキーマが含まれています。

## 📊 テーブル構成

### **データベース全体の関係:**
```
audio_files (音声ファイル)
    ↓
workflow_executions (実行履歴) ← workflows (ワークフロー定義)
    ↓
├── execution_logs (ログ)
└── execution_results (結果)
```

---

### 1. `workflows` - ワークフロー定義
パイプラインの設定を保存します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| name | TEXT | ワークフロー名 |
| description | TEXT | 説明（オプション） |
| pipeline_data | JSONB | パイプライン全体のJSON（モジュール、接続など） |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

**保存されるJSONの例:**
```json
{
  "modules": [
    {
      "id": "input-1",
      "name": "Audio Input",
      "type": "input",
      "definitionId": "audio-input",
      "position": { "x": 100, "y": 100 },
      "parameters": {}
    },
    {
      "id": "pyannote-1",
      "name": "pyannote 3.1",
      "type": "diarization",
      "definitionId": "pyannote-diarization-3.1",
      "position": { "x": 400, "y": 100 },
      "parameters": {
        "min_speakers": 2,
        "max_speakers": 10
      }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "source": "input-1",
      "target": "pyannote-1",
      "sourcePort": "output",
      "targetPort": "input"
    }
  ]
}
```

---

### 2. `audio_files` - 音声ファイル管理
アップロードされた音声ファイルのメタデータを保存します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| filename | TEXT | GCS上のファイル名 |
| original_filename | TEXT | 元のファイル名 |
| gs_uri | TEXT | GCS URI |
| file_size_bytes | BIGINT | ファイルサイズ（バイト） |
| duration_seconds | DECIMAL | 音声の長さ（秒） |
| format | TEXT | ファイル形式（wav, mp3など） |
| sample_rate | INTEGER | サンプリングレート（Hz） |
| channels | INTEGER | チャンネル数 |
| uploaded_at | TIMESTAMPTZ | アップロード日時 |
| created_at | TIMESTAMPTZ | レコード作成日時 |

**例:**
```sql
INSERT INTO audio_files (
  filename, 
  original_filename, 
  gs_uri, 
  file_size_bytes, 
  duration_seconds, 
  format, 
  sample_rate, 
  channels
)
VALUES (
  'sample_20250106_123456.wav',
  'meeting_recording.wav',
  'gs://audio-processing-studio/uploads/sample_20250106_123456.wav',
  15728640,
  300.5,
  'wav',
  16000,
  1
);
```

---

### 3. `workflow_executions` - ワークフロー実行履歴
ワークフロー全体の実行を1つの単位として管理します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| workflow_id | UUID | ワークフローID（外部キー） |
| audio_file_id | UUID | 音声ファイルID（外部キー） |
| status | TEXT | 実行ステータス |
| started_at | TIMESTAMPTZ | 実行開始日時 |
| completed_at | TIMESTAMPTZ | 実行完了日時 |
| total_duration_ms | INTEGER | 総実行時間（ミリ秒） |
| error_message | TEXT | エラーメッセージ |
| metadata | JSONB | 追加情報 |
| created_at | TIMESTAMPTZ | レコード作成日時 |

**ステータス:** `pending`, `running`, `completed`, `failed`, `cancelled`

**例:**
```typescript
// ワークフロー実行を開始
const { data: execution } = await supabase
  .rpc('start_workflow_execution', {
    p_workflow_id: workflowId,
    p_audio_file_id: audioFileId
  });

// 実行を完了
await supabase
  .rpc('complete_workflow_execution', {
    p_execution_id: execution.id,
    p_status: 'completed'
  });
```

---

### 4. `execution_logs` - 実行ログ
パイプライン実行時のログを保存します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| workflow_id | UUID | ワークフローID（外部キー） |
| level | TEXT | ログレベル（info/success/warning/error） |
| message | TEXT | ログメッセージ |
| details | TEXT | 詳細情報（オプション） |
| module_name | TEXT | 関連モジュール名（オプション） |
| timestamp | TIMESTAMPTZ | ログのタイムスタンプ |
| created_at | TIMESTAMPTZ | レコード作成日時 |

**例:**
```sql
INSERT INTO execution_logs (workflow_id, level, message, module_name, timestamp)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'info',
  'パイプライン実行を開始しました',
  'Audio Input',
  NOW()
);
```

---

### 5. `execution_results` - 実行結果
モジュールの実行結果を保存します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| workflow_id | UUID | ワークフローID（外部キー） |
| module_id | UUID | モジュールインスタンスID |
| module_name | TEXT | モジュール名 |
| status | TEXT | 実行ステータス（success/error） |
| output_gs_uri | TEXT | GCS URI（結果ファイル） |
| speaker_count | INTEGER | 検出された話者数 |
| segment_count | INTEGER | セグメント数 |
| error_message | TEXT | エラーメッセージ（エラー時） |
| execution_time_ms | INTEGER | 実行時間（ミリ秒） |
| result_data | JSONB | 追加の結果データ |
| created_at | TIMESTAMPTZ | レコード作成日時 |

**例:**
```sql
INSERT INTO execution_results (
  workflow_id, 
  module_id, 
  module_name, 
  status, 
  output_gs_uri, 
  speaker_count, 
  segment_count
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'pyannote-1',
  'pyannote 3.1',
  'success',
  'gs://audio-processing-studio/outputs/result.json',
  10,
  848
);
```

---

## 🚀 Supabaseセットアップ手順

### ステップ1: Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名: `audio-processing-studio`
4. データベースパスワードを設定（保管しておく）
5. リージョンを選択（推奨: Tokyo - Northeast Asia）

### ステップ2: スキーマの適用

1. Supabaseダッシュボードを開く
2. 左メニューから **SQL Editor** を選択
3. `db/migrations/001_initial_schema.sql` の内容をコピー
4. SQLエディターに貼り付け
5. **Run** ボタンをクリック

### ステップ3: 接続情報の取得

1. 左メニューから **Settings** → **API** を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### ステップ4: 環境変数の設定

`.env.local`に以下を追加：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 使用例

### ワークフローの保存

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ワークフローを保存
const { data, error } = await supabase
  .from('workflows')
  .insert({
    name: 'My Diarization Workflow',
    description: '話者分離ワークフロー',
    pipeline_data: {
      modules: [...],
      connections: [...]
    }
  })
  .select()
  .single();
```

### 実行ログの追加

```typescript
// ログを追加
await supabase
  .from('execution_logs')
  .insert({
    workflow_id: workflowId,
    level: 'info',
    message: 'Processing started',
    module_name: 'Audio Input',
    timestamp: new Date().toISOString()
  });
```

### 実行結果の保存

```typescript
// 結果を保存
await supabase
  .from('execution_results')
  .insert({
    workflow_id: workflowId,
    module_id: 'pyannote-1',
    module_name: 'pyannote 3.1',
    status: 'success',
    output_gs_uri: 'gs://bucket/output.json',
    speaker_count: 10,
    segment_count: 848
  });
```

### ワークフロー一覧の取得

```typescript
// すべてのワークフローを取得
const { data: workflows } = await supabase
  .from('workflows')
  .select('*')
  .order('updated_at', { ascending: false });
```

### 実行サマリーの取得

```typescript
// サマリービューを使用
const { data: summary } = await supabase
  .from('workflow_execution_summary')
  .select('*');
```

---

## 🔍 便利なクエリ

### 最新のワークフロー10件

```sql
SELECT id, name, description, updated_at
FROM workflows
ORDER BY updated_at DESC
LIMIT 10;
```

### 特定ワークフローの実行履歴

```sql
SELECT 
  er.created_at,
  er.module_name,
  er.status,
  er.speaker_count,
  er.segment_count
FROM execution_results er
WHERE er.workflow_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY er.created_at DESC;
```

### エラーログの確認

```sql
SELECT 
  el.timestamp,
  el.message,
  el.details,
  el.module_name,
  w.name AS workflow_name
FROM execution_logs el
JOIN workflows w ON el.workflow_id = w.id
WHERE el.level = 'error'
ORDER BY el.timestamp DESC
LIMIT 50;
```

---

## 🔐 セキュリティ

現在はRow Level Security (RLS)を無効にしています（ユーザー認証なし）。

将来的にユーザー認証を追加する場合は、`001_initial_schema.sql`のコメントアウトされたRLSポリシーを有効化してください。

---

## 📚 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

