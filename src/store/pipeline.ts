import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ModuleInstance, Connection, Pipeline, SystemMetrics, DiarizationResult } from '@/types/pipeline';
import { getModuleDefinition } from '@/data/modules';
import { audioProcessingAPI, DiarizationOptions, Pyannote31Options } from '@/services/api';

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  module?: string;
  details?: string;
}

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
  executionLogs: ExecutionLog[];
  
  // Results
  diarizationResults: Record<string, DiarizationResult>; // moduleId -> result
  
  // Actions
  createPipeline: (name: string, description?: string) => void;
  loadPipeline: (pipeline: Pipeline) => void;
  savePipeline: () => void;
  
  // Module actions
  addModule: (definitionId: string, position: { x: number; y: number }) => void;
  removeModule: (moduleId: string) => void;
  updateModulePosition: (moduleId: string, position: { x: number; y: number }) => void;
  updateModuleParameters: (moduleId: string, parameters: Record<string, string | number | boolean>) => void;
  selectModule: (moduleId: string | null) => void;
  reorderModule: (moduleId: string, newIndex: number) => void;
  moveModuleUp: (moduleId: string) => void;
  moveModuleDown: (moduleId: string) => void;
  
  // Connection actions
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  removeConnection: (connectionId: string) => void;
  
  // Execution actions
  startExecution: () => void;
  executePipeline: (inputFile?: File) => Promise<void>;
  stopExecution: () => void;
  updateExecutionProgress: (moduleId: string, progress: number) => void;
  updateSystemMetrics: (metrics: SystemMetrics) => void;
  addExecutionLog: (log: Omit<ExecutionLog, 'timestamp'>) => void;
  clearExecutionLogs: () => void;
  
  // Result actions
  setDiarizationResult: (moduleId: string, result: Omit<DiarizationResult, 'moduleId' | 'timestamp'>) => void;
  clearResults: () => void;
  
  // Utility actions
  clearPipeline: () => void;
  validatePipeline: () => { isValid: boolean; errors: string[] };
  exportPipelineAsJSON: () => void;
  importPipelineFromJSON: (file: File) => Promise<void>;
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
      diarizationResults: {},
      executionLogs: [],

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
            Object.entries(definition.parameters)
              .filter(([, param]) => param.default !== undefined)
              .map(([key, param]) => [key, param.default as string | number | boolean])
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

      updateModuleParameters: (moduleId: string, parameters: Record<string, string | number | boolean>) => {
        set(state => ({
          modules: state.modules.map(m => 
            m.id === moduleId ? { ...m, parameters: { ...m.parameters, ...parameters } } : m
          )
        }));
      },

      selectModule: (moduleId: string | null) => {
        set({ selectedModuleId: moduleId });
      },

      reorderModule: (moduleId: string, newIndex: number) => {
        set(state => {
          const modules = [...state.modules];
          const currentIndex = modules.findIndex(m => m.id === moduleId);
          
          if (currentIndex === -1 || newIndex < 0 || newIndex >= modules.length) {
            return state;
          }
          
          const [module] = modules.splice(currentIndex, 1);
          modules.splice(newIndex, 0, module);
          
          return { modules };
        });
      },

      moveModuleUp: (moduleId: string) => {
        const { modules, reorderModule } = get();
        const currentIndex = modules.findIndex(m => m.id === moduleId);
        
        if (currentIndex > 0) {
          reorderModule(moduleId, currentIndex - 1);
        }
      },

      moveModuleDown: (moduleId: string) => {
        const { modules, reorderModule } = get();
        const currentIndex = modules.findIndex(m => m.id === moduleId);
        
        if (currentIndex < modules.length - 1 && currentIndex !== -1) {
          reorderModule(moduleId, currentIndex + 1);
        }
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
          modules: modules.map(m => ({ ...m, status: 'idle' as const })),
          executionLogs: []
        });
        
        get().addExecutionLog({
          level: 'info',
          message: 'パイプライン実行を開始しました',
        });
      },

      executePipeline: async (inputFile?: File) => {
        const { modules, startExecution, stopExecution, updateExecutionProgress, addExecutionLog } = get();
        
        try {
          startExecution();
          
          addExecutionLog({
            level: 'info',
            message: 'パイプライン検証中...',
          });
          
          // Find input module and pyannote modules
          const inputModule = modules.find(m => m.definitionId === 'file-input');
          const pyannoteModules = modules.filter(m => 
            m.definitionId === 'vad-pyannote' || 
            m.definitionId === 'diar-pyannote' || 
            m.definitionId === 'diar-pyannote31'
          );
          
          if (!inputModule || pyannoteModules.length === 0) {
            addExecutionLog({
              level: 'error',
              message: 'パイプライン検証エラー',
              details: 'ファイル入力とpyannote.ai APIノードが必要です'
            });
            throw new Error('パイプラインにはファイル入力とpyannote.ai APIノードが必要です');
          }
          
          if (!inputFile) {
            addExecutionLog({
              level: 'error',
              message: '音声ファイルが選択されていません',
            });
            throw new Error('処理する音声ファイルを選択してください');
          }
          
          addExecutionLog({
            level: 'success',
            message: 'パイプライン検証完了',
            details: `ファイル: ${inputFile.name} (${(inputFile.size / 1024 / 1024).toFixed(2)} MB)`
          });
          
          // Check if we have pyannote 3.1 modules
          const hasPyannote31 = pyannoteModules.some(m => m.definitionId === 'diar-pyannote31');
          
          // Collect parameters from pyannote modules
          let result: { status: string; output_gs_uri?: string; speaker_count?: number; segment_count?: number; output?: string };
          
          if (hasPyannote31) {
            // Use pyannote 3.1 LOCAL processing (Cloud Run constant residence)
            const options: Pyannote31Options = {};
            
            pyannoteModules.forEach(module => {
              const params = module.parameters;
              
              // Basic parameters
              if (typeof params.numSpeakers === 'number') options.numSpeakers = params.numSpeakers;
              if (typeof params.minSpeakers === 'number') options.minSpeakers = params.minSpeakers;
              if (typeof params.maxSpeakers === 'number') options.maxSpeakers = params.maxSpeakers;
              if (typeof params.turnLevelConfidence === 'boolean') options.turnLevelConfidence = params.turnLevelConfidence;
              if (typeof params.exclusive === 'boolean') options.exclusive = params.exclusive;
              if (typeof params.confidence === 'boolean') options.confidence = params.confidence;
              
              // pyannote 3.1 specific parameters
              if (typeof params.useGpu === 'boolean') options.useGpu = params.useGpu;
              if (typeof params.progressMonitoring === 'boolean') options.progressMonitoring = params.progressMonitoring;
              if (typeof params.memoryOptimized === 'boolean') options.memoryOptimized = params.memoryOptimized;
              if (typeof params.enhancedFeatures === 'boolean') options.enhancedFeatures = params.enhancedFeatures;
              if (typeof params.voiceActivityDetection === 'boolean') options.voiceActivityDetection = params.voiceActivityDetection;
              if (typeof params.minDuration === 'number') options.minDuration = params.minDuration;
              if (typeof params.clusteringThreshold === 'number') options.clusteringThreshold = params.clusteringThreshold;
              if (typeof params.batchSize === 'string') options.batchSize = params.batchSize as 'small' | 'medium' | 'large' | 'auto';
            });
            
            // Update progress: uploading
            addExecutionLog({
              level: 'info',
              message: 'GCSへ音声ファイルをアップロード中...',
              module: inputModule.name
            });
            updateExecutionProgress(inputModule.id, 15);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 5));
            
            // Get signed URL and upload
            const { signed_url, gs_uri } = await audioProcessingAPI.getSignedUrl(inputFile.name, inputFile.type);
            addExecutionLog({
              level: 'info',
              message: 'アップロード URL取得完了',
              details: gs_uri
            });
            updateExecutionProgress(inputModule.id, 30);
            
            await audioProcessingAPI.uploadToGCS(inputFile, signed_url);
            addExecutionLog({
              level: 'success',
              message: 'アップロード完了',
              module: inputModule.name
            });
            updateExecutionProgress(inputModule.id, 50);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 20));
            
            // Execute pyannote 3.1 LOCAL processing
            addExecutionLog({
              level: 'info',
              message: 'pyannote 3.1 話者分離処理を開始',
              details: `GPU: ${options.useGpu ? '有効' : '無効'}`,
              module: pyannoteModules[0]?.name
            });
            updateExecutionProgress(inputModule.id, 60);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 40));
            
            // Call process local
            result = await audioProcessingAPI.processLocal(inputFile, options);
            
            addExecutionLog({
              level: 'info',
              message: '音声分析中...',
              module: pyannoteModules[0]?.name
            });
            updateExecutionProgress(inputModule.id, 75);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 60));
            
            // Update final progress
            updateExecutionProgress(inputModule.id, 100);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 100));
            
            console.log('Diarization completed:', result);
            
            // 結果を保存（pyannoteモジュールとJSON出力ノードに）
            const saveResult = (moduleId: string) => {
              if (result.output_gs_uri && result.speaker_count !== undefined && result.segment_count !== undefined) {
                get().setDiarizationResult(moduleId, {
                  status: result.status,
                  output_gs_uri: result.output_gs_uri,
                  speaker_count: result.speaker_count,
                  segment_count: result.segment_count
                });
              }
            };
            
            pyannoteModules.forEach(module => saveResult(module.id));
            
            // JSON出力ノードにも結果を保存
            const outputModules = modules.filter(m => m.type === 'output');
            outputModules.forEach(module => saveResult(module.id));
            
          } else {
            // Use standard pyannote API (Vertex AI Custom Jobs)
            const options: DiarizationOptions = {};
            
            pyannoteModules.forEach(module => {
              const params = module.parameters;
              if (typeof params.model === 'string') options.model = params.model as 'precision-1' | 'precision-2' | 'precision-3';
              if (typeof params.numSpeakers === 'number') options.numSpeakers = params.numSpeakers;
              if (typeof params.minSpeakers === 'number') options.minSpeakers = params.minSpeakers;
              if (typeof params.maxSpeakers === 'number') options.maxSpeakers = params.maxSpeakers;
              if (typeof params.turnLevelConfidence === 'boolean') options.turnLevelConfidence = params.turnLevelConfidence;
              if (typeof params.exclusive === 'boolean') options.exclusive = params.exclusive;
              if (typeof params.confidence === 'boolean') options.confidence = params.confidence;
            });
            
            // Update progress: uploading
            updateExecutionProgress(inputModule.id, 25);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 10));
            
            // Execute standard diarization (Cloud Run + Vertex AI)
            console.log('Starting Cloud Run diarization with options:', options);
            const job = await audioProcessingAPI.uploadAndDiarize(inputFile, options);
            
            // Update progress: processing
            updateExecutionProgress(inputModule.id, 50);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 50));
            
            // Wait for completion and get results
            result = await audioProcessingAPI.waitForJobCompletion(job.job_id, {
              onStatusUpdate: (status) => {
                console.log('Job status update:', status);
                const progress = status.status === 'RUNNING' ? 75 : 
                               status.status === 'SUCCEEDED' ? 100 : 50;
                pyannoteModules.forEach(m => updateExecutionProgress(m.id, progress));
              }
            });
            
            // Update final progress
            updateExecutionProgress(inputModule.id, 100);
            pyannoteModules.forEach(m => updateExecutionProgress(m.id, 100));
            
            console.log('Diarization completed:', result);
          }
          
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
      
      addExecutionLog: (log: Omit<ExecutionLog, 'timestamp'>) => {
        set(state => ({
          executionLogs: [
            ...state.executionLogs,
            {
              ...log,
              timestamp: new Date()
            }
          ]
        }));
      },
      
      clearExecutionLogs: () => {
        set({ executionLogs: [] });
      },

      // Result actions
      setDiarizationResult: (moduleId: string, result: Omit<DiarizationResult, 'moduleId' | 'timestamp'>) => {
        set(state => ({
          diarizationResults: {
            ...state.diarizationResults,
            [moduleId]: {
              ...result,
              moduleId,
              timestamp: new Date()
            }
          }
        }));
      },

      clearResults: () => {
        set({ diarizationResults: {} });
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
          m.type !== 'input' && m.type !== 'output' && !connectedModules.has(m.id)
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
      },

      importPipelineFromJSON: async (file: File) => {
        try {
          const fileContent = await file.text();
          const importedData = JSON.parse(fileContent);
          
          // Validate imported data structure
          if (!importedData.id || !importedData.name || !Array.isArray(importedData.modules) || !Array.isArray(importedData.connections)) {
            throw new Error('無効なパイプラインファイル形式です');
          }
          
          // Validate modules have required fields
          for (const importedModule of importedData.modules) {
            if (!importedModule.id || !importedModule.definitionId || !importedModule.name || !importedModule.type) {
              throw new Error('モジュールデータが不正です');
            }
            
            // Check if module definition exists
            const definition = getModuleDefinition(importedModule.definitionId);
            if (!definition) {
              console.warn(`Module definition not found for: ${importedModule.definitionId}`);
            }
          }
          
          // Create new pipeline with imported data
          const pipeline: Pipeline = {
            ...importedData,
            id: `pipeline-${Date.now()}`, // Generate new ID to avoid conflicts
            createdAt: new Date(),
            updatedAt: new Date(),
            modules: importedData.modules.map((mod: ModuleInstance) => ({
              ...mod,
              id: `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new IDs
              status: 'idle' as const
            })),
            connections: importedData.connections.map((connection: Connection, index: number) => ({
              ...connection,
              id: `connection-${Date.now()}-${index}` // Generate new IDs
            }))
          };
          
          // Update module IDs in connections
          const moduleIdMap = new Map<string, string>();
          importedData.modules.forEach((originalMod: ModuleInstance, index: number) => {
            moduleIdMap.set(originalMod.id, pipeline.modules[index].id);
          });
          
          pipeline.connections = pipeline.connections.map(connection => ({
            ...connection,
            source: moduleIdMap.get(connection.source) || connection.source,
            target: moduleIdMap.get(connection.target) || connection.target
          }));
          
          // Load the imported pipeline
          set({
            currentPipeline: pipeline,
            modules: pipeline.modules,
            connections: pipeline.connections,
            selectedModuleId: null,
            isExecuting: false,
            executionProgress: {}
          });
          
          console.log('Pipeline imported successfully:', pipeline);
          
        } catch (error) {
          console.error('Failed to import pipeline:', error);
          throw new Error(`パイプラインのインポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }
    }),
    {
      name: 'pipeline-store'
    }
  )
);
