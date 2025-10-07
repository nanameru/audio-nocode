'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { getAllModuleTypes, getModulesByType, getModuleTypeLabel, getModuleTypeIcon, getModuleDefinition } from '@/data/modules';
import { ModuleDefinition, ModuleType } from '@/types/pipeline';
import { usePipelineStore } from '@/store/pipeline';

interface MobileModuleMenuProps {
  isOpen: boolean;
  onClose: () => void;
  viewport?: { x: number; y: number; zoom: number };
}

export function MobileModuleMenu({ isOpen, onClose, viewport }: MobileModuleMenuProps) {
  const { modules, addModule, addConnection } = usePipelineStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const allModuleTypes = getAllModuleTypes();

  const handleModuleSelect = (definitionId: string) => {
    let position: { x: number; y: number };
    if (viewport) {
      const viewportCenterX = 200;
      const viewportCenterY = 300;
      position = {
        x: (viewportCenterX - viewport.x) / viewport.zoom,
        y: (viewportCenterY - viewport.y) / viewport.zoom,
      };
    } else {
      position = { x: 250 + modules.length * 50, y: 200 };
    }
    
    // Add module at calculated position
    addModule(definitionId, position);
    
    if (modules.length > 0) {
      const lastModule = modules[modules.length - 1];
      const lastModuleDefinition = getModuleDefinition(lastModule.definitionId);
      const newModuleDefinition = getModuleDefinition(definitionId);
      
      if (lastModuleDefinition && newModuleDefinition) {
        const sourcePort = lastModuleDefinition.outputPorts[0] || 'output';
        const targetPort = newModuleDefinition.inputPorts[0] || 'input';
        
        setTimeout(() => {
          const state = usePipelineStore.getState();
          const newModule = state.modules[state.modules.length - 1];
          
          if (newModule && newModule.definitionId === definitionId) {
            addConnection({
              source: lastModule.id,
              target: newModule.id,
              sourcePort,
              targetPort,
            });
          }
        }, 0);
      }
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">モジュールを追加</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedCategory ? (
            // Category Selection
            <div className="space-y-2">
              {allModuleTypes.map((moduleType) => {
                const modules = getModulesByType(moduleType as ModuleType);
                return (
                  <button
                    key={moduleType}
                    onClick={() => setSelectedCategory(moduleType)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getModuleTypeIcon(moduleType)}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {getModuleTypeLabel(moduleType)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {modules.length}個のモジュール
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>
                );
              })}
            </div>
          ) : (
            // Module Selection
            <div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-gray-600 mb-4"
              >
                <span>‹</span>
                <span>戻る</span>
              </button>
              
              <div className="space-y-2">
                {getModulesByType(selectedCategory as ModuleType).map((module: ModuleDefinition) => (
                  <button
                    key={module.id}
                    onClick={() => handleModuleSelect(module.id)}
                    className="w-full flex items-start gap-3 p-4 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                  >
                    <span className="text-2xl flex-shrink-0">{module.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{module.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{module.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

