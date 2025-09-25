'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Loader2, CheckCircle, XCircle, Circle, X } from 'lucide-react';
import { ModuleInstance } from '@/types/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { usePipelineStore } from '@/store/pipeline';
import { cn } from '@/lib/utils';

interface ModuleNodeProps extends NodeProps {
  data: ModuleInstance;
}

function StatusIndicator({ status, progress }: { status: ModuleInstance['status']; progress?: number }) {
  switch (status) {
    case 'running':
      return (
        <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        </div>
      );
    case 'completed':
      return (
        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      );
    case 'error':
      return (
        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
          <XCircle className="h-3 w-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="absolute -top-2 -right-2 bg-gray-400 rounded-full p-1">
          <Circle className="h-3 w-3 text-white" />
        </div>
      );
  }
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export const ModuleNode = memo(({ data, selected }: ModuleNodeProps) => {
  const { selectedModuleId, removeModule, selectModule } = usePipelineStore();
  const definition = getModuleDefinition(data.definitionId);
  
  if (!definition) {
    return (
      <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 min-w-32">
        <div className="text-red-600 font-medium">Unknown Module</div>
        <div className="text-sm text-red-500">{data.definitionId}</div>
      </div>
    );
  }

  const isSelected = selectedModuleId === data.id;
  const hasInputs = definition.inputPorts.length > 0;
  const hasOutputs = definition.outputPorts.length > 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // ノードの選択を防ぐ
    
    if (window.confirm(`"${data.name}" モジュールを削除しますか？`)) {
      if (isSelected) {
        selectModule(null); // 選択されていたら選択を解除
      }
      removeModule(data.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-md shadow-sm border transition-all min-w-32 p-3',
        isSelected ? 'border-gray-400 shadow-md' : 'border-gray-200',
        data.status === 'running' && 'animate-pulse',
        'hover:shadow-md cursor-pointer'
      )}
    >
      {/* Status Indicator */}
      <StatusIndicator status={data.status} progress={data.progress} />

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        title="モジュールを削除"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Input Handles */}
      {hasInputs && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-purple-500"
          style={{ left: '-6px' }}
        />
      )}

      {/* Module Content */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{definition.icon}</span>
        <span className="font-medium text-sm text-gray-900 truncate">
          {data.name}
        </span>
      </div>

      {/* Progress Bar (only when running) */}
      {data.status === 'running' && data.progress !== undefined && (
        <ProgressBar progress={data.progress} />
      )}

      {/* Execution Time */}
      {data.executionTime && (
        <div className="text-xs text-gray-500 mb-1">
          {data.executionTime}ms
        </div>
      )}

      {/* Error Message */}
      {data.status === 'error' && data.error && (
        <div className="text-xs text-red-500 mb-1 truncate" title={data.error}>
          Error: {data.error}
        </div>
      )}

      {/* Parameter Summary */}
      {Object.keys(data.parameters).length > 0 && (
        <div className="text-xs text-gray-500 truncate">
          {Object.entries(data.parameters)
            .slice(0, 2)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}
          {Object.keys(data.parameters).length > 2 && '...'}
        </div>
      )}

      {/* Output Handles */}
      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-purple-500"
          style={{ right: '-6px' }}
        />
      )}
    </div>
  );
});
