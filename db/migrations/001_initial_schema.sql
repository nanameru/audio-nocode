-- Audio Processing Studio Database Schema for Supabase
-- Created: 2025-10-06

-- ============================================================================
-- 1. Workflows Table - ワークフロー定義を保存
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pipeline_data JSONB NOT NULL, -- パイプライン全体のJSON（モジュール、接続など）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_workflows_name ON workflows(name);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. Execution Logs Table - 実行ログを保存
-- ============================================================================
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  message TEXT NOT NULL,
  details TEXT,
  module_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_execution_logs_workflow_id ON execution_logs(workflow_id);
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp DESC);
CREATE INDEX idx_execution_logs_level ON execution_logs(level);

-- コメント
COMMENT ON TABLE execution_logs IS 'パイプライン実行時のログを保存';
COMMENT ON COLUMN execution_logs.level IS 'ログレベル: info, success, warning, error';
COMMENT ON COLUMN execution_logs.message IS 'ログメッセージ';
COMMENT ON COLUMN execution_logs.details IS '詳細情報（オプション）';
COMMENT ON COLUMN execution_logs.module_name IS '関連モジュール名（オプション）';


-- ============================================================================
-- 3. Execution Results Table - 実行結果を保存
-- ============================================================================
CREATE TABLE IF NOT EXISTS execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  module_id UUID NOT NULL, -- パイプライン内のモジュールID
  module_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  output_gs_uri TEXT, -- GCSのURI（結果ファイル）
  speaker_count INTEGER,
  segment_count INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  result_data JSONB, -- 追加の結果データ（柔軟性のため）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_execution_results_workflow_id ON execution_results(workflow_id);
CREATE INDEX idx_execution_results_module_id ON execution_results(module_id);
CREATE INDEX idx_execution_results_status ON execution_results(status);
CREATE INDEX idx_execution_results_created_at ON execution_results(created_at DESC);

-- コメント
COMMENT ON TABLE execution_results IS 'モジュール実行結果を保存（話者分離結果など）';
COMMENT ON COLUMN execution_results.module_id IS 'パイプライン内のモジュールインスタンスID';
COMMENT ON COLUMN execution_results.output_gs_uri IS 'GCS上の結果ファイルURI';
COMMENT ON COLUMN execution_results.speaker_count IS '検出された話者数';
COMMENT ON COLUMN execution_results.segment_count IS 'セグメント数';
COMMENT ON COLUMN execution_results.result_data IS '追加の結果データ（JSON形式）';


-- ============================================================================
-- 4. Row Level Security (RLS) - 将来のユーザー認証用（現在は無効）
-- ============================================================================
-- 注: 現在はユーザー認証なしで使用
-- 将来的にユーザー認証を追加する場合は、以下のコメントを解除

-- ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE execution_results ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Enable read access for all users" ON workflows FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for all users" ON workflows FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for all users" ON workflows FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete for all users" ON workflows FOR DELETE USING (true);


-- ============================================================================
-- 5. Utility Views - 便利なビュー
-- ============================================================================

-- ワークフローと実行結果のサマリービュー
CREATE OR REPLACE VIEW workflow_execution_summary AS
SELECT 
  w.id AS workflow_id,
  w.name AS workflow_name,
  w.description,
  COUNT(DISTINCT er.id) AS total_executions,
  COUNT(DISTINCT CASE WHEN er.status = 'success' THEN er.id END) AS successful_executions,
  COUNT(DISTINCT CASE WHEN er.status = 'error' THEN er.id END) AS failed_executions,
  MAX(er.created_at) AS last_execution_at,
  w.created_at,
  w.updated_at
FROM workflows w
LEFT JOIN execution_results er ON w.id = er.workflow_id
GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at;

COMMENT ON VIEW workflow_execution_summary IS 'ワークフローごとの実行サマリー';


-- 最新の実行ログビュー
CREATE OR REPLACE VIEW recent_execution_logs AS
SELECT 
  el.id,
  el.workflow_id,
  w.name AS workflow_name,
  el.level,
  el.message,
  el.details,
  el.module_name,
  el.timestamp,
  el.created_at
FROM execution_logs el
JOIN workflows w ON el.workflow_id = w.id
ORDER BY el.timestamp DESC
LIMIT 100;

COMMENT ON VIEW recent_execution_logs IS '最新100件の実行ログ';


-- ============================================================================
-- 6. Sample Data (開発用) - オプション
-- ============================================================================

-- サンプルワークフローを挿入（開発時のみ）
-- INSERT INTO workflows (name, description, pipeline_data) VALUES
-- (
--   'Sample Diarization Workflow',
--   'pyannote 3.1を使用した話者分離ワークフロー',
--   '{
--     "modules": [
--       {"id": "input-1", "name": "Audio Input", "type": "input"},
--       {"id": "pyannote-1", "name": "pyannote 3.1", "type": "diarization"}
--     ],
--     "connections": [
--       {"source": "input-1", "target": "pyannote-1"}
--     ]
--   }'::jsonb
-- );

