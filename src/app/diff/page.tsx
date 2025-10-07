'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePipelineStore } from '@/store/pipeline';
import { ExecutionHistoryEntry } from '@/types/pipeline';
import { ArrowLeft, Users, MessageSquare, Clock, FileAudio, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioProcessingAPI } from '@/services/api';

interface Segment {
  start: number;
  end: number;
  speaker: string;
}

interface SegmentDataResponse {
  segments?: Segment[];
}

interface ComparisonData {
  execution1: ExecutionHistoryEntry;
  execution2: ExecutionHistoryEntry;
  segments1: Segment[];
  segments2: Segment[];
}

function DiffPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getExecutionHistory } = usePipelineStore();
  
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showParameters, setShowParameters] = useState(false);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);

  useEffect(() => {
    const loadComparisonData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const exec1Id = searchParams.get('exec1');
        const exec2Id = searchParams.get('exec2');

        if (!exec1Id || !exec2Id) {
          setError('比較する実行を選択してください');
          setIsLoading(false);
          return;
        }

        const history = getExecutionHistory();
        const execution1 = history.find(e => e.id === exec1Id);
        const execution2 = history.find(e => e.id === exec2Id);

        if (!execution1 || !execution2) {
          setError('実行データが見つかりませんでした');
          setIsLoading(false);
          return;
        }

        const [segments1Data, segments2Data] = await Promise.all([
          audioProcessingAPI.downloadResult(execution1.result.output_gs_uri),
          audioProcessingAPI.downloadResult(execution2.result.output_gs_uri),
        ]);

        const segments1: Segment[] = Array.isArray(segments1Data) 
          ? segments1Data 
          : (Array.isArray((segments1Data as SegmentDataResponse)?.segments) ? (segments1Data as SegmentDataResponse).segments || [] : []);
        const segments2: Segment[] = Array.isArray(segments2Data) 
          ? segments2Data 
          : (Array.isArray((segments2Data as SegmentDataResponse)?.segments) ? (segments2Data as SegmentDataResponse).segments || [] : []);

        setComparisonData({
          execution1,
          execution2,
          segments1,
          segments2,
        });
      } catch (err) {
        console.error('Failed to load comparison data:', err);
        setError('比較データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadComparisonData();
  }, [searchParams, getExecutionHistory]);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getDifferenceLabel = (val1: number, val2: number): string => {
    const diff = val2 - val1;
    if (diff === 0) return '変化なし';
    if (diff > 0) return `+${diff}`;
    return `${diff}`;
  };

  const getDifferenceColor = (val1: number, val2: number): string => {
    if (val1 === val2) return 'text-gray-600';
    return val2 > val1 ? 'text-green-600' : 'text-red-600';
  };

  const getParameterDifferences = (
    params1: Record<string, Record<string, string | number | boolean>>,
    params2: Record<string, Record<string, string | number | boolean>>
  ) => {
    const differences: Array<{ moduleId: string; parameter: string; value1: string | number | boolean; value2: string | number | boolean }> = [];
    
    const allModuleIds = new Set([...Object.keys(params1), ...Object.keys(params2)]);
    
    allModuleIds.forEach(moduleId => {
      const module1Params = params1[moduleId] || {};
      const module2Params = params2[moduleId] || {};
      
      const allParamKeys = new Set([...Object.keys(module1Params), ...Object.keys(module2Params)]);
      
      allParamKeys.forEach(paramKey => {
        const value1 = module1Params[paramKey];
        const value2 = module2Params[paramKey];
        
        if (JSON.stringify(value1) !== JSON.stringify(value2)) {
          differences.push({
            moduleId,
            parameter: paramKey,
            value1: value1 ?? 'undefined',
            value2: value2 ?? 'undefined',
          });
        }
      });
    });
    
    return differences;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">比較データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-600 mb-4">{error || '不明なエラーが発生しました'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const { execution1, execution2, segments1, segments2 } = comparisonData;
  const paramDifferences = getParameterDifferences(execution1.parameters, execution2.parameters);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="戻る"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">実行結果の差分比較</h1>
            <p className="text-sm text-gray-600">ワークフロー: {execution1.workflowName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <h2 className="text-lg font-semibold text-gray-900">実行 1</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">実行日時:</span>
                  <span className="text-gray-900">{formatDate(execution1.timestamp)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <FileAudio className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">音声ファイル:</span>
                  <span className="text-gray-900 truncate">{execution1.audioFileName}</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  ファイルサイズ: {formatFileSize(execution1.audioFileSize)}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">話者数</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {execution1.result.speaker_count}人
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-700 font-medium">セグメント</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {execution1.result.segment_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h2 className="text-lg font-semibold text-gray-900">実行 2</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">実行日時:</span>
                  <span className="text-gray-900">{formatDate(execution2.timestamp)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <FileAudio className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">音声ファイル:</span>
                  <span className="text-gray-900 truncate">{execution2.audioFileName}</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  ファイルサイズ: {formatFileSize(execution2.audioFileSize)}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">話者数</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {execution2.result.speaker_count}人
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-700 font-medium">セグメント</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {execution2.result.segment_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">差分サマリー</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">話者数の差</div>
                <div className={cn('text-2xl font-bold', getDifferenceColor(
                  execution1.result.speaker_count,
                  execution2.result.speaker_count
                ))}>
                  {getDifferenceLabel(execution1.result.speaker_count, execution2.result.speaker_count)}
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">セグメント数の差</div>
                <div className={cn('text-2xl font-bold', getDifferenceColor(
                  execution1.result.segment_count,
                  execution2.result.segment_count
                ))}>
                  {getDifferenceLabel(execution1.result.segment_count, execution2.result.segment_count)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowParameters(!showParameters)}
              className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">パラメータの差分</h2>
                {paramDifferences.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                    {paramDifferences.length}件の差異
                  </span>
                )}
              </div>
              {showParameters ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {showParameters && (
              <div className="p-6">
                {paramDifferences.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">
                    パラメータに差異はありません
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">モジュールID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">パラメータ</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">実行 1</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">実行 2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paramDifferences.map((diff, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-900 font-mono">{diff.moduleId}</td>
                            <td className="px-4 py-3 text-xs text-gray-900">{diff.parameter}</td>
                            <td className="px-4 py-3 text-xs text-blue-600 font-medium">{String(diff.value1)}</td>
                            <td className="px-4 py-3 text-xs text-green-600 font-medium">{String(diff.value2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowSegmentDetails(!showSegmentDetails)}
              className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">セグメント詳細の比較</h2>
              </div>
              {showSegmentDetails ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {showSegmentDetails && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      実行 1 のセグメント
                    </h3>
                    {segments1.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">話者</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">開始</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">終了</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {segments1.map((segment, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                                <td className="px-3 py-2 text-xs font-medium text-gray-900">{segment.speaker}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.start)}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.end)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8 border border-gray-200 rounded-lg">
                        セグメントデータがありません
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      実行 2 のセグメント
                    </h3>
                    {segments2.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">話者</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">開始</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">終了</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {segments2.map((segment, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                                <td className="px-3 py-2 text-xs font-medium text-gray-900">{segment.speaker}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.start)}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 font-mono">{formatTime(segment.end)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8 border border-gray-200 rounded-lg">
                        セグメントデータがありません
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiffPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <DiffPageContent />
    </Suspense>
  );
}
