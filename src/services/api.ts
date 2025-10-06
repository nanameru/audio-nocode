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

export interface Pyannote31Options extends Omit<DiarizationOptions, 'model'> {
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
   * Download result JSON from GCS using signed URL
   */
  async downloadResult(gsUri: string): Promise<Record<string, unknown>> {
    // バックエンドから署名付きダウンロードURLを取得
    const urlResponse = await fetch(`${this.baseUrl}/download-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gs_uri: gsUri }),
    });
    
    if (!urlResponse.ok) {
      throw new Error(`Failed to get download URL: ${urlResponse.status}`);
    }
    
    const { signed_url } = await urlResponse.json();
    
    // 署名付きURLを使ってファイルをダウンロード
    const response = await fetch(signed_url);
    
    if (!response.ok) {
      throw new Error(`Failed to download result: ${response.status}`);
    }
    
    return response.json();
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
        model: '3.1', // Always use pyannote 3.1
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
