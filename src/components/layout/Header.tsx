'use client';

import { useState } from 'react';
import { Music, Settings, User, HelpCircle, Save, Play, Square, Download, Upload, MoreVertical, Maximize2 } from 'lucide-react';
import { usePipelineStore } from '@/store/pipeline';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { WorkflowManager } from '@/components/workflow/WorkflowManager';

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
    exportPipelineAsJSON,
    importPipelineFromJSON,
    autoArrangeModules
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
        input.accept = 'audio/*,video/*';
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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await importPipelineFromJSON(file);
          alert('パイプラインを正常にインポートしました');
        } catch (error) {
          console.error('Import failed:', error);
          alert(`インポートエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }
    };
    input.click();
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

          {/* Navigation Tabs - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-1">
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
            {/* Workflow Manager */}
            <WorkflowManager />
            
            {/* Pipeline Controls */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
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
                    <span className="hidden sm:inline">停止</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">実行</span>
                  </>
                )}
              </button>

              <DropdownMenu
                trigger={
                  <button
                    disabled={!currentPipeline}
                    className={cn(
                      'flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors border',
                      currentPipeline
                        ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                }
              >
                <DropdownMenuItem
                  onClick={autoArrangeModules}
                  disabled={!currentPipeline}
                >
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    自動整列
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={exportPipelineAsJSON}
                  disabled={!currentPipeline}
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    JSON出力
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleImport}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    JSONインポート
                  </div>
                </DropdownMenuItem>
              </DropdownMenu>
            </div>

            {/* User Menu - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
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
