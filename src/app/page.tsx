'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ModuleLibrary } from '@/components/modules/ModuleLibrary';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';
import { PropertiesPanel } from '@/components/properties/PropertiesPanel';
import { ExecutionMonitor } from '@/components/monitor/ExecutionMonitor';
import { usePipelineStore } from '@/store/pipeline';

export default function Home() {
  const { createPipeline, selectedModuleId } = usePipelineStore();

  useEffect(() => {
    // Create a default pipeline on first load
    createPipeline('New Pipeline', 'Drag modules from the library to start building your audio processing pipeline');
  }, [createPipeline]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Module Library - Hidden on mobile */}
        <ModuleLibrary className="w-80 flex-shrink-0 hidden lg:block" />

        {/* Pipeline Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <PipelineCanvas className="flex-1" />
        </div>

        {/* Properties Panel - Responsive width, hidden when no selection on mobile */}
        <PropertiesPanel 
          className={`
            w-full sm:w-96 lg:w-80 
            flex-shrink-0 
            ${selectedModuleId ? 'block' : 'hidden lg:block'}
          `} 
        />
      </div>
    </div>
  );
}