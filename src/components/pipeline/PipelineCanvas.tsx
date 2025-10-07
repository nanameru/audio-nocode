'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Connection,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { usePipelineStore } from '@/store/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { ModuleNode } from './ModuleNode';
import { AddNodeEdge } from './AddNodeEdge';
import { ModuleSelector } from '@/components/modules/ModuleSelector';
import { cn } from '@/lib/utils';

const nodeTypes: NodeTypes = {
  module: ModuleNode,
};

const edgeTypes: EdgeTypes = {
  addNode: AddNodeEdge as unknown as EdgeTypes[keyof EdgeTypes],
};

interface PipelineCanvasProps {
  className?: string;
}

function PipelineCanvasInner({ className }: PipelineCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState<{ x: number; y: number } | undefined>();
  const [targetEdgeId, setTargetEdgeId] = useState<string | null>(null);
  
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

  // エッジに+ボタンのハンドラーを追加
  const handleAddNodeOnEdge = useCallback((edgeId: string, position: { x: number; y: number }) => {
    setTargetEdgeId(edgeId);
    setSelectorPosition(position);
    setIsSelectorOpen(true);
  }, []);

  const edges: Edge[] = connections.map((connection) => ({
    id: connection.id,
    type: 'addNode',
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourcePort,
    targetHandle: connection.targetPort,
    animated: false,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    data: {
      onAddNode: handleAddNodeOnEdge,
    },
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
      // グリッドにスナップされた位置を取得
      const snappedPosition = {
        x: Math.round(node.position.x / 50) * 50,
        y: Math.round(node.position.y / 50) * 50,
      };

      // 他のモジュールと重なっているかチェック（スワップ機能）
      const overlappingModule = modules.find(m => {
        if (m.id === node.id) return false;
        const dx = Math.abs(m.position.x - snappedPosition.x);
        const dy = Math.abs(m.position.y - snappedPosition.y);
        return dx < 100 && dy < 100; // 100px以内なら重なっていると判定
      });

      if (overlappingModule) {
        // 位置を交換（swapModulePositionsが存在しない場合は通常の更新）
        updateModulePosition(node.id, snappedPosition);
      } else {
        // 通常の位置更新
        updateModulePosition(node.id, snappedPosition);
      }
    },
    [updateModulePosition, modules]
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

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      removeConnection(edge.id);
    },
    [removeConnection]
  );

  // モジュールセレクターでモジュールを選択した時の処理
  const handleModuleSelect = useCallback((definitionId: string) => {
    if (!targetEdgeId || !selectorPosition) return;

    // エッジの接続情報を取得
    const connection = connections.find(c => c.id === targetEdgeId);
    if (!connection) return;

    // フロー座標に変換
    const flowPosition = screenToFlowPosition(selectorPosition);

    // 新しいモジュールを追加
    addModule(definitionId, flowPosition);

    // TODO: 既存のエッジを削除し、新しいモジュールを経由する2つのエッジを作成
    // これは次のフレームで実行する（モジュールIDが必要）
    
    setIsSelectorOpen(false);
    setTargetEdgeId(null);
    setSelectorPosition(undefined);
  }, [targetEdgeId, selectorPosition, connections, addModule, screenToFlowPosition]);

  // キーボードショートカット（Delete/Backspace）でノード削除、Ctrl/Cmd + ↑↓で順序変更
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は処理しない
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      )) {
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedModuleId) {
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
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-lg" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg shadow-lg"
          nodeColor={(node) => {
            const moduleInstance = modules.find(m => m.id === node.id);
            if (!moduleInstance) return '#6b7280';
            const definition = getModuleDefinition(moduleInstance.definitionId);
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

      {/* Module Selector Dialog */}
      <ModuleSelector
        isOpen={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false);
          setTargetEdgeId(null);
          setSelectorPosition(undefined);
        }}
        onSelect={handleModuleSelect}
        position={selectorPosition}
      />
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
