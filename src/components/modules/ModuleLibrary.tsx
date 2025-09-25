'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { getModulesByType } from '@/data/modules';
import { ModuleDefinition } from '@/types/pipeline';
import { cn } from '@/lib/utils';

interface ModuleLibraryProps {
  className?: string;
}

interface DraggableModuleProps {
  module: ModuleDefinition;
}

function DraggableModule({ module }: DraggableModuleProps) {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'module',
      definitionId: module.id
    }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      className="group flex items-center gap-3 p-2.5 rounded-md hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="text-lg">{module.icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{module.name}</h4>
        <p className="text-xs text-gray-500 truncate">{module.description}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-400">+</div>
      </div>
    </div>
  );
}

interface ModuleCategoryProps {
  title: string;
  icon: string;
  modules: ModuleDefinition[];
  expanded: boolean;
  onToggle: () => void;
}

function ModuleCategory({ title, icon, modules, expanded, onToggle }: ModuleCategoryProps) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full p-1.5 text-left hover:bg-gray-50 rounded-md transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
        )}
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="ml-auto text-xs text-gray-400">{modules.length}</span>
      </button>
      
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-5">
          {modules.map((module) => (
            <DraggableModule key={module.id} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModuleLibrary({ className }: ModuleLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['input', 'processing', 'output'])
  );

  const inputModules = getModulesByType('input');
  const processingModules = getModulesByType('processing');
  const outputModules = getModulesByType('output');

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filterModules = (modules: ModuleDefinition[]) => {
    if (!searchQuery) return modules;
    return modules.filter(module =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className={cn('bg-white border-r border-gray-200 flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">モジュールライブラリ</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="モジュールを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-gray-50"
          />
        </div>
      </div>

      {/* Module Categories */}
      <div className="flex-1 overflow-y-auto p-3">
        <ModuleCategory
          title="入力"
          icon="📥"
          modules={filterModules(inputModules)}
          expanded={expandedCategories.has('input')}
          onToggle={() => toggleCategory('input')}
        />
        
        <ModuleCategory
          title="処理"
          icon="🎵"
          modules={filterModules(processingModules)}
          expanded={expandedCategories.has('processing')}
          onToggle={() => toggleCategory('processing')}
        />
        
        <ModuleCategory
          title="出力"
          icon="📤"
          modules={filterModules(outputModules)}
          expanded={expandedCategories.has('output')}
          onToggle={() => toggleCategory('output')}
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          ドラッグしてパイプラインに追加
        </p>
      </div>
    </div>
  );
}
