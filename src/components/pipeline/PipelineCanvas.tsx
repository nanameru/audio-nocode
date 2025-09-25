'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Connection,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { usePipelineStore } from '@/store/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { ModuleNode } from './ModuleNode';
import { cn } from '@/lib/utils';

const nodeTypes: NodeTypes = {
  module: ModuleNode,
};

interface PipelineCanvasProps {
  className?: string;
}

function PipelineCanvasInner({ className }: PipelineCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const {
    modules,
    connections,
    selectedModuleId,
    addModule,
    updateModulePosition,
    addConnection,
    removeConnection,
    removeModule,
    selectModule,
  } = usePipelineStore();

  // Convert store data to ReactFlow format
  const nodes: Node[] = modules.map((module) => ({
    id: module.id,
    type: 'module',
    position: module.position,
    data: module,
  }));

  const edges: Edge[] = connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourcePort,
    targetHandle: connection.targetPort,
    animated: false,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  }));

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Store の modules が変更されたら ReactFlow の nodes を更新
  React.useEffect(() => {
    setReactFlowNodes(nodes);
  }, [modules, setReactFlowNodes]);

  // Store の connections が変更されたら ReactFlow の edges を更新  
  React.useEffect(() => {
    setReactFlowEdges(edges);
  }, [connections, setReactFlowEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addConnection({
          source: params.source,
          target: params.target,
          sourcePort: params.sourceHandle || 'output',
          targetPort: params.targetHandle || 'input',
        });
      }
    },
    [addConnection]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      updateModulePosition(node.id, node.position);
    },
    [updateModulePosition]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      selectModule(node.id);
    },
    [selectModule]
  );

  const onPaneClick = useCallback(() => {
    selectModule(null);
  }, [selectModule]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    console.log('🎯 Drag over canvas');
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      console.log('🎯 Drop event triggered!');
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        console.error('❌ No reactFlowBounds');
        return;
      }

      try {
        const rawData = event.dataTransfer.getData('application/json');
        console.log('📦 Raw drop data:', rawData);
        
        const data = JSON.parse(rawData);
        console.log('📦 Parsed drop data:', data);
        
        if (data.type === 'module' && data.definitionId) {
          const position = screenToFlowPosition({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });

          console.log('📍 Calculated position:', position);
          console.log('🔧 Adding module:', data.definitionId);
          
          addModule(data.definitionId, position);
          console.log('✅ Module added successfully!');
        } else {
          console.warn('⚠️ Invalid drop data:', data);
        }
      } catch (error) {
        console.error('❌ Error handling drop:', error);
      }
    },
    [screenToFlowPosition, addModule]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      removeConnection(edge.id);
    },
    [removeConnection]
  );

  // キーボードショートカット（Delete/Backspace）でノード削除
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedModuleId) {
        // 入力フィールドにフォーカスがある場合は削除しない
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT'
        )) {
          return;
        }

        event.preventDefault();
        const selectedModule = modules.find(m => m.id === selectedModuleId);
        if (selectedModule && window.confirm(`"${selectedModule.name}" モジュールを削除しますか？`)) {
          removeModule(selectedModuleId);
          selectModule(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedModuleId, modules, removeModule, selectModule]);

  return (
    <div 
      className={cn('flex-1 bg-white relative', className)} 
      ref={reactFlowWrapper}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        try {
          const rawData = e.dataTransfer.getData('application/json');
          const data = JSON.parse(rawData);
          
          if (data.type === 'module' && data.definitionId) {
            const position = screenToFlowPosition({
              x: e.clientX - reactFlowBounds.left,
              y: e.clientY - reactFlowBounds.top,
            });
            
            addModule(data.definitionId, position);
          }
        } catch (error) {
          console.error('Error handling drop:', error);
        }
      }}
    >
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-lg" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg shadow-lg"
          nodeColor={(node) => {
            const module = modules.find(m => m.id === node.id);
            if (!module) return '#6b7280';
            const definition = getModuleDefinition(module.definitionId);
            return definition?.color || '#6b7280';
          }}
        />
      </ReactFlow>

      {/* Empty State */}
      {modules.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-3">🎵</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              パイプラインの構築を開始
            </h3>
            <p className="text-gray-500 max-w-md text-sm">
              左側のライブラリからモジュールをドラッグして音声処理パイプラインを作成してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function PipelineCanvas({ className }: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner className={className} />
    </ReactFlowProvider>
  );
}
