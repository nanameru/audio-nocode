'use client';

import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/store/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { ModuleParameter } from '@/types/pipeline';
import { TestTube, RotateCcw, HelpCircle, Trash2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { ExecutionMonitor } from '@/components/monitor/ExecutionMonitor';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { cn } from '@/lib/utils';

interface PropertiesPanelProps {
  className?: string;
}

interface ParameterFieldProps {
  parameter: ModuleParameter;
  value: any;
  onChange: (value: any) => void;
}

function ParameterField({ parameter, value, onChange }: ParameterFieldProps) {
  const { type, label, description, options, min, max, step } = parameter;

  const renderField = () => {
    switch (type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={description}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={value || min || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{min}</span>
              <span className="font-medium">{value}</span>
              <span>{max}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'relative w-11 h-6 bg-gray-200 rounded-full transition-colors',
              value ? 'bg-purple-500' : 'bg-gray-200'
            )}>
              <div className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                value ? 'translate-x-5' : 'translate-x-0'
              )} />
            </div>
            <span className="ml-3 text-sm text-gray-700">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Unsupported parameter type: {type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {parameter.tooltip && (
          <InfoIcon 
            content={parameter.tooltip}
            size="sm"
            position="right"
          />
        )}
      </div>
      {renderField()}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const [isMonitorExpanded, setIsMonitorExpanded] = useState(false);
  
  const { 
    selectedModuleId, 
    modules, 
    updateModuleParameters,
    removeModule,
    selectModule,
    isExecuting
  } = usePipelineStore();

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const definition = selectedModule ? getModuleDefinition(selectedModule.definitionId) : null;

  // 実行中は自動的にモニターを展開
  useEffect(() => {
    if (isExecuting && !isMonitorExpanded) {
      setIsMonitorExpanded(true);
    }
  }, [isExecuting, isMonitorExpanded]);

  const handleParameterChange = (parameterKey: string, value: any) => {
    if (!selectedModule) return;
    
    updateModuleParameters(selectedModule.id, {
      [parameterKey]: value
    });
  };

  const handleTest = () => {
    // TODO: Implement module testing
    console.log('Testing module:', selectedModule?.name);
  };

  const handleReset = () => {
    if (!selectedModule || !definition) return;
    
    const defaultParameters = Object.fromEntries(
      Object.entries(definition.parameters).map(([key, param]) => [key, param.default])
    );
    
    updateModuleParameters(selectedModule.id, defaultParameters);
  };

  const handleHelp = () => {
    // TODO: Show help documentation
    console.log('Show help for:', selectedModule?.name);
  };

  const handleDelete = () => {
    if (!selectedModule) return;
    
    // 削除確認
    if (window.confirm(`"${selectedModule.name}" モジュールを削除しますか？\n\nこの操作は取り消せません。`)) {
      removeModule(selectedModule.id);
      selectModule(null); // 選択を解除
    }
  };

  return (
    <div className={cn('bg-white border-l border-gray-200 flex flex-col', className)}>
      {/* Properties Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">プロパティ</h3>
      </div>

      {/* Module Properties Section */}
      <div className="flex-1 overflow-y-auto">
        {!selectedModule || !definition ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-4xl mb-4">⚙️</div>
              <h4 className="text-lg font-medium text-gray-600 mb-2">
                モジュールが選択されていません
              </h4>
              <p className="text-gray-500 max-w-sm">
                パイプライン内のモジュールをクリックしてプロパティを表示・編集してください。
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Selected Module Info */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">{definition.icon}</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{selectedModule.name}</h3>
                  <p className="text-xs text-gray-500">{definition.description}</p>
                </div>
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-2 mt-3">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  selectedModule.status === 'idle' && 'bg-gray-400',
                  selectedModule.status === 'running' && 'bg-blue-500',
                  selectedModule.status === 'completed' && 'bg-green-500',
                  selectedModule.status === 'error' && 'bg-red-500'
                )} />
                <span className="text-xs text-gray-600 capitalize">
                  {selectedModule.status}
                </span>
                {selectedModule.progress !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({selectedModule.progress}%)
                  </span>
                )}
              </div>
            </div>

            {/* Parameters */}
            <div className="p-4">
              <div className="space-y-4">
                {Object.entries(definition.parameters).map(([key, parameter]) => (
                  <ParameterField
                    key={key}
                    parameter={parameter}
                    value={selectedModule.parameters[key]}
                    onChange={(value) => handleParameterChange(key, value)}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleTest}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm border border-gray-200"
                >
                  <TestTube className="h-4 w-4" />
                  テスト
                </button>
                
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm border border-gray-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  リセット
                </button>
                
                <button
                  onClick={handleHelp}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm border border-gray-200"
                >
                  <HelpCircle className="h-4 w-4" />
                  ヘルプ
                </button>
                
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm border border-red-200 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Execution Monitor Section */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setIsMonitorExpanded(!isMonitorExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className={cn(
              "h-4 w-4",
              isExecuting ? "text-blue-500 animate-pulse" : "text-gray-500"
            )} />
            <span className="text-sm font-medium text-gray-900">実行モニター</span>
            {isExecuting && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                実行中
              </span>
            )}
          </div>
          {isMonitorExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
        
        {isMonitorExpanded && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="p-3">
              <ExecutionMonitor className="max-h-80 overflow-y-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

}
