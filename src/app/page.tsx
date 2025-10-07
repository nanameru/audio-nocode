'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ModuleLibrary } from '@/components/modules/ModuleLibrary';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';
import { PropertiesPanel } from '@/components/properties/PropertiesPanel';
import { MobileModuleMenu } from '@/components/mobile/MobileModuleMenu';
import { usePipelineStore } from '@/store/pipeline';

export default function Home() {
  const { createPipeline, selectedModuleId } = usePipelineStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.8 });

  useEffect(() => {
    // Create a default pipeline on first load
    createPipeline('New Pipeline', 'Drag modules from the library to start building your audio processing pipeline');
  }, [createPipeline]);

  // リサイズ処理
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // 最小幅300px、最大幅800px
      setPanelWidth(Math.min(Math.max(newWidth, 300), 800));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Module Library - Hidden on mobile */}
        <div className="w-80 flex-shrink-0 hidden lg:flex flex-col">
          <ModuleLibrary className="flex-1 min-h-0" />
        </div>

        {/* Pipeline Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <PipelineCanvas className="flex-1" onViewportChange={setViewport} />
        </div>

        {/* Properties Panel - Resizable width, hidden when no selection */}
        <PropertiesPanel 
          className={`
            flex-shrink-0 
            h-full
            ${selectedModuleId ? 'fixed inset-0 z-50 lg:relative lg:z-auto' : 'hidden'}
          `}
          width={selectedModuleId ? panelWidth : undefined}
          onResizeStart={() => setIsResizing(true)}
        />
      </div>

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className={`lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-transform active:scale-95 ${selectedModuleId ? 'hidden' : ''}`}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile Module Menu */}
      <MobileModuleMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        viewport={viewport}
      />
    </div>
  );
}
