'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { getAllModuleTypes, getModulesByType, getModuleTypeLabel, getModuleTypeIcon } from '@/data/modules';
import { ModuleDefinition, ModuleType } from '@/types/pipeline';

interface ModuleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (definitionId: string) => void;
  position?: { x: number; y: number };
}

export function ModuleSelector({ isOpen, onClose, onSelect, position }: ModuleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const allModuleTypes = getAllModuleTypes();

  const filterModules = (modules: ModuleDefinition[]) => {
    if (!searchQuery) return modules;
    return modules.filter(module =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleSelect = (definitionId: string) => {
    onSelect(definitionId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 w-[400px] max-h-[600px] flex flex-col"
        style={{
          left: position ? `${position.x}px` : '50%',
          top: position ? `${position.y}px` : '50%',
          transform: position ? 'translate(-50%, -50%)' : 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">ノードを追加</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="モジュールを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="h-full overflow-y-auto">
            {allModuleTypes.map((moduleType) => {
              const modules = getModulesByType(moduleType as ModuleType);
              const filteredModules = filterModules(modules);
              
              if (filteredModules.length === 0) return null;
              
              return (
                <div key={moduleType} className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-2">
                    <span className="text-sm">{getModuleTypeIcon(moduleType)}</span>
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      {getModuleTypeLabel(moduleType)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {filteredModules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => handleSelect(module.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors text-left border border-transparent hover:border-purple-200"
                      >
                        <div className="text-2xl">{module.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900">{module.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{module.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

