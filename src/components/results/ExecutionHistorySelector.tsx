'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelineStore } from '@/store/pipeline';
import { Clock, FileAudio, Users, MessageSquare, GitCompare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionHistorySelectorProps {
  workflowId?: string;
  currentExecutionId?: string;
  onClose?: () => void;
}

export function ExecutionHistorySelector({ workflowId, currentExecutionId, onClose }: ExecutionHistorySelectorProps) {
  const router = useRouter();
  const { getExecutionHistory } = usePipelineStore();
  const [selectedExecutions, setSelectedExecutions] = useState<string[]>([]);
  
  const history = getExecutionHistory(workflowId);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  
  const handleToggleSelection = (executionId: string) => {
    if (selectedExecutions.includes(executionId)) {
      setSelectedExecutions(selectedExecutions.filter(id => id !== executionId));
    } else {
      if (selectedExecutions.length >= 2) {
        setSelectedExecutions([selectedExecutions[1], executionId]);
      } else {
        setSelectedExecutions([...selectedExecutions, executionId]);
      }
    }
  };
  
  const handleCompare = () => {
    if (selectedExecutions.length === 2) {
      router.push(`/diff?exec1=${selectedExecutions[0]}&exec2=${selectedExecutions[1]}`);
    } else if (selectedExecutions.length === 1 && currentExecutionId) {
      router.push(`/diff?exec1=${currentExecutionId}&exec2=${selectedExecutions[0]}`);
    }
  };
  
  const canCompare = selectedExecutions.length === 2 || (selectedExecutions.length === 1 && currentExecutionId);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">実行履歴から選択</h2>
            <p className="text-sm text-gray-600 mt-1">
              比較する実行を選択してください（最大2つ）
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">実行履歴がありません</h3>
              <p className="text-gray-600">
                ワークフローを実行すると、ここに履歴が表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentExecutionId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>現在の実行</strong>と比較する場合は、1つの実行を選択してください
                  </p>
                </div>
              )}
              
              {history.map((execution) => {
                const isSelected = selectedExecutions.includes(execution.id);
                const isCurrent = execution.id === currentExecutionId;
                const selectionIndex = selectedExecutions.indexOf(execution.id);
                
                return (
                  <button
                    key={execution.id}
                    onClick={() => !isCurrent && handleToggleSelection(execution.id)}
                    disabled={isCurrent}
                    className={cn(
                      'w-full text-left border rounded-lg p-4 transition-all',
                      isCurrent && 'bg-blue-50 border-blue-300 cursor-not-allowed',
                      !isCurrent && !isSelected && 'border-gray-200 hover:border-purple-300 hover:bg-purple-50',
                      !isCurrent && isSelected && 'border-purple-500 bg-purple-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded">
                              現在
                            </span>
                          )}
                          {isSelected && !isCurrent && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded">
                              選択 {selectionIndex + 1}
                            </span>
                          )}
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-900 font-medium">
                            {formatDate(execution.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <FileAudio className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 truncate">
                            {execution.audioFileName}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(execution.audioFileSize)})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-900 font-medium">
                              {execution.result.speaker_count}人
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <MessageSquare className="h-4 w-4 text-purple-600" />
                            <span className="text-gray-900 font-medium">
                              {execution.result.segment_count}セグメント
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {!isCurrent && (
                        <div className={cn(
                          'w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        )}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedExecutions.length === 0 && !currentExecutionId && '2つの実行を選択してください'}
            {selectedExecutions.length === 0 && currentExecutionId && '1つの実行を選択してください'}
            {selectedExecutions.length === 1 && !currentExecutionId && 'あと1つ選択してください'}
            {selectedExecutions.length === 1 && currentExecutionId && '比較の準備ができました'}
            {selectedExecutions.length === 2 && '比較の準備ができました'}
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
                canCompare
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              <GitCompare className="h-4 w-4" />
              差分を表示
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
