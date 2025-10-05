/**
 * Supabase連携のサンプルコード
 * 
 * 注意: これは実装例です。実際に使用する場合は、
 * src/lib/supabase.ts などに配置して、必要なパッケージをインストールしてください。
 * 
 * 必要なパッケージ:
 * npm install @supabase/supabase-js
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  pipeline_data: {
    modules: any[];
    connections: any[];
  };
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: string;
  filename: string;
  original_filename: string;
  gs_uri: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  format?: string;
  sample_rate?: number;
  channels?: number;
  uploaded_at: string;
  created_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  audio_file_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  total_duration_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  workflow_execution_id?: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  module_name?: string;
  timestamp: string;
  created_at: string;
}

export interface ExecutionResult {
  id: string;
  workflow_id: string;
  workflow_execution_id?: string;
  module_id: string;
  module_name: string;
  status: 'success' | 'error';
  output_gs_uri?: string;
  speaker_count?: number;
  segment_count?: number;
  error_message?: string;
  execution_time_ms?: number;
  result_data?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Supabase Client
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

// ============================================================================
// Workflow Operations
// ============================================================================

/**
 * ワークフローを保存
 */
export async function saveWorkflow(
  name: string,
  pipelineData: { modules: any[]; connections: any[] },
  description?: string
): Promise<Workflow> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name,
      description,
      pipeline_data: pipelineData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ワークフローを更新
 */
export async function updateWorkflow(
  id: string,
  updates: {
    name?: string;
    description?: string;
    pipeline_data?: { modules: any[]; connections: any[] };
  }
): Promise<Workflow> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflows')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ワークフローを取得
 */
export async function getWorkflow(id: string): Promise<Workflow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * すべてのワークフローを取得
 */
export async function listWorkflows(limit = 50): Promise<Workflow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * ワークフローを削除
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Audio File Operations
// ============================================================================

/**
 * 音声ファイルを登録
 */
export async function registerAudioFile(
  filename: string,
  originalFilename: string,
  gsUri: string,
  options?: {
    fileSizeBytes?: number;
    durationSeconds?: number;
    format?: string;
    sampleRate?: number;
    channels?: number;
  }
): Promise<AudioFile> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('audio_files')
    .insert({
      filename,
      original_filename: originalFilename,
      gs_uri: gsUri,
      file_size_bytes: options?.fileSizeBytes,
      duration_seconds: options?.durationSeconds,
      format: options?.format,
      sample_rate: options?.sampleRate,
      channels: options?.channels,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * GCS URIから音声ファイルを取得
 */
export async function getAudioFileByGsUri(gsUri: string): Promise<AudioFile | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('gs_uri', gsUri)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * すべての音声ファイルを取得
 */
export async function listAudioFiles(limit = 50): Promise<AudioFile[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * 音声ファイルを削除
 */
export async function deleteAudioFile(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('audio_files')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Workflow Execution Operations
// ============================================================================

/**
 * ワークフロー実行を開始（ヘルパー関数使用）
 */
export async function startWorkflowExecution(
  workflowId: string,
  audioFileId?: string,
  metadata?: Record<string, any>
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('start_workflow_execution', {
    p_workflow_id: workflowId,
    p_audio_file_id: audioFileId || null,
    p_metadata: metadata || null,
  });

  if (error) throw error;
  return data; // 実行ID
}

/**
 * ワークフロー実行を完了（ヘルパー関数使用）
 */
export async function completeWorkflowExecution(
  executionId: string,
  status: 'completed' | 'failed' | 'cancelled' = 'completed',
  errorMessage?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('complete_workflow_execution', {
    p_execution_id: executionId,
    p_status: status,
    p_error_message: errorMessage || null,
  });

  if (error) throw error;
  return data;
}

/**
 * ワークフロー実行を取得
 */
export async function getWorkflowExecution(id: string): Promise<WorkflowExecution | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * ワークフローの実行履歴を取得
 */
export async function getWorkflowExecutions(
  workflowId: string,
  limit = 50
): Promise<WorkflowExecution[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * 実行中のワークフローを取得
 */
export async function getActiveExecutions(): Promise<WorkflowExecution[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('active_executions')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * ワークフロー実行の詳細を取得（音声ファイル情報を含む）
 */
export async function getWorkflowExecutionDetails(executionId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflow_execution_details')
    .select('*')
    .eq('execution_id', executionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

// ============================================================================
// Execution Log Operations
// ============================================================================

/**
 * 実行ログを追加
 */
export async function addExecutionLog(
  workflowId: string,
  level: ExecutionLog['level'],
  message: string,
  options?: {
    workflowExecutionId?: string;
    details?: string;
    moduleName?: string;
    timestamp?: Date;
  }
): Promise<ExecutionLog> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_logs')
    .insert({
      workflow_id: workflowId,
      workflow_execution_id: options?.workflowExecutionId,
      level,
      message,
      details: options?.details,
      module_name: options?.moduleName,
      timestamp: (options?.timestamp || new Date()).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ワークフローの実行ログを取得
 */
export async function getExecutionLogs(
  workflowId: string,
  limit = 100
): Promise<ExecutionLog[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_logs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * エラーログを取得
 */
export async function getErrorLogs(limit = 50): Promise<ExecutionLog[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_logs')
    .select('*')
    .eq('level', 'error')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Execution Result Operations
// ============================================================================

/**
 * 実行結果を保存
 */
export async function saveExecutionResult(
  workflowId: string,
  moduleId: string,
  moduleName: string,
  status: 'success' | 'error',
  options?: {
    workflowExecutionId?: string;
    outputGsUri?: string;
    speakerCount?: number;
    segmentCount?: number;
    errorMessage?: string;
    executionTimeMs?: number;
    resultData?: Record<string, any>;
  }
): Promise<ExecutionResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_results')
    .insert({
      workflow_id: workflowId,
      workflow_execution_id: options?.workflowExecutionId,
      module_id: moduleId,
      module_name: moduleName,
      status,
      output_gs_uri: options?.outputGsUri,
      speaker_count: options?.speakerCount,
      segment_count: options?.segmentCount,
      error_message: options?.errorMessage,
      execution_time_ms: options?.executionTimeMs,
      result_data: options?.resultData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ワークフローの実行結果を取得
 */
export async function getExecutionResults(
  workflowId: string,
  limit = 50
): Promise<ExecutionResult[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_results')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * 最新の実行結果を取得
 */
export async function getLatestExecutionResult(
  workflowId: string,
  moduleId: string
): Promise<ExecutionResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('execution_results')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

// ============================================================================
// Analytics / Summary Operations
// ============================================================================

/**
 * ワークフロー実行サマリーを取得
 */
export async function getWorkflowExecutionSummary() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workflow_execution_summary')
    .select('*')
    .order('last_execution_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * 統計情報を取得
 */
export async function getStatistics() {
  const supabase = getSupabaseClient();

  // ワークフロー数
  const { count: workflowCount } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true });

  // 総実行回数
  const { count: totalExecutions } = await supabase
    .from('execution_results')
    .select('*', { count: 'exact', head: true });

  // 成功した実行回数
  const { count: successfulExecutions } = await supabase
    .from('execution_results')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  // 失敗した実行回数
  const { count: failedExecutions } = await supabase
    .from('execution_results')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error');

  return {
    workflowCount: workflowCount || 0,
    totalExecutions: totalExecutions || 0,
    successfulExecutions: successfulExecutions || 0,
    failedExecutions: failedExecutions || 0,
    successRate:
      totalExecutions && totalExecutions > 0
        ? ((successfulExecutions || 0) / totalExecutions) * 100
        : 0,
  };
}

