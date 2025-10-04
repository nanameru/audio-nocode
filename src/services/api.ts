/**
 * API client for backend communication
 * Integrates with Python FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set. Please check your .env.local file.');
}

export interface SignedUrlResponse {
  signed_url: string;
  gs_uri: string;
  expires_in: number;
}

export interface DiarizationJob {
  job_id: string;
  input: string;
  output: string;
  status: 'SUBMITTED' | 'QUEUED' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  state?: string;
  create_time?: string;
  update_time?: string;
}

export interface JobCreationResponse {
  job_id: string;
  input: string;
  output: string;
  status: string;
}

export interface DiarizationOptions {
  webhookUrl?: string;
  waitForCompletion?: boolean;
  // pyannote.ai API parameters
  model?: 'precision-1' | 'precision-2' | 'precision-3';
  numSpeakers?: number;
  minSpeakers?: number;
  maxSpeakers?: number;
  turnLevelConfidence?: boolean;
  exclusive?: boolean;
  confidence?: boolean;
  useGpu?: boolean;
}

export interface Pyannote31Options extends DiarizationOptions {
  // pyannote 3.1 specific parameters (useGpu is inherited from DiarizationOptions)
  progressMonitoring?: boolean;
  memoryOptimized?: boolean;
  enhancedFeatures?: boolean;
  voiceActivityDetection?: boolean;
  minDuration?: number;
  clusteringThreshold?: number;
  batchSize?: 'small' | 'medium' | 'large' | 'auto';
}

export class AudioProcessingAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; project: string; region: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get signed URL for direct upload to GCS
   */
  async getSignedUrl(fileName: string, contentType: string = 'audio/wav'): Promise<SignedUrlResponse> {
    const response = await fetch(`${this.baseUrl}/sign-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: fileName,
        content_type: contentType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to get signed URL: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload file directly to GCS using signed URL
   */
  async uploadToGCS(file: File, signedUrl: string): Promise<void> {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'audio/wav',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to GCS: ${response.status}`);
    }
  }

  /**
   * Upload audio file and start diarization (New Cloud Run flow)
   */
  async uploadAndDiarize(
    file: File,
    options: DiarizationOptions = {}
  ): Promise<JobCreationResponse> {
    // 1) Get signed URL
    const { signed_url, gs_uri } = await this.getSignedUrl(file.name, file.type);

    // 2) Upload to GCS
    await this.uploadToGCS(file, signed_url);

    // 3) Start Vertex AI job
    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_gs_uri: gs_uri,
        use_gpu: options.useGpu !== undefined ? options.useGpu : true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Job creation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload audio file and start pyannote 3.1 diarization (Cloud Run flow)
   */
  async uploadAndDiarizePyannote31(
    file: File,
    options: Pyannote31Options = {}
  ): Promise<JobCreationResponse> {
    // Cloud Run と同じフローを使用（pyannote 3.1 がデフォルト）
    return this.uploadAndDiarize(file, options);
  }

  /**
   * Start diarization from URL
   */
  async diarizeFromUrl(
    audioUrl: string,
    options: DiarizationOptions = {}
  ): Promise<JobCreationResponse> {
    const response = await fetch(`${this.baseUrl}/api/diarization/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
        webhook: options.webhookUrl,
        model: options.model,
        numSpeakers: options.numSpeakers,
        minSpeakers: options.minSpeakers,
        maxSpeakers: options.maxSpeakers,
        turnLevelConfidence: options.turnLevelConfidence,
        exclusive: options.exclusive,
        confidence: options.confidence,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Diarization failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<DiarizationJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to get job status: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Stream job progress via SSE
   */
  subscribeToJobProgress(
    jobId: string,
    onMessage: (data: { state?: string; status?: string; message?: string }) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const eventSource = new EventSource(`${this.baseUrl}/events/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      if (onError) {
        onError(new Error('SSE connection error'));
      }
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Download result JSON from GCS
   */
  async downloadResult(gsUri: string): Promise<Record<string, unknown>> {
    // GCSから直接ダウンロード（公開バケットの場合）
    const publicUrl = gsUri.replace('gs://', 'https://storage.googleapis.com/');
    const response = await fetch(publicUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download result: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<DiarizationJob[]> {
    const response = await fetch(`${this.baseUrl}/api/diarization/jobs`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to list jobs: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Cancel and remove a job
   */
  async cancelJob(jobId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/diarization/jobs/${jobId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to cancel job: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Poll job status until completion
   */
  async waitForJobCompletion(
    jobId: string,
    options: {
      pollInterval?: number;
      maxWaitTime?: number;
      onStatusUpdate?: (status: DiarizationJob) => void;
    } = {}
  ): Promise<DiarizationJob> {
    const { pollInterval = 5000, maxWaitTime = 1800000, onStatusUpdate } = options; // 30分（CPUモード対応）
    const startTime = Date.now();

    while (true) {
      const status = await this.getJobStatus(jobId);
      
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      // Check if job is completed
      if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(status.status)) {
        return status;
      }

      // Check timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Process audio locally in Cloud Run (no Vertex AI Custom Jobs)
   * 即座に処理開始、Job待ち時間ゼロ
   */
  async processLocal(
    file: File,
    options: Pyannote31Options = {}
  ): Promise<{ status: string; output_gs_uri: string; speaker_count: number; segment_count: number }> {
    // 1) Get signed URL
    const { signed_url, gs_uri } = await this.getSignedUrl(file.name, file.type);

    // 2) Upload to GCS
    await this.uploadToGCS(file, signed_url);

    // 3) Start local processing
    console.log('processLocal: Sending request with useGpu =', options.useGpu);
    const response = await fetch(`${this.baseUrl}/process-local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_gs_uri: gs_uri,
        use_gpu: options.useGpu !== undefined ? options.useGpu : true, // デフォルトはGPU
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Local processing failed: ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const audioProcessingAPI = new AudioProcessingAPI();
