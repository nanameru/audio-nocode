'use client';

import { useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { usePipelineStore, ExecutionLog } from '@/store/pipeline';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ExecutionLogsProps {
  className?: string;
}

function LogEntry({ log }: { log: ExecutionLog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getIcon = () => {
    switch (log.level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    }
  };

  const getBackgroundColor = () => {
    switch (log.level) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
  };

  return (
    <div className={cn('border rounded-lg p-3 mb-2', getBackgroundColor())}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-mono">
              {formatTime(log.timestamp)}
            </span>
            {log.module && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {log.module}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-900 mt-1">{log.message}</p>
          
          {log.details && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mt-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    詳細を隠す
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    詳細を表示
                  </>
                )}
              </button>
              {isExpanded && (
                <pre className="text-xs text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200 overflow-x-auto">
                  {log.details}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExecutionLogs({ className }: ExecutionLogsProps) {
  const { executionLogs, clearExecutionLogs } = usePipelineStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLogs]);

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">実行ログ</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {executionLogs.length}件
          </span>
        </div>
        {executionLogs.length > 0 && (
          <button
            onClick={clearExecutionLogs}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* Logs Content */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {executionLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">実行ログはここに表示されます</p>
          </div>
        ) : (
          <>
            {executionLogs.map((log, index) => (
              <LogEntry key={index} log={log} />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  );
}

