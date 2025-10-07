'use client';

import { useState, useEffect } from 'react';
import { DiarizationResult } from '@/types/pipeline';
import { Users, MessageSquare, Clock, CheckCircle, Download, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { audioProcessingAPI } from '@/services/api';
import { ExecutionHistorySelector } from './ExecutionHistorySelector';
import { usePipelineStore } from '@/store/pipeline';

interface DiarizationResultsProps {
  result: DiarizationResult;
}

interface Segment {
  start: number;
  end: number;
  speaker: string;
}

export function DiarizationResults({ result }: DiarizationResultsProps) {
  const { currentPipeline, getExecutionHistory } = usePipelineStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [showHistorySelector, setShowHistorySelector] = useState(false);
  
  const history = currentPipeline ? getExecutionHistory(currentPipeline.id) : [];
  const hasHistory = history.length > 1;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // GCS URLから結果をダウンロード
      const data = await audioProcessingAPI.downloadResult(result.output_gs_uri);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diarization_result_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download results:', error);
      alert('結果のダウンロードに失敗しました。もう一度お試しください。');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const loadSegments = async () => {
      try {
        setIsLoadingSegments(true);
        const data = await audioProcessingAPI.downloadResult(result.output_gs_uri);
        
        // データが配列そのものか、segments プロパティを持つオブジェクトか判定
        if (Array.isArray(data)) {
          setSegments(data);
        } else if (data.segments && Array.isArray(data.segments)) {
          setSegments(data.segments);
        }
      } catch (error) {
        console.error('Failed to load segments:', error);
      } finally {
        setIsLoadingSegments(false);
      }
    };

    loadSegments();
  }, [result.output_gs_uri]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* ステータス */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium text-green-900">
          {result.status === 'success' ? '処理完了' : result.status}
        </span>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3">
        {/* 話者数 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">話者数</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {result.speaker_count}人
          </div>
        </div>

        {/* セグメント数 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">セグメント数</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {result.segment_count}
          </div>
        </div>
      </div>

      {/* タイムスタンプ */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600">
          処理日時: {formatDate(result.timestamp)}
        </span>
      </div>

      {/* 出力先 */}
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-xs text-gray-600 mb-1">出力先</div>
        <div className="text-xs text-gray-800 font-mono break-all">
          {result.output_gs_uri}
        </div>
      </div>

      {/* セグメント詳細 */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <button
          onClick={() => setShowSegments(!showSegments)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">セグメント詳細</span>
            {isLoadingSegments && (
              <span className="text-xs text-gray-500">(読み込み中...)</span>
            )}
          </div>
          {showSegments ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
        
        {showSegments && segments.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">話者</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">開始</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">終了</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {segments.map((segment, index) => {
                  const duration = segment.end - segment.start;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{segment.speaker}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.start)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.end)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{duration.toFixed(2)}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {showSegments && segments.length === 0 && !isLoadingSegments && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            セグメントデータが見つかりませんでした
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'ダウンロード中...' : '詳細データをダウンロード'}
        </button>
        
        {hasHistory && (
          <button
            onClick={() => setShowHistorySelector(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            <GitCompare className="h-4 w-4" />
            過去の実行と差分比較
          </button>
        )}
      </div>

      {/* 説明 */}
      <div className="text-xs text-gray-500 px-2">
        <p>
          この結果は音声ファイルから自動的に話者を識別し、各話者の発言時間帯を検出したものです。
          詳細データには、各セグメントの開始・終了時刻と話者情報が含まれています。
        </p>
      </div>
      
      {showHistorySelector && (
        <ExecutionHistorySelector
          workflowId={currentPipeline?.id}
          onClose={() => setShowHistorySelector(false)}
        />
      )}
    </div>
  );
}

