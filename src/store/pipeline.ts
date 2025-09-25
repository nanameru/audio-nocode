import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ModuleInstance, Connection, Pipeline, SystemMetrics } from '@/types/pipeline';
import { getModuleDefinition } from '@/data/modules';

interface PipelineState {
  // Pipeline data
  currentPipeline: Pipeline | null;
  modules: ModuleInstance[];
  connections: Connection[];
  
  // UI state
  selectedModuleId: string | null;
  isExecuting: boolean;
  executionProgress: Record<string, number>;
  systemMetrics: SystemMetrics | null;
  
  // Actions
  createPipeline: (name: string, description?: string) => void;
  loadPipeline: (pipeline: Pipeline) => void;
  savePipeline: () => void;
  
  // Module actions
  addModule: (definitionId: string, position: { x: number; y: number }) => void;
  removeModule: (moduleId: string) => void;
  updateModulePosition: (moduleId: string, position: { x: number; y: number }) => void;
  updateModuleParameters: (moduleId: string, parameters: Record<string, any>) => void;
  selectModule: (moduleId: string | null) => void;
  
  // Connection actions
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  removeConnection: (connectionId: string) => void;
  
  // Execution actions
  startExecution: () => void;
  stopExecution: () => void;
  updateExecutionProgress: (moduleId: string, progress: number) => void;
  updateSystemMetrics: (metrics: SystemMetrics) => void;
  
  // Utility actions
  clearPipeline: () => void;
  validatePipeline: () => { isValid: boolean; errors: string[] };
}

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentPipeline: null,
      modules: [],
      connections: [],
      selectedModuleId: null,
      isExecuting: false,
      executionProgress: {},
      systemMetrics: null,

      // Pipeline actions
      createPipeline: (name: string, description?: string) => {
        const pipeline: Pipeline = {
          id: `pipeline-${Date.now()}`,
          name,
          description,
          modules: [],
          connections: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set({
          currentPipeline: pipeline,
          modules: [],
          connections: [],
          selectedModuleId: null
        });
      },

      loadPipeline: (pipeline: Pipeline) => {
        set({
          currentPipeline: pipeline,
          modules: pipeline.modules,
          connections: pipeline.connections,
          selectedModuleId: null
        });
      },

      savePipeline: () => {
        const { currentPipeline, modules, connections } = get();
        if (!currentPipeline) return;

        const updatedPipeline: Pipeline = {
          ...currentPipeline,
          modules,
          connections,
          updatedAt: new Date()
        };

        set({ currentPipeline: updatedPipeline });
        
        // TODO: Save to backend or localStorage
        localStorage.setItem(`pipeline-${updatedPipeline.id}`, JSON.stringify(updatedPipeline));
      },

      // Module actions
      addModule: (definitionId: string, position: { x: number; y: number }) => {
        const definition = getModuleDefinition(definitionId);
        if (!definition) return;

        const newModule: ModuleInstance = {
          id: `module-${Date.now()}`,
          definitionId,
          name: definition.name,
          type: definition.type,
          icon: definition.icon,
          position,
          parameters: Object.fromEntries(
            Object.entries(definition.parameters).map(([key, param]) => [key, param.default])
          ),
          status: 'idle'
        };

        set(state => ({
          modules: [...state.modules, newModule]
        }));
      },

      removeModule: (moduleId: string) => {
        set(state => ({
          modules: state.modules.filter(m => m.id !== moduleId),
          connections: state.connections.filter(c => c.source !== moduleId && c.target !== moduleId),
          selectedModuleId: state.selectedModuleId === moduleId ? null : state.selectedModuleId
        }));
      },

      updateModulePosition: (moduleId: string, position: { x: number; y: number }) => {
        set(state => ({
          modules: state.modules.map(m => 
            m.id === moduleId ? { ...m, position } : m
          )
        }));
      },

      updateModuleParameters: (moduleId: string, parameters: Record<string, any>) => {
        set(state => ({
          modules: state.modules.map(m => 
            m.id === moduleId ? { ...m, parameters: { ...m.parameters, ...parameters } } : m
          )
        }));
      },

      selectModule: (moduleId: string | null) => {
        set({ selectedModuleId: moduleId });
      },

      // Connection actions
      addConnection: (connection: Omit<Connection, 'id'>) => {
        const newConnection: Connection = {
          ...connection,
          id: `connection-${Date.now()}`
        };

        set(state => ({
          connections: [...state.connections, newConnection]
        }));
      },

      removeConnection: (connectionId: string) => {
        set(state => ({
          connections: state.connections.filter(c => c.id !== connectionId)
        }));
      },

      // Execution actions
      startExecution: () => {
        const { modules } = get();
        const initialProgress = Object.fromEntries(
          modules.map(m => [m.id, 0])
        );

        set({
          isExecuting: true,
          executionProgress: initialProgress,
          modules: modules.map(m => ({ ...m, status: 'idle' as const }))
        });
      },

      stopExecution: () => {
        set({
          isExecuting: false,
          executionProgress: {},
          modules: get().modules.map(m => ({ ...m, status: 'idle' as const }))
        });
      },

      updateExecutionProgress: (moduleId: string, progress: number) => {
        set(state => ({
          executionProgress: {
            ...state.executionProgress,
            [moduleId]: progress
          },
          modules: state.modules.map(m => 
            m.id === moduleId 
              ? { 
                  ...m, 
                  status: progress === 100 ? 'completed' as const : 'running' as const,
                  progress 
                }
              : m
          )
        }));
      },

      updateSystemMetrics: (metrics: SystemMetrics) => {
        set({ systemMetrics: metrics });
      },

      // Utility actions
      clearPipeline: () => {
        set({
          modules: [],
          connections: [],
          selectedModuleId: null,
          isExecuting: false,
          executionProgress: {}
        });
      },

      validatePipeline: () => {
        const { modules, connections } = get();
        const errors: string[] = [];

        // Check if pipeline has input and output
        const hasInput = modules.some(m => m.type === 'input');
        const hasOutput = modules.some(m => m.type === 'output');

        if (!hasInput) {
          errors.push('Pipeline must have at least one input module');
        }

        if (!hasOutput) {
          errors.push('Pipeline must have at least one output module');
        }

        // Check for disconnected modules
        const connectedModules = new Set<string>();
        connections.forEach(conn => {
          connectedModules.add(conn.source);
          connectedModules.add(conn.target);
        });

        const disconnectedModules = modules.filter(m => 
          m.type === 'processing' && !connectedModules.has(m.id)
        );

        if (disconnectedModules.length > 0) {
          errors.push(`Disconnected modules: ${disconnectedModules.map(m => m.name).join(', ')}`);
        }

        // Check for cycles (basic check)
        // TODO: Implement proper cycle detection

        return {
          isValid: errors.length === 0,
          errors
        };
      }
    }),
    {
      name: 'pipeline-store'
    }
  )
);
