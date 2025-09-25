'use client';

import { useState } from 'react';
import { Music, Settings, User, HelpCircle, Save, Play, Square, Download } from 'lucide-react';
import { usePipelineStore } from '@/store/pipeline';
import { cn } from '@/lib/utils';

const navTabs = [
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'templates', label: 'Templates', icon: '🧩' },
  { id: 'modules', label: 'Modules', icon: '🔧' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'help', label: 'Help', icon: '💡' },
];

export function Header() {
  const [activeTab, setActiveTab] = useState('projects');
  const { 
    currentPipeline, 
    isExecuting, 
    startExecution, 
    stopExecution, 
    executePipeline,
    savePipeline,
    validatePipeline,
    exportPipelineAsJSON
  } = usePipelineStore();

  const handleExecute = async () => {
    if (isExecuting) {
      stopExecution();
    } else {
      const validation = validatePipeline();
      if (validation.isValid) {
        // For demo purposes, we'll create a mock file input
        // In a real implementation, this would come from a file input dialog
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              await executePipeline(file);
            } catch (error) {
              console.error('Pipeline execution failed:', error);
              alert(`パイプライン実行エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
          }
        };
        input.click();
      } else {
        // TODO: Show validation errors
        console.warn('Pipeline validation failed:', validation.errors);
        alert(`パイプライン検証エラー: ${validation.errors.join(', ')}`);
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 text-gray-900">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Audio Processing Studio</h1>
              {currentPipeline && (
                <p className="text-sm text-gray-500">
                  {currentPipeline.name}
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Pipeline Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExecute}
                disabled={!currentPipeline}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border',
                  isExecuting
                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
                )}
              >
                {isExecuting ? (
                  <>
                    <Square className="h-4 w-4" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    実行
                  </>
                )}
              </button>

              <button
                onClick={savePipeline}
                disabled={!currentPipeline}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium transition-colors hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                保存
              </button>

              <button
                onClick={exportPipelineAsJSON}
                disabled={!currentPipeline}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                JSON出力
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <HelpCircle className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <User className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
