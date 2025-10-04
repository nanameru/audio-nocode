'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { Loader2, CheckCircle, XCircle, Clock, MemoryStick, Cpu, Zap, FileText } from 'lucide-react';
import { cn, formatDuration, formatPercentage, formatFileSize } from '@/lib/utils';
import { ExecutionLogs } from './ExecutionLogs';

interface ExecutionMonitorProps {
  className?: string;
}

function ModuleStatusItem({ moduleId }: { moduleId: string }) {
  const { modules } = usePipelineStore();
  const moduleInstance = modules.find(m => m.id === moduleId);
  const definition = moduleInstance ? getModuleDefinition(moduleInstance.definitionId) : null;

  if (!moduleInstance || !definition) return null;

  const getStatusIcon = () => {
    switch (moduleInstance.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (moduleInstance.status) {
      case 'running':
        return `Processing... ${formatPercentage(moduleInstance.progress || 0)}`;
      case 'completed':
        return `Complete (${moduleInstance.executionTime || 0}ms)`;
      case 'error':
        return `Error: ${moduleInstance.error || 'Unknown error'}`;
      default:
        return 'Waiting';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getStatusIcon()}
        <span className="text-sm font-medium text-white truncate">
          [{moduleInstance.name}]
        </span>
      </div>
      
      <div className="text-sm text-gray-300 truncate">
        {getStatusText()}
      </div>

      {moduleInstance.status === 'running' && moduleInstance.progress !== undefined && (
        <div className="w-20">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${moduleInstance.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SystemMetricsDisplay() {
  const { systemMetrics } = usePipelineStore();

  // Mock system metrics for demo
  const mockMetrics = systemMetrics || {
    memory: { used: 1200000000, total: 8000000000 }, // 1.2GB / 8GB
    cpu: 65,
    gpu: 23,
  };

  const memoryPercentage = (mockMetrics.memory.used / mockMetrics.memory.total) * 100;

  return (
    <div className="space-y-3">
      {/* Memory */}
      <div className="flex items-center gap-3">
        <MemoryStick className="h-4 w-4 text-purple-400" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Memory</span>
            <span className="text-white">
              {formatFileSize(mockMetrics.memory.used)} / {formatFileSize(mockMetrics.memory.total)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                memoryPercentage > 80 ? 'bg-red-500' : 
                memoryPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${memoryPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* CPU */}
      <div className="flex items-center gap-3">
        <Cpu className="h-4 w-4 text-blue-400" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">CPU</span>
            <span className="text-white">{mockMetrics.cpu}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                mockMetrics.cpu > 80 ? 'bg-red-500' : 
                mockMetrics.cpu > 60 ? 'bg-yellow-500' : 'bg-blue-500'
              )}
              style={{ width: `${mockMetrics.cpu}%` }}
            />
          </div>
        </div>
      </div>

      {/* GPU */}
      {mockMetrics.gpu !== undefined && (
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-green-400" />
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">GPU</span>
              <span className="text-white">{mockMetrics.gpu}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  mockMetrics.gpu > 80 ? 'bg-red-500' : 
                  mockMetrics.gpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${mockMetrics.gpu}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExecutionMonitor({ className }: ExecutionMonitorProps) {
  const { modules, isExecuting, executionProgress, executionLogs } = usePipelineStore();
  const [showLogs, setShowLogs] = useState(true);

  const totalProgress = modules.length > 0 
    ? Object.values(executionProgress).reduce((sum, progress) => sum + progress, 0) / modules.length
    : 0;

  const completedModules = modules.filter(m => m.status === 'completed').length;
  const runningModules = modules.filter(m => m.status === 'running').length;
  const errorModules = modules.filter(m => m.status === 'error').length;

  // Estimate remaining time (mock calculation)
  const estimatedTimeRemaining = isExecuting && totalProgress > 0 
    ? Math.max(0, (100 - totalProgress) * 2) // 2 seconds per percent remaining
    : 0;

  return (
    <div className={cn('bg-gray-900 text-white rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📈 Execution Monitor
          {isExecuting && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          )}
        </h3>
      </div>

      {/* Module Status List */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>No modules to monitor</p>
          </div>
        ) : (
          modules.map((moduleInstance) => (
            <ModuleStatusItem key={moduleInstance.id} moduleId={moduleInstance.id} />
          ))
        )}
      </div>

      {/* Overall Progress */}
      {isExecuting && (
        <div className="p-4 border-t border-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Overall Progress</span>
              <span className="text-white">{formatPercentage(totalProgress)}</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>
                {completedModules}/{modules.length} modules completed
              </span>
              {estimatedTimeRemaining > 0 && (
                <span>
                  Est. {formatDuration(estimatedTimeRemaining)} remaining
                </span>
              )}
            </div>

            {/* Status Summary */}
            <div className="flex gap-4 text-xs">
              {runningModules > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {runningModules} running
                </span>
              )}
              {completedModules > 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {completedModules} completed
                </span>
              )}
              {errorModules > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="h-3 w-3" />
                  {errorModules} errors
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Metrics */}
      <div className="p-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">System Resources</h4>
        <SystemMetricsDisplay />
      </div>

      {/* Execution Logs Toggle */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>実行ログ</span>
          {executionLogs.length > 0 && (
            <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {executionLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Execution Logs */}
      {showLogs && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <ExecutionLogs />
        </div>
      )}
    </div>
  );
}
