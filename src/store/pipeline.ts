import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ModuleInstance, Connection, Pipeline, SystemMetrics } from '@/types/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { audioProcessingAPI, DiarizationOptions } from '@/services/api';

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
  executePipeline: (inputFile?: File) => Promise<void>;
  stopExecution: () => void;
  updateExecutionProgress: (moduleId: string, progress: number) => void;
  updateSystemMetrics: (metrics: SystemMetrics) => void;
  
  // Utility actions
  clearPipeline: () => void;
  validatePipeline: () => { isValid: boolean; errors: string[] };
  exportPipelineAsJSON: () => void;
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

      executePipeline: async (inputFile?: File) => {
        const { modules, startExecution, stopExecution, updateExecutionProgress } = get();
        
        try {
          startExecution();
          
          // Find input module and pyannote modules
          const inputModule = modules.find(m => m.definitionId === 'file-input');
          const pyannoteModules = modules.filter(m => 
            m.definitionId === 'vad-pyannote' || m.definitionId === 'diar-pyannote'
          );
          
          if (!inputModule || pyannoteModules.length === 0) {
            throw new Error('パイプラインにはファイル入力とpyannote.ai APIノードが必要です');
          }
          
          if (!inputFile) {
            throw new Error('処理する音声ファイルを選択してください');
          }
          
          // Collect parameters from pyannote modules
          const options: DiarizationOptions = {};
          
          pyannoteModules.forEach(module => {
            const params = module.parameters;
            if (params.model) options.model = params.model;
            if (params.numSpeakers) options.numSpeakers = params.numSpeakers;
            if (params.minSpeakers) options.minSpeakers = params.minSpeakers;
            if (params.maxSpeakers) options.maxSpeakers = params.maxSpeakers;
            if (params.turnLevelConfidence) options.turnLevelConfidence = params.turnLevelConfidence;
            if (params.exclusive) options.exclusive = params.exclusive;
            if (params.confidence) options.confidence = params.confidence;
          });
          
          // Update progress: uploading
          updateExecutionProgress(inputModule.id, 25);
          pyannoteModules.forEach(m => updateExecutionProgress(m.id, 10));
          
          // Execute diarization
          console.log('Starting diarization with options:', options);
          const job = await audioProcessingAPI.uploadAndDiarize(inputFile, {
            ...options,
            waitForCompletion: true
          });
          
          // Update progress: processing
          updateExecutionProgress(inputModule.id, 50);
          pyannoteModules.forEach(m => updateExecutionProgress(m.id, 50));
          
          // Wait for completion and get results
          const result = await audioProcessingAPI.waitForJobCompletion(job.jobId, {
            onStatusUpdate: (status) => {
              console.log('Job status update:', status);
              const progress = status.status === 'running' ? 75 : 
                             status.status === 'succeeded' ? 100 : 50;
              pyannoteModules.forEach(m => updateExecutionProgress(m.id, progress));
            }
          });
          
          // Update final progress
          updateExecutionProgress(inputModule.id, 100);
          pyannoteModules.forEach(m => updateExecutionProgress(m.id, 100));
          
          console.log('Diarization completed:', result);
          
          // Update module status to completed
          set(state => ({
            modules: state.modules.map(m => 
              pyannoteModules.some(pm => pm.id === m.id) || m.id === inputModule.id
                ? { ...m, status: 'completed' as const }
                : m
            )
          }));
          
        } catch (error) {
          console.error('Pipeline execution failed:', error);
          
          // Update module status to error
          set(state => ({
            modules: state.modules.map(m => ({ ...m, status: 'error' as const }))
          }));
          
          throw error;
        } finally {
          setTimeout(() => stopExecution(), 1000);
        }
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
      },

      exportPipelineAsJSON: () => {
        const { currentPipeline, modules, connections } = get();
        if (!currentPipeline) {
          console.warn('No pipeline to export');
          return;
        }

        // Create export data with current state
        const exportData = {
          ...currentPipeline,
          modules,
          connections,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentPipeline.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pipeline.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('Pipeline exported as JSON:', exportData);
      }
    }),
    {
      name: 'pipeline-store'
    }
  )
);
