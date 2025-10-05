-- Audio Processing Studio Database Schema - Phase 1 Enhancement
-- Migration 002: Add audio_files and workflow_executions tables
-- Created: 2025-10-06

-- ============================================================================
-- 1. Audio Files Table - 音声ファイル管理
-- ============================================================================
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  gs_uri TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT,
  duration_seconds DECIMAL(10, 2),
  format TEXT,
  sample_rate INTEGER,
  channels INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audio_files_filename ON audio_files(filename);
CREATE INDEX idx_audio_files_gs_uri ON audio_files(gs_uri);
CREATE INDEX idx_audio_files_uploaded_at ON audio_files(uploaded_at DESC);

-- コメント
COMMENT ON TABLE audio_files IS '音声ファイルのメタデータを保存';
COMMENT ON COLUMN audio_files.filename IS 'GCS上のファイル名';
COMMENT ON COLUMN audio_files.original_filename IS 'ユーザーがアップロードした時の元のファイル名';
COMMENT ON COLUMN audio_files.gs_uri IS 'GCS URI（例: gs://bucket/path/file.wav）';
COMMENT ON COLUMN audio_files.file_size_bytes IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN audio_files.duration_seconds IS '音声の長さ（秒）';
COMMENT ON COLUMN audio_files.format IS 'ファイル形式（wav, mp3, m4a, etc）';
COMMENT ON COLUMN audio_files.sample_rate IS 'サンプリングレート（Hz）';
COMMENT ON COLUMN audio_files.channels IS 'チャンネル数（1=モノラル, 2=ステレオ）';


-- ============================================================================
-- 2. Workflow Executions Table - ワークフロー実行履歴
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  audio_file_id UUID REFERENCES audio_files(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB, -- 追加情報（入力パラメータなど）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_audio_file_id ON workflow_executions(audio_file_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC) WHERE started_at IS NOT NULL;

-- コメント
COMMENT ON TABLE workflow_executions IS 'ワークフロー全体の実行履歴';
COMMENT ON COLUMN workflow_executions.workflow_id IS '実行されたワークフローID';
COMMENT ON COLUMN workflow_executions.audio_file_id IS '処理対象の音声ファイルID';
COMMENT ON COLUMN workflow_executions.status IS '実行ステータス: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN workflow_executions.started_at IS '実行開始日時';
COMMENT ON COLUMN workflow_executions.completed_at IS '実行完了日時';
COMMENT ON COLUMN workflow_executions.total_duration_ms IS '総実行時間（ミリ秒）';
COMMENT ON COLUMN workflow_executions.metadata IS '追加のメタデータ（JSON形式）';


-- ============================================================================
-- 3. Alter Existing Tables - 既存テーブルの拡張
-- ============================================================================

-- execution_logs に workflow_execution_id を追加
ALTER TABLE execution_logs 
  ADD COLUMN IF NOT EXISTS workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow_execution_id 
  ON execution_logs(workflow_execution_id);

COMMENT ON COLUMN execution_logs.workflow_execution_id IS '関連する実行履歴ID（オプション）';


-- execution_results に workflow_execution_id を追加
ALTER TABLE execution_results 
  ADD COLUMN IF NOT EXISTS workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_execution_results_workflow_execution_id 
  ON execution_results(workflow_execution_id);

COMMENT ON COLUMN execution_results.workflow_execution_id IS '関連する実行履歴ID（オプション）';


-- ============================================================================
-- 4. Utility Views - 便利なビュー
-- ============================================================================

-- ワークフロー実行の詳細ビュー（音声ファイル情報を含む）
CREATE OR REPLACE VIEW workflow_execution_details AS
SELECT 
  we.id AS execution_id,
  we.workflow_id,
  w.name AS workflow_name,
  we.audio_file_id,
  af.original_filename,
  af.duration_seconds,
  af.file_size_bytes,
  we.status,
  we.started_at,
  we.completed_at,
  we.total_duration_ms,
  we.error_message,
  we.created_at,
  COUNT(DISTINCT er.id) AS result_count,
  COUNT(DISTINCT CASE WHEN er.status = 'success' THEN er.id END) AS successful_results,
  COUNT(DISTINCT CASE WHEN er.status = 'error' THEN er.id END) AS failed_results
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
LEFT JOIN audio_files af ON we.audio_file_id = af.id
LEFT JOIN execution_results er ON we.id = er.workflow_execution_id
GROUP BY 
  we.id, we.workflow_id, w.name, we.audio_file_id, 
  af.original_filename, af.duration_seconds, af.file_size_bytes,
  we.status, we.started_at, we.completed_at, we.total_duration_ms, 
  we.error_message, we.created_at;

COMMENT ON VIEW workflow_execution_details IS 'ワークフロー実行の詳細情報（音声ファイル情報を含む）';


-- 音声ファイルの使用統計ビュー
CREATE OR REPLACE VIEW audio_file_usage_stats AS
SELECT 
  af.id AS audio_file_id,
  af.original_filename,
  af.duration_seconds,
  af.file_size_bytes,
  af.format,
  af.uploaded_at,
  COUNT(DISTINCT we.id) AS execution_count,
  COUNT(DISTINCT we.workflow_id) AS workflow_count,
  MAX(we.created_at) AS last_used_at,
  COUNT(DISTINCT CASE WHEN we.status = 'completed' THEN we.id END) AS successful_executions,
  COUNT(DISTINCT CASE WHEN we.status = 'failed' THEN we.id END) AS failed_executions
FROM audio_files af
LEFT JOIN workflow_executions we ON af.id = we.audio_file_id
GROUP BY 
  af.id, af.original_filename, af.duration_seconds, 
  af.file_size_bytes, af.format, af.uploaded_at;

COMMENT ON VIEW audio_file_usage_stats IS '音声ファイルの使用統計';


-- 実行中のワークフローを監視するビュー
CREATE OR REPLACE VIEW active_executions AS
SELECT 
  we.id AS execution_id,
  we.workflow_id,
  w.name AS workflow_name,
  we.audio_file_id,
  af.original_filename,
  we.status,
  we.started_at,
  EXTRACT(EPOCH FROM (NOW() - we.started_at))::INTEGER AS elapsed_seconds,
  we.created_at
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
LEFT JOIN audio_files af ON we.audio_file_id = af.id
WHERE we.status IN ('pending', 'running')
ORDER BY we.started_at DESC NULLS LAST;

COMMENT ON VIEW active_executions IS '実行中またはペンディング中のワークフロー';


-- ============================================================================
-- 5. Helper Functions - 便利な関数
-- ============================================================================

-- ワークフロー実行を開始する関数
CREATE OR REPLACE FUNCTION start_workflow_execution(
  p_workflow_id UUID,
  p_audio_file_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_execution_id UUID;
BEGIN
  INSERT INTO workflow_executions (
    workflow_id,
    audio_file_id,
    status,
    started_at,
    metadata
  ) VALUES (
    p_workflow_id,
    p_audio_file_id,
    'running',
    NOW(),
    p_metadata
  )
  RETURNING id INTO v_execution_id;
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_workflow_execution IS 'ワークフロー実行を開始し、実行IDを返す';


-- ワークフロー実行を完了する関数
CREATE OR REPLACE FUNCTION complete_workflow_execution(
  p_execution_id UUID,
  p_status TEXT DEFAULT 'completed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_duration_ms INTEGER;
BEGIN
  -- 開始時刻を取得
  SELECT started_at INTO v_started_at
  FROM workflow_executions
  WHERE id = p_execution_id;
  
  -- 実行時間を計算
  IF v_started_at IS NOT NULL THEN
    v_duration_ms := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER * 1000;
  END IF;
  
  -- 実行を完了
  UPDATE workflow_executions
  SET 
    status = p_status,
    completed_at = NOW(),
    total_duration_ms = v_duration_ms,
    error_message = p_error_message
  WHERE id = p_execution_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_workflow_execution IS 'ワークフロー実行を完了する';


-- ============================================================================
-- 6. Triggers - トリガー
-- ============================================================================

-- 実行完了時に自動的に統計を更新するトリガー（将来の拡張用）
-- CREATE TRIGGER update_workflow_stats_on_execution_complete
--   AFTER UPDATE ON workflow_executions
--   FOR EACH ROW
--   WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
--   EXECUTE FUNCTION update_workflow_statistics();


-- ============================================================================
-- 7. Sample Data (開発用) - オプション
-- ============================================================================

-- サンプル音声ファイルを挿入（開発時のみ）
-- INSERT INTO audio_files (
--   filename, 
--   original_filename, 
--   gs_uri, 
--   file_size_bytes, 
--   duration_seconds, 
--   format, 
--   sample_rate, 
--   channels
-- ) VALUES (
--   'sample_20250106_123456.wav',
--   'meeting_recording.wav',
--   'gs://audio-processing-studio/uploads/sample_20250106_123456.wav',
--   15728640,
--   300.5,
--   'wav',
--   16000,
--   1
-- );

