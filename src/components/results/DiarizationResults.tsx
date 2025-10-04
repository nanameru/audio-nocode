'use client';

import { DiarizationResult } from '@/types/pipeline';
import { Users, MessageSquare, Clock, CheckCircle, Download } from 'lucide-react';

interface DiarizationResultsProps {
  result: DiarizationResult;
}

export function DiarizationResults({ result }: DiarizationResultsProps) {
  const handleDownload = () => {
    // GCS URLから結果をダウンロード
    console.log('Downloading results from:', result.output_gs_uri);
    // TODO: 実装 - APIを通じてGCSからデータを取得
  };

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

      {/* ダウンロードボタン */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
      >
        <Download className="h-4 w-4" />
        詳細データをダウンロード
      </button>

      {/* 説明 */}
      <div className="text-xs text-gray-500 px-2">
        <p>
          この結果は音声ファイルから自動的に話者を識別し、各話者の発言時間帯を検出したものです。
          詳細データには、各セグメントの開始・終了時刻と話者情報が含まれています。
        </p>
      </div>
    </div>
  );
}

