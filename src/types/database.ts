/**
 * Database type definitions for Supabase
 * Generated from db/migrations schema
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // ワークフロー定義
      workflows: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          pipeline_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          pipeline_data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          pipeline_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      // 音声ファイル管理
      audio_files: {
        Row: {
          id: string;
          filename: string;
          original_filename: string;
          gs_uri: string;
          file_size_bytes: number | null;
          duration_seconds: number | null;
          format: string | null;
          sample_rate: number | null;
          channels: number | null;
          uploaded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          filename: string;
          original_filename: string;
          gs_uri: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          format?: string | null;
          sample_rate?: number | null;
          channels?: number | null;
          uploaded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          filename?: string;
          original_filename?: string;
          gs_uri?: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          format?: string | null;
          sample_rate?: number | null;
          channels?: number | null;
          uploaded_at?: string;
          created_at?: string;
        };
      };
      // ワークフロー実行履歴
      workflow_executions: {
        Row: {
          id: string;
          workflow_id: string;
          audio_file_id: string | null;
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          started_at: string | null;
          completed_at: string | null;
          total_duration_ms: number | null;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          audio_file_id?: string | null;
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          started_at?: string | null;
          completed_at?: string | null;
          total_duration_ms?: number | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          audio_file_id?: string | null;
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          started_at?: string | null;
          completed_at?: string | null;
          total_duration_ms?: number | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      // 実行ログ
      execution_logs: {
        Row: {
          id: string;
          workflow_id: string;
          workflow_execution_id: string | null;
          level: 'info' | 'success' | 'warning' | 'error';
          message: string;
          details: string | null;
          module_name: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          workflow_execution_id?: string | null;
          level: 'info' | 'success' | 'warning' | 'error';
          message: string;
          details?: string | null;
          module_name?: string | null;
          timestamp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          workflow_execution_id?: string | null;
          level?: 'info' | 'success' | 'warning' | 'error';
          message?: string;
          details?: string | null;
          module_name?: string | null;
          timestamp?: string;
          created_at?: string;
        };
      };
      // 実行結果
      execution_results: {
        Row: {
          id: string;
          workflow_id: string;
          workflow_execution_id: string | null;
          module_id: string;
          module_name: string;
          status: 'success' | 'error';
          output_gs_uri: string | null;
          speaker_count: number | null;
          segment_count: number | null;
          error_message: string | null;
          execution_time_ms: number | null;
          result_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          workflow_execution_id?: string | null;
          module_id: string;
          module_name: string;
          status: 'success' | 'error';
          output_gs_uri?: string | null;
          speaker_count?: number | null;
          segment_count?: number | null;
          error_message?: string | null;
          execution_time_ms?: number | null;
          result_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          workflow_execution_id?: string | null;
          module_id?: string;
          module_name?: string;
          status?: 'success' | 'error';
          output_gs_uri?: string | null;
          speaker_count?: number | null;
          segment_count?: number | null;
          error_message?: string | null;
          execution_time_ms?: number | null;
          result_data?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      workflow_execution_summary: {
        Row: {
          workflow_id: string;
          workflow_name: string;
          description: string | null;
          total_executions: number;
          successful_executions: number;
          failed_executions: number;
          last_execution_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      recent_execution_logs: {
        Row: {
          id: string;
          workflow_id: string;
          workflow_name: string;
          level: string;
          message: string;
          details: string | null;
          module_name: string | null;
          timestamp: string;
          created_at: string;
        };
      };
      workflow_execution_details: {
        Row: {
          execution_id: string;
          workflow_id: string;
          workflow_name: string;
          audio_file_id: string | null;
          original_filename: string | null;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          total_duration_ms: number | null;
          error_message: string | null;
          created_at: string;
          result_count: number;
          successful_results: number;
          failed_results: number;
        };
      };
      audio_file_usage_stats: {
        Row: {
          audio_file_id: string;
          original_filename: string;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          format: string | null;
          uploaded_at: string;
          execution_count: number;
          workflow_count: number;
          last_used_at: string | null;
          successful_executions: number;
          failed_executions: number;
        };
      };
      active_executions: {
        Row: {
          execution_id: string;
          workflow_id: string;
          workflow_name: string;
          audio_file_id: string | null;
          original_filename: string | null;
          status: string;
          started_at: string | null;
          elapsed_seconds: number | null;
          created_at: string;
        };
      };
    };
    Functions: {
      start_workflow_execution: {
        Args: {
          p_workflow_id: string;
          p_audio_file_id?: string | null;
          p_metadata?: Json | null;
        };
        Returns: string;
      };
      complete_workflow_execution: {
        Args: {
          p_execution_id: string;
          p_status?: string;
          p_error_message?: string | null;
        };
        Returns: boolean;
      };
    };
  };
}

