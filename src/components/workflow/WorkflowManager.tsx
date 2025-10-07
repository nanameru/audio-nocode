/**
 * ワークフロー管理コンポーネント
 * Supabaseからワークフローを読み込み・保存
 */

'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline';
import { Pipeline } from '@/types/pipeline';
import { Save, FolderOpen, Plus } from 'lucide-react';

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  const { 
    currentPipeline,
    savePipeline, 
    saveAsNewPipeline,
    loadPipelineFromSupabase,
    loadAllPipelines 
  } = usePipelineStore();

  // ワークフロー一覧を取得
  const handleLoadWorkflows = async () => {
    setIsLoading(true);
    try {
      const allWorkflows = await loadAllPipelines();
      setWorkflows(allWorkflows);
      setShowLoadDialog(true);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      alert('ワークフローの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ワークフローを読み込み
  const handleSelectWorkflow = async (workflowId: string) => {
    setIsLoading(true);
    try {
      await loadPipelineFromSupabase(workflowId);
      setShowLoadDialog(false);
      alert('ワークフローを読み込みました');
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('ワークフローの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 現在のワークフローを保存
  const handleSaveWorkflow = async () => {
    if (!currentPipeline) {
      alert('保存するワークフローがありません');
      return;
    }

    setIsLoading(true);
    try {
      await savePipeline();
      alert('ワークフローを保存しました');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('ワークフローの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 新しいワークフローとして保存
  const handleSaveAsNew = async () => {
    if (!workflowName.trim()) {
      alert('ワークフロー名を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      await saveAsNewPipeline(workflowName, workflowDescription);
      setShowSaveDialog(false);
      setWorkflowName('');
      setWorkflowDescription('');
      alert('新しいワークフローとして保存しました');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('ワークフローの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 保存ボタン */}
      <button
        onClick={handleSaveWorkflow}
        disabled={isLoading || !currentPipeline}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        title="現在のワークフローを保存"
      >
        <Save className="w-4 h-4" />
        保存
      </button>

      {/* 新規保存ボタン */}
      <button
        onClick={() => setShowSaveDialog(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        title="新しいワークフローとして保存"
      >
        <Plus className="w-4 h-4" />
        名前を付けて保存
      </button>

      {/* 読み込みボタン */}
      <button
        onClick={handleLoadWorkflows}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        title="ワークフローを読み込み"
      >
        <FolderOpen className="w-4 h-4" />
        読み込み
      </button>

      {/* 読み込みダイアログ */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">ワークフローを読み込み</h2>
            
            {workflows.length === 0 ? (
              <p className="text-gray-500">保存されたワークフローがありません</p>
            ) : (
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectWorkflow(workflow.id)}
                  >
                    <h3 className="font-semibold">{workflow.name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      更新日: {new Date(workflow.updatedAt).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">新しいワークフローとして保存</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  ワークフロー名 *
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 音声分離パイプライン"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  説明（オプション）
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="ワークフローの説明を入力してください"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setWorkflowName('');
                  setWorkflowDescription('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveAsNew}
                disabled={!workflowName.trim() || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

