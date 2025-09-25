/**
 * API client for backend communication
 * Integrates with Python FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DiarizationJob {
  jobId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';
  message?: string;
  output?: {
    diarization: Array<{
      start: number;
      end: number;
      speaker: string;
    }>;
  };
  created_at?: string;
  completed_at?: string;
}

export interface JobCreationResponse {
  jobId: string;
  status: string;
  message: string;
}

export class AudioProcessingAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Test backend connection and pyannote.ai API
   */
  async testConnection(): Promise<{ status: string; message: string; api_key_valid: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/diarization/test`);
    
    if (!response.ok) {
      throw new Error(`API test failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Upload audio file and start diarization
   */
  async uploadAndDiarize(
    file: File,
    options: {
      webhookUrl?: string;
      waitForCompletion?: boolean;
    } = {}
  ): Promise<JobCreationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.webhookUrl) {
      formData.append('webhook_url', options.webhookUrl);
    }
    
    if (options.waitForCompletion !== undefined) {
      formData.append('wait_for_completion', options.waitForCompletion.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/diarization/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start diarization from URL
   */
  async diarizeFromUrl(
    audioUrl: string,
    options: {
      webhookUrl?: string;
      waitForCompletion?: boolean;
    } = {}
  ): Promise<JobCreationResponse> {
    const response = await fetch(`${this.baseUrl}/api/diarization/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
        webhook: options.webhookUrl,
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
    const response = await fetch(`${this.baseUrl}/api/diarization/jobs/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to get job status: ${response.status}`);
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
    const { pollInterval = 5000, maxWaitTime = 300000, onStatusUpdate } = options;
    const startTime = Date.now();

    while (true) {
      const status = await this.getJobStatus(jobId);
      
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      // Check if job is completed
      if (['succeeded', 'failed', 'canceled'].includes(status.status)) {
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
   * Health check
   */
  async healthCheck(): Promise<{ status: string; pyannote_api: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }
}

// Export singleton instance
export const audioProcessingAPI = new AudioProcessingAPI();
