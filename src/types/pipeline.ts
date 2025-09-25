// パイプライン関連の型定義

export type ModuleType = 'input' | 'preprocessing' | 'vad' | 'noise' | 'dereverberation' | 'beamforming' | 'normalization' | 'asr' | 'diarization' | 'output';

export type ModuleStatus = 'idle' | 'running' | 'completed' | 'error';

export interface ModuleParameter {
  type: 'text' | 'number' | 'select' | 'slider' | 'boolean';
  label: string;
  description?: string;
  tooltip?: string;
  default?: any;
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
  parameters: Record<string, any>;
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
  results: Record<string, any>;
  error?: string;
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
