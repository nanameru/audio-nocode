/**
 * Supabase service layer
 * ワークフロー、実行ログ、実行結果、音声ファイルのCRUD操作
 */

import { supabase } from '@/lib/supabase';
import { Pipeline } from '@/types/pipeline';
import { Database } from '@/types/database';

// 型エイリアス
type WorkflowRow = Database['public']['Tables']['workflows']['Row'];
type WorkflowInsert = Database['public']['Tables']['workflows']['Insert'];
type AudioFileRow = Database['public']['Tables']['audio_files']['Row'];
type AudioFileInsert = Database['public']['Tables']['audio_files']['Insert'];
type ExecutionLogInsert = Database['public']['Tables']['execution_logs']['Insert'];
type ExecutionResultInsert = Database['public']['Tables']['execution_results']['Insert'];
type WorkflowExecutionRow = Database['public']['Tables']['workflow_executions']['Row'];

// ============================================================================
// Workflows - ワークフロー管理
// ============================================================================

/**
 * ワークフローを保存
 */
export async function saveWorkflow(pipeline: Pipeline): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .insert({
      name: pipeline.name,
      description: pipeline.description || null,
      pipeline_data: {
        modules: pipeline.modules,
        connections: pipeline.connections,
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save workflow:', error);
    throw new Error(`ワークフローの保存に失敗しました: ${error.message}`);
  }

  return data.id;
}

/**
 * ワークフローを更新
 */
export async function updateWorkflow(workflowId: string, pipeline: Pipeline): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workflows')
    .update({
      name: pipeline.name,
      description: pipeline.description || null,
      pipeline_data: {
        modules: pipeline.modules,
        connections: pipeline.connections,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflowId);

  if (error) {
    console.error('Failed to update workflow:', error);
    throw new Error(`ワークフローの更新に失敗しました: ${error.message}`);
  }
}

/**
 * ワークフローを取得
 */
export async function getWorkflow(workflowId: string): Promise<Pipeline | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (error) {
    console.error('Failed to get workflow:', error);
    return null;
  }

  return convertWorkflowRowToPipeline(data);
}

/**
 * すべてのワークフローを取得
 */
export async function getAllWorkflows(): Promise<Pipeline[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to get workflows:', error);
    throw new Error(`ワークフローの取得に失敗しました: ${error.message}`);
  }

  return data.map(convertWorkflowRowToPipeline);
}

/**
 * ワークフローを削除
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', workflowId);

  if (error) {
    console.error('Failed to delete workflow:', error);
    throw new Error(`ワークフローの削除に失敗しました: ${error.message}`);
  }
}

// ============================================================================
// Audio Files - 音声ファイル管理
// ============================================================================

/**
 * 音声ファイルのメタデータを保存
 */
export async function saveAudioFile(audioFileData: {
  filename: string;
  originalFilename: string;
  gsUri: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
}): Promise<string> {
  const insert = {
    filename: audioFileData.filename,
    original_filename: audioFileData.originalFilename,
    gs_uri: audioFileData.gsUri,
    file_size_bytes: audioFileData.fileSizeBytes || null,
    duration_seconds: audioFileData.durationSeconds || null,
    format: audioFileData.format || null,
    sample_rate: audioFileData.sampleRate || null,
    channels: audioFileData.channels || null,
  };

  const { data, error } = await supabase
    .from('audio_files')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save audio file:', error);
    throw new Error(`音声ファイルの保存に失敗しました: ${error.message}`);
  }

  return data.id;
}

/**
 * 音声ファイルを取得
 */
export async function getAudioFile(audioFileId: string): Promise<AudioFileRow | null> {
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('id', audioFileId)
    .single();

  if (error) {
    console.error('Failed to get audio file:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Workflow Executions - ワークフロー実行管理
// ============================================================================

/**
 * ワークフロー実行を開始
 */
export async function startWorkflowExecution(
  workflowId: string,
  audioFileId?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase.rpc('start_workflow_execution', {
    p_workflow_id: workflowId,
    p_audio_file_id: audioFileId || null,
    p_metadata: metadata || null,
  });

  if (error) {
    console.error('Failed to start workflow execution:', error);
    throw new Error(`ワークフロー実行の開始に失敗しました: ${error.message}`);
  }

  return data;
}

/**
 * ワークフロー実行を完了
 */
export async function completeWorkflowExecution(
  executionId: string,
  status: 'completed' | 'failed' | 'cancelled' = 'completed',
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase.rpc('complete_workflow_execution', {
    p_execution_id: executionId,
    p_status: status,
    p_error_message: errorMessage || null,
  });

  if (error) {
    console.error('Failed to complete workflow execution:', error);
    throw new Error(`ワークフロー実行の完了に失敗しました: ${error.message}`);
  }
}

/**
 * ワークフロー実行履歴を取得
 */
export async function getWorkflowExecution(executionId: string): Promise<WorkflowExecutionRow | null> {
  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (error) {
    console.error('Failed to get workflow execution:', error);
    return null;
  }

  return data;
}

/**
 * ワークフローの実行履歴一覧を取得
 */
export async function getWorkflowExecutions(workflowId: string): Promise<WorkflowExecutionRow[]> {
  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get workflow executions:', error);
    throw new Error(`実行履歴の取得に失敗しました: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Execution Logs - 実行ログ管理
// ============================================================================

/**
 * 実行ログを保存
 */
export async function saveExecutionLog(logData: {
  workflowId: string;
  workflowExecutionId?: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  moduleName?: string;
  timestamp?: Date;
}): Promise<void> {
  const insert = {
    workflow_id: logData.workflowId,
    workflow_execution_id: logData.workflowExecutionId || null,
    level: logData.level,
    message: logData.message,
    details: logData.details || null,
    module_name: logData.moduleName || null,
    timestamp: (logData.timestamp || new Date()).toISOString(),
  };

  const { error } = await supabase
    .from('execution_logs')
    .insert(insert);

  if (error) {
    console.error('Failed to save execution log:', error);
    // ログ保存の失敗は致命的ではないので、エラーをスローしない
  }
}

/**
 * 実行ログを一括保存
 */
export async function saveExecutionLogs(logs: Array<{
  workflow_id: string;
  workflow_execution_id?: string | null;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string | null;
  module_name?: string | null;
  timestamp: string;
}>): Promise<void> {
  const { error } = await supabase
    .from('execution_logs')
    .insert(logs);

  if (error) {
    console.error('Failed to save execution logs:', error);
  }
}

/**
 * ワークフローの実行ログを取得
 */
export async function getExecutionLogs(workflowId: string, limit = 100) {
  const { data, error } = await supabase
    .from('execution_logs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get execution logs:', error);
    throw new Error(`実行ログの取得に失敗しました: ${error.message}`);
  }

  return data;
}

/**
 * 実行履歴IDでログを取得
 */
export async function getExecutionLogsByExecutionId(executionId: string) {
  const { data, error } = await supabase
    .from('execution_logs')
    .select('*')
    .eq('workflow_execution_id', executionId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Failed to get execution logs:', error);
    throw new Error(`実行ログの取得に失敗しました: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Execution Results - 実行結果管理
// ============================================================================

/**
 * 実行結果を保存
 */
export async function saveExecutionResult(resultData: {
  workflowId: string;
  workflowExecutionId?: string;
  moduleId: string;
  moduleName: string;
  status: 'success' | 'error';
  outputGsUri?: string;
  speakerCount?: number;
  segmentCount?: number;
  errorMessage?: string;
  executionTimeMs?: number;
  resultData?: Record<string, unknown>;
}): Promise<string> {
  const insert = {
    workflow_id: resultData.workflowId,
    workflow_execution_id: resultData.workflowExecutionId || null,
    module_id: resultData.moduleId,
    module_name: resultData.moduleName,
    status: resultData.status,
    output_gs_uri: resultData.outputGsUri || null,
    speaker_count: resultData.speakerCount || null,
    segment_count: resultData.segmentCount || null,
    error_message: resultData.errorMessage || null,
    execution_time_ms: resultData.executionTimeMs || null,
    result_data: resultData.resultData || null,
  };

  const { data, error } = await supabase
    .from('execution_results')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save execution result:', error);
    throw new Error(`実行結果の保存に失敗しました: ${error.message}`);
  }

  return data.id;
}

/**
 * ワークフローの実行結果を取得
 */
export async function getExecutionResults(workflowId: string) {
  const { data, error } = await supabase
    .from('execution_results')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get execution results:', error);
    throw new Error(`実行結果の取得に失敗しました: ${error.message}`);
  }

  return data;
}

/**
 * 実行履歴IDで結果を取得
 */
export async function getExecutionResultsByExecutionId(executionId: string) {
  const { data, error } = await supabase
    .from('execution_results')
    .select('*')
    .eq('workflow_execution_id', executionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get execution results:', error);
    throw new Error(`実行結果の取得に失敗しました: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Helper Functions - ヘルパー関数
// ============================================================================

/**
 * WorkflowRowをPipelineに変換
 */
function convertWorkflowRowToPipeline(row: WorkflowRow): Pipeline {
  const pipelineData = row.pipeline_data as { modules: unknown[]; connections: unknown[] };
  
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    modules: pipelineData.modules as Pipeline['modules'],
    connections: pipelineData.connections as Pipeline['connections'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

