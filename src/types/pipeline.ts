// パイプライン関連の型定義

export type ModuleType = 'input' | 'preprocessing' | 'vad' | 'noise' | 'dereverberation' | 'beamforming' | 'normalization' | 'asr' | 'diarization' | 'output';

export type ModuleStatus = 'idle' | 'running' | 'completed' | 'error';

export interface ModuleParameter {
  type: 'text' | 'number' | 'select' | 'slider' | 'boolean';
  label: string;
  description?: string;
  tooltip?: string;
  default?: string | number | boolean;
  options?: string[] | number[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  type: ModuleType;
  icon: string;
  description: string;
  color: string;
  parameters: Record<string, ModuleParameter>;
  inputPorts: string[];
  outputPorts: string[];
}

export interface ModuleInstance {
  id: string;
  definitionId: string;
  name: string;
  type: ModuleType;
  icon: string;
  position: { x: number; y: number };
  parameters: Record<string, string | number | boolean>;
  status: ModuleStatus;
  progress?: number;
  executionTime?: number;
  error?: string;
}

export interface Connection {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  modules: ModuleInstance[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionResult {
  success: boolean;
  duration: number;
  results: Record<string, string | number | boolean | object>;
  error?: string;
}

// 話者認識結果
export interface DiarizationResult {
  status: string;
  output_gs_uri: string;
  speaker_count: number;
  segment_count: number;
  moduleId: string; // どのモジュールの結果か
  timestamp: Date;
}

// システムメトリクス
export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
  };
  cpu: number;
  gpu?: number;
}

export interface QueueItem {
  id: string;
  file: File;
  addedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}
