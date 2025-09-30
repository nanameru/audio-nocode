import { ModuleDefinition } from '@/types/pipeline';

// 利用可能なモジュール定義
export const moduleDefinitions: ModuleDefinition[] = [
  // ===== 入力モジュール =====
  {
    id: 'file-input',
    name: 'ファイル読み込み',
    type: 'input',
    icon: '📁',
    description: 'デバイスから音声ファイルをアップロード',
    color: '#3b82f6',
    parameters: {
      acceptedFormats: {
        type: 'select',
        label: '対応フォーマット',
        description: '受け入れるファイル形式',
        default: 'all',
        options: ['all', 'audio-only', 'video-only']
      },
      maxSize: {
        type: 'number',
        label: '最大ファイルサイズ (MB)',
        description: 'メガバイト単位での最大ファイルサイズ',
        default: 100,
        min: 1,
        max: 1000
      }
    },
    inputPorts: [],
    outputPorts: ['audio', 'metadata']
  },
  {
    id: 'microphone-input',
    name: 'マイク録音',
    type: 'input',
    icon: '🎤',
    description: 'マイクからリアルタイム録音',
    color: '#ef4444',
    parameters: {
      sampleRate: {
        type: 'select',
        label: 'サンプルレート',
        description: '音声のサンプリング周波数',
        default: 44100,
        options: [16000, 22050, 44100, 48000]
      },
      channels: {
        type: 'select',
        label: 'チャンネル数',
        description: '音声チャンネルの数',
        default: 1,
        options: [1, 2]
      }
    },
    inputPorts: [],
    outputPorts: ['audio', 'metadata']
  },
  {
    id: 'url-input',
    name: 'URL取得',
    type: 'input',
    icon: '🌐',
    description: 'URLから音声をダウンロード',
    color: '#10b981',
    parameters: {
      url: {
        type: 'text',
        label: 'URL',
        description: 'ダウンロードする音声ファイルのURL',
        default: ''
      },
      timeout: {
        type: 'number',
        label: 'タイムアウト (秒)',
        description: 'ダウンロードのタイムアウト時間',
        default: 30,
        min: 5,
        max: 300
      }
    },
    inputPorts: [],
    outputPorts: ['audio', 'metadata']
  },

  // ===== 前処理モジュール =====
  {
    id: 'whisper-preprocessing',
    name: 'Whisper風前処理',
    type: 'preprocessing',
    icon: '🎵',
    description: '16kHzリサンプリング + 正規化（Whisper最適化）',
    color: '#8b5cf6',
    parameters: {
      sampleRate: {
        type: 'select',
        label: 'サンプルレート',
        description: 'リサンプリング先の周波数',
        default: 16000,
        options: [16000, 22050, 44100, 48000]
      },
      chunkLength: {
        type: 'number',
        label: 'チャンク長 (秒)',
        description: '処理単位の長さ',
        default: 30,
        min: 10,
        max: 60
      },
      normalize: {
        type: 'boolean',
        label: '正規化',
        description: '音声レベルの正規化を行う',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'metadata']
  },
  {
    id: 'standard-preprocessing',
    name: 'スタンダード前処理',
    type: 'preprocessing',
    icon: '⚙️',
    description: '基本的な音声前処理（フォーマット変換）',
    color: '#6b7280',
    parameters: {
      convertToWav: {
        type: 'boolean',
        label: 'WAV変換',
        description: 'WAV形式に変換する',
        default: true
      },
      sampleRate: {
        type: 'select',
        label: 'サンプルレート',
        description: 'リサンプリング先の周波数',
        default: 44100,
        options: [16000, 22050, 44100, 48000]
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'metadata']
  },

  // ===== VAD（音声区間検出）モジュール =====
  {
    id: 'vad-whisper',
    name: 'Whisper VAD',
    type: 'vad',
    icon: '🎯',
    description: 'Whisper内蔵のVAD機能を使用',
    color: '#8b5cf6',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'VAD処理を有効にする',
        default: true
      },
      useVadInAsr: {
        type: 'boolean',
        label: 'ASR内でVAD使用',
        description: '音声認識処理内でVADを適用',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'segments']
  },
  {
    id: 'vad-marblenet',
    name: 'MarbleNet VAD',
    type: 'vad',
    icon: '🔮',
    description: 'NVIDIA MarbleNetによる高精度VAD',
    color: '#7c3aed',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'VAD処理を有効にする',
        default: true
      },
      threshold: {
        type: 'slider',
        label: '検出閾値',
        description: '音声検出の感度',
        default: 0.5,
        min: 0.0,
        max: 1.0,
        step: 0.1
      },
      minSilenceDuration: {
        type: 'number',
        label: '最小無音時間 (ms)',
        description: '無音と判定する最小時間',
        default: 500,
        min: 100,
        max: 2000
      },
      speechPad: {
        type: 'number',
        label: '音声パディング (ms)',
        description: '音声区間の前後に追加する時間',
        default: 100,
        min: 0,
        max: 500
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'segments']
  },
  {
    id: 'vad-pyannote',
    name: 'pyannote.ai APIノード',
    type: 'vad',
    icon: '🎪',
    description: 'pyannote.ai APIによるVAD処理',
    color: '#6366f1',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'VAD処理を有効にする',
        tooltip: 'このモジュールでのVAD（音声活動検出）処理を有効または無効にします。無効にすると音声区間の検出をスキップします。',
        default: true
      },
      model: {
        type: 'select',
        label: 'モデル',
        description: '使用するpyannote.aiモデル',
        tooltip: 'precision-2は最新モデルで37%高精度。precision-1は従来モデル。新規プロジェクトではprecision-2を推奨します。',
        default: 'precision-2',
        options: ['precision-1', 'precision-2']
      },
      minSilenceDuration: {
        type: 'number',
        label: '最小無音時間 (ms)',
        description: '無音と判定する最小時間',
        tooltip: '指定した時間以上の無音区間のみを無音として検出します。短すぎると誤検出が増え、長すぎると短い無音を見逃します。',
        default: 500,
        min: 100,
        max: 2000
      },
      confidence: {
        type: 'boolean',
        label: '信頼度スコア',
        description: '信頼度スコアを含める',
        tooltip: '各音声区間の検出信頼度（0-100）を結果に含めます。品質評価や後処理での閾値設定に使用できます。',
        default: false
      },
      exclusive: {
        type: 'boolean',
        label: '排他的処理',
        description: '重複のない音声区間を生成',
        tooltip: '重複する音声区間を除去し、時間軸上で重複のない区間のみを出力します。複数話者の同時発話を避けたい場合に有効です。',
        default: false
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'segments']
  },
  // ===== ノイズ抑制モジュール =====
  {
    id: 'noise-noisereduce',
    name: 'NoiseReduce',
    type: 'noise',
    icon: '🔇',
    description: 'スペクトル減算によるノイズ除去',
    color: '#f59e0b',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      },
      stationary: {
        type: 'boolean',
        label: '定常ノイズ',
        description: '定常ノイズの仮定を使用',
        default: false
      },
      propDecrease: {
        type: 'slider',
        label: '減衰強度',
        description: 'ノイズ減衰の強さ',
        default: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.1
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'noise-demucs',
    name: 'Demucs',
    type: 'noise',
    icon: '🎛️',
    description: 'Meta製深層学習ベースの音源分離',
    color: '#ef4444',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      },
      model: {
        type: 'select',
        label: 'モデル',
        description: '使用するDemucsモデル',
        default: 'htdemucs_ft',
        options: ['htdemucs', 'htdemucs_ft', 'mdx_extra']
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'noise-flowse',
    name: 'FlowSE',
    type: 'noise',
    icon: '🌊',
    description: 'フローベースの音声強化',
    color: '#06b6d4',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'noise-bsp-mpnet',
    name: 'BSP-MPNet',
    type: 'noise',
    icon: '🧠',
    description: 'Band-Split RNN with Multi-Scale Permutation',
    color: '#8b5cf6',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'noise-diffusion-buffer',
    name: 'Diffusion Buffer',
    type: 'noise',
    icon: '⚡',
    description: '低遅延拡散モデルベースのノイズ抑制',
    color: '#f97316',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      },
      latencyMs: {
        type: 'number',
        label: '遅延 (ms)',
        description: 'バッファ遅延時間',
        default: 500,
        min: 100,
        max: 2000
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'noise-deepfir',
    name: 'DeepFIR',
    type: 'noise',
    icon: '🔬',
    description: '深層学習FIRフィルターによるノイズ除去',
    color: '#10b981',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ノイズ抑制を有効にする',
        default: true
      },
      filterLength: {
        type: 'number',
        label: 'フィルター長',
        description: 'FIRフィルターの長さ',
        default: 512,
        min: 128,
        max: 2048
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  // ===== 残響除去モジュール =====
  {
    id: 'dereverb-wpe',
    name: 'WPE',
    type: 'dereverberation',
    icon: '🔊',
    description: 'Weighted Prediction Error による残響除去',
    color: '#06b6d4',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '残響除去を有効にする',
        default: true
      },
      taps: {
        type: 'number',
        label: 'フィルタータップ数',
        description: 'WPEフィルターのタップ数',
        default: 10,
        min: 5,
        max: 50
      },
      delay: {
        type: 'number',
        label: '遅延フレーム',
        description: '予測遅延フレーム数',
        default: 3,
        min: 1,
        max: 10
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'dereverb-mimo-wpe',
    name: 'MIMO WPE',
    type: 'dereverberation',
    icon: '🎭',
    description: 'Multi-Input Multi-Output WPE',
    color: '#0891b2',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '残響除去を有効にする',
        default: true
      },
      taps: {
        type: 'number',
        label: 'フィルタータップ数',
        description: 'WPEフィルターのタップ数',
        default: 10,
        min: 5,
        max: 50
      },
      delay: {
        type: 'number',
        label: '遅延フレーム',
        description: '予測遅延フレーム数',
        default: 3,
        min: 1,
        max: 10
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'dereverb-wpd',
    name: 'WPD',
    type: 'dereverberation',
    icon: '🌀',
    description: 'Weighted Power minimization Distortionless',
    color: '#0284c7',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '残響除去を有効にする',
        default: true
      },
      iterations: {
        type: 'number',
        label: '反復回数',
        description: 'WPD反復処理回数',
        default: 5,
        min: 1,
        max: 20
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'dereverb-adaptive-wpd',
    name: 'Adaptive WPD',
    type: 'dereverberation',
    icon: '🔄',
    description: '適応的WPD残響除去',
    color: '#0369a1',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '残響除去を有効にする',
        default: true
      },
      updateRate: {
        type: 'slider',
        label: '更新レート',
        description: '適応更新の学習率',
        default: 0.1,
        min: 0.01,
        max: 1.0,
        step: 0.01
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },

  // ===== ビームフォーミングモジュール =====
  {
    id: 'beamform-auto',
    name: 'Auto Beamforming',
    type: 'beamforming',
    icon: '📢',
    description: '自動ビームフォーミング（最適手法を選択）',
    color: '#84cc16',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ビームフォーミングを有効にする',
        default: true
      },
      maxClusters: {
        type: 'number',
        label: '最大クラスター数',
        description: 'クラスタリングの最大数',
        default: 2,
        min: 1,
        max: 8
      },
      useMicSelection: {
        type: 'boolean',
        label: 'マイク選択',
        description: 'EV+C50マイク選択を使用',
        default: false
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'beamform-mvdr',
    name: 'MVDR',
    type: 'beamforming',
    icon: '🎯',
    description: 'Minimum Variance Distortionless Response',
    color: '#65a30d',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ビームフォーミングを有効にする',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'beamform-gss',
    name: 'GSS',
    type: 'beamforming',
    icon: '🎪',
    description: 'Geometric Source Separation',
    color: '#4d7c0f',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ビームフォーミングを有効にする',
        default: true
      },
      iterations: {
        type: 'number',
        label: '反復回数',
        description: 'GSS反復処理回数',
        default: 10,
        min: 1,
        max: 50
      },
      useCacgmm: {
        type: 'boolean',
        label: 'cACGMM使用',
        description: 'cACGMMマスキングを使用',
        default: false
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'beamform-wpd-mwf',
    name: 'WPD-MWF',
    type: 'beamforming',
    icon: '🌊',
    description: 'WPD Multi-channel Wiener Filter',
    color: '#365314',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ビームフォーミングを有効にする',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  // ===== 正規化モジュール =====
  {
    id: 'norm-rms',
    name: 'RMS正規化',
    type: 'normalization',
    icon: '📊',
    description: 'RMS（Root Mean Square）レベル正規化',
    color: '#ec4899',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '正規化を有効にする',
        default: true
      },
      targetDb: {
        type: 'slider',
        label: '目標レベル (dB)',
        description: '目標とするRMSレベル',
        default: -23,
        min: -40,
        max: 0,
        step: 1
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'norm-lufs',
    name: 'LUFS正規化',
    type: 'normalization',
    icon: '🎚️',
    description: 'LUFS（Loudness Units relative to Full Scale）正規化',
    color: '#db2777',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '正規化を有効にする',
        default: true
      },
      targetLufs: {
        type: 'slider',
        label: '目標LUFS',
        description: '目標とするLUFSレベル',
        default: -17,
        min: -30,
        max: -10,
        step: 1
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'norm-peak',
    name: 'ピーク正規化',
    type: 'normalization',
    icon: '⛰️',
    description: 'ピークレベルベースの正規化',
    color: '#be185d',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '正規化を有効にする',
        default: true
      },
      targetDb: {
        type: 'slider',
        label: '目標レベル (dB)',
        description: '目標とするピークレベル',
        default: -3,
        min: -20,
        max: 0,
        step: 1
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'norm-aes-td1008',
    name: 'AES TD1008',
    type: 'normalization',
    icon: '🎭',
    description: 'AES TD1008標準による高度な正規化',
    color: '#9d174d',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '正規化を有効にする',
        default: true
      },
      speechLufs: {
        type: 'slider',
        label: '音声LUFS',
        description: '音声部分の目標LUFS',
        default: -18,
        min: -25,
        max: -10,
        step: 1
      },
      musicLufs: {
        type: 'slider',
        label: '音楽LUFS',
        description: '音楽部分の目標LUFS',
        default: -16,
        min: -25,
        max: -10,
        step: 1
      },
      truePeakLimit: {
        type: 'slider',
        label: 'ピーク制限 (dBTP)',
        description: 'True Peakの制限値',
        default: -1,
        min: -6,
        max: 0,
        step: 0.1
      },
      separateSpeechMusic: {
        type: 'boolean',
        label: '音声・音楽分離',
        description: '音声と音楽を分離して処理',
        default: false
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },

  // ===== ASR（音声認識）モジュール =====
  {
    id: 'asr-whisper',
    name: 'Whisper ASR',
    type: 'asr',
    icon: '🎙️',
    description: 'OpenAI Whisperによる音声認識',
    color: '#6366f1',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ASRを有効にする',
        default: true
      },
      modelSize: {
        type: 'select',
        label: 'モデルサイズ',
        description: 'Whisperモデルサイズ（精度 vs 速度）',
        default: 'medium',
        options: ['tiny', 'small', 'medium', 'large', 'large-v3']
      },
      language: {
        type: 'select',
        label: '言語',
        description: '認識対象の言語',
        default: 'auto',
        options: ['auto', 'ja', 'en', 'zh', 'es', 'fr', 'de', 'ko']
      },
      beamSize: {
        type: 'number',
        label: 'ビームサイズ',
        description: 'ビームサーチのサイズ',
        default: 5,
        min: 1,
        max: 20
      },
      wordTimestamps: {
        type: 'boolean',
        label: '単語タイムスタンプ',
        description: '単語レベルのタイムスタンプを生成',
        default: true
      },
      useVad: {
        type: 'boolean',
        label: 'VAD使用',
        description: 'ASR内でVADを使用',
        default: true
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['transcript', 'words', 'segments']
  },
  {
    id: 'asr-gemini',
    name: 'Gemini ASR',
    type: 'asr',
    icon: '💎',
    description: 'Google Gemini APIによる音声認識',
    color: '#4f46e5',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'ASRを有効にする',
        default: true
      },
      language: {
        type: 'select',
        label: '言語',
        description: '認識対象の言語',
        default: 'ja',
        options: ['ja', 'en', 'zh', 'es', 'fr', 'de', 'ko']
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['transcript']
  },

  // ===== 話者分離モジュール =====
  {
    id: 'diar-pyannote',
    name: 'pyannote.ai APIノード',
    type: 'diarization',
    icon: '👥',
    description: 'pyannote.ai APIによる話者分離',
    color: '#f97316',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '話者分離を有効にする',
        tooltip: 'このモジュールでの話者分離処理を有効または無効にします。無効にすると話者の識別をスキップします。',
        default: true
      },
      model: {
        type: 'select',
        label: 'モデル',
        description: '使用するpyannote.aiモデル',
        tooltip: 'precision-2は最新モデルで37%高精度な話者分離を提供。precision-1は従来モデル。新規プロジェクトではprecision-2を推奨します。',
        default: 'precision-2',
        options: ['precision-1', 'precision-2']
      },
      numSpeakers: {
        type: 'number',
        label: '話者数（固定）',
        description: '話者数が既知の場合に指定（最適化される）',
        tooltip: '正確な話者数が分かっている場合に指定すると、分離精度が向上します。電話会議（2人）やインタビュー（既知の人数）に最適です。',
        default: null,
        min: 1,
        max: 20
      },
      minSpeakers: {
        type: 'number',
        label: '最小話者数',
        description: '想定される最小話者数',
        tooltip: '音声に含まれる最小話者数を指定します。この数値未満の話者は検出されません。',
        default: 1,
        min: 1,
        max: 20
      },
      maxSpeakers: {
        type: 'number',
        label: '最大話者数',
        description: '想定される最大話者数',
        tooltip: '音声に含まれる最大話者数を制限します。この数値を超える話者は検出されません。処理速度の向上にも寄与します。',
        default: 5,
        min: 2,
        max: 20
      },
      turnLevelConfidence: {
        type: 'boolean',
        label: 'ターンレベル信頼度',
        description: 'ターンレベルの信頼度スコアを含める',
        tooltip: '各発話ターンの話者割り当て信頼度を出力します。不確実な区間の特定や品質評価に使用できます。',
        default: false
      },
      exclusive: {
        type: 'boolean',
        label: '排他的分離',
        description: '重複のない話者分離結果を生成',
        tooltip: '話者の重複発話を除去し、同時に複数の話者が話している区間を単一話者に割り当てます。',
        default: false
      },
      confidence: {
        type: 'boolean',
        label: '信頼度スコア',
        description: '信頼度スコアを含める',
        tooltip: '全体的な信頼度スコア（0-100）を結果に含めます。処理品質の評価や後処理での閾値設定に使用できます。',
        default: false
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['speakers', 'segments']
  },
  {
    id: 'diar-pyannote31',
    name: 'pyannote 3.1',
    type: 'diarization',
    icon: '🎯',
    description: 'pyannote/speaker-diarization-3.1による高精度話者分離',
    color: '#06b6d4',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: 'pyannote 3.1話者分離を有効にする',
        tooltip: 'pyannote/speaker-diarization-3.1による最新の高精度話者分離機能を有効にします。従来版より精度とパフォーマンスが向上しています。',
        default: true
      },
      numSpeakers: {
        type: 'number',
        label: '正確な話者数',
        description: '話者数が分かっている場合に指定（優先度最高）',
        tooltip: '正確な話者数が分かっている場合に指定すると、分離精度が大幅に向上します。電話会議（2人）、インタビュー（既知の人数）、会議（参加者数既知）に最適です。',
        default: null,
        min: 1,
        max: 20
      },
      minSpeakers: {
        type: 'number',
        label: '最小話者数',
        description: '想定される最小話者数',
        tooltip: '音声に含まれる最小話者数を指定します。この数値未満の話者は検出されません。1人の場合はモノローグ、2人以上の場合は対話として処理されます。',
        default: 1,
        min: 1,
        max: 10
      },
      maxSpeakers: {
        type: 'number',
        label: '最大話者数',
        description: '想定される最大話者数',
        tooltip: '音声に含まれる最大話者数を制限します。この数値を超える話者は検出されません。適切な上限設定により処理速度の向上と誤検出の抑制が期待できます。',
        default: 5,
        min: 2,
        max: 20
      },
      useGpu: {
        type: 'boolean',
        label: 'GPU使用',
        description: 'GPU加速を使用（利用可能な場合）',
        tooltip: 'CUDA対応GPUが利用可能な場合、GPU加速により処理速度が大幅に向上します。長時間音声や高品質処理に特に効果的です。',
        default: true
      },
      progressMonitoring: {
        type: 'boolean',
        label: '進捗監視',
        description: '処理進捗の詳細監視を有効化',
        tooltip: '処理の詳細な進捗情報を取得します。長時間処理の状況確認や、処理時間の予測、デバッグ情報の取得に有用です。',
        default: true
      },
      memoryOptimized: {
        type: 'boolean',
        label: 'メモリ最適化',
        description: 'メモリ効率を優先した処理',
        tooltip: 'メモリ使用量を抑えた処理モードです。大容量音声ファイルや限られたメモリ環境での処理に適していますが、処理速度は若干低下します。',
        default: false
      },
      turnLevelConfidence: {
        type: 'boolean',
        label: 'ターンレベル信頼度',
        description: 'ターンレベルの信頼度スコアを含める',
        tooltip: '各発話ターンの話者割り当て信頼度を出力します。不確実な区間の特定や品質評価に使用できます。',
        default: false
      },
      exclusive: {
        type: 'boolean',
        label: '排他的分離',
        description: '重複のない話者分離結果を生成',
        tooltip: '話者の重複発話を除去し、同時に複数の話者が話している区間を単一話者に割り当てます。',
        default: false
      },
      confidence: {
        type: 'boolean',
        label: '信頼度スコア',
        description: '信頼度スコアを含める',
        tooltip: '全体的な信頼度スコア（0-100）を結果に含めます。処理品質の評価や後処理での閾値設定に使用できます。',
        default: false
      },
      minDuration: {
        type: 'slider',
        label: '最小区間長 (秒)',
        description: '話者区間の最小長',
        tooltip: 'この時間未満の短い発話区間は除去されます。ノイズや短い相槌の除去に効果的です。',
        default: 0.5,
        min: 0.1,
        max: 5.0,
        step: 0.1
      },
      clusteringThreshold: {
        type: 'slider',
        label: 'クラスタリング閾値',
        description: '話者クラスタリングの閾値',
        tooltip: '話者の類似度判定閾値。低くすると話者を細かく分離し、高くすると統合されやすくなります。',
        default: 0.5,
        min: 0.1,
        max: 1.0,
        step: 0.1
      },
      webhookUrl: {
        type: 'text',
        label: 'Webhook URL',
        description: '処理完了時の通知先URL（オプション）',
        tooltip: '処理完了時に結果を送信するWebhook URLを指定できます。長時間処理の非同期実行に便利です。',
        default: ''
      },
      batchSize: {
        type: 'select',
        label: 'バッチサイズ',
        description: '処理バッチサイズ',
        tooltip: 'メモリ使用量と処理速度のバランスを調整します。large: 高速・高メモリ、medium: バランス、small: 低メモリ・低速、auto: 自動最適化',
        default: 'auto',
        options: ['small', 'medium', 'large', 'auto']
      },
      enhancedFeatures: {
        type: 'boolean',
        label: '拡張機能',
        description: 'pyannote 3.1の拡張機能を有効化',
        tooltip: 'pyannote 3.1の最新機能を使用します：改良された音響特徴量抽出、高精度クラスタリング、ノイズ耐性向上、重複発話検出の改善など。',
        default: true
      },
      voiceActivityDetection: {
        type: 'boolean',
        label: 'VAD統合',
        description: '音声活動検出との統合処理',
        tooltip: 'pyannote 3.1内蔵の高精度VAD（音声活動検出）と話者分離を統合処理します。無音区間の正確な検出により分離精度が向上します。',
        default: true
      },
    },
    inputPorts: ['audio'],
    outputPorts: ['speakers', 'segments', 'metrics', 'confidence', 'embeddings']
  },
  {
    id: 'diar-eend-vc',
    name: 'EEND-VC',
    type: 'diarization',
    icon: '🎭',
    description: 'End-to-End Neural Diarization with Vector Clustering',
    color: '#ea580c',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '話者分離を有効にする',
        default: true
      },
      maxSpeakers: {
        type: 'number',
        label: '最大話者数',
        description: '想定される最大話者数',
        default: 5,
        min: 2,
        max: 20
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['speakers', 'segments']
  },
  {
    id: 'diar-ts-vad',
    name: 'TS-VAD',
    type: 'diarization',
    icon: '🎪',
    description: 'Target-Speaker Voice Activity Detection',
    color: '#c2410c',
    parameters: {
      enabled: {
        type: 'boolean',
        label: '有効化',
        description: '話者分離を有効にする',
        default: true
      },
      maxSpeakers: {
        type: 'number',
        label: '最大話者数',
        description: '想定される最大話者数',
        default: 5,
        min: 2,
        max: 20
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['speakers', 'segments']
  },

  // Output Modules
  {
    id: 'file-output',
    name: 'ファイル出力',
    type: 'output',
    icon: '💾',
    description: '処理済み音声をファイルに保存',
    color: '#22c55e',
    parameters: {
      format: {
        type: 'select',
        label: 'フォーマット',
        description: '出力ファイル形式',
        default: 'wav',
        options: ['wav', 'mp3', 'flac', 'ogg']
      },
      quality: {
        type: 'select',
        label: '品質',
        description: '音声品質',
        default: 'high',
        options: ['low', 'medium', 'high', 'lossless']
      }
    },
    inputPorts: ['audio'],
    outputPorts: []
  },
  {
    id: 'json-output',
    name: 'JSON出力',
    type: 'output',
    icon: '📄',
    description: '結果をJSON形式でエクスポート',
    color: '#14b8a6',
    parameters: {
      includeMetadata: {
        type: 'boolean',
        label: 'メタデータを含める',
        description: '処理メタデータを含めるかどうか',
        default: true
      },
      prettyPrint: {
        type: 'boolean',
        label: '整形出力',
        description: '読みやすい形式でJSONを整形',
        default: true
      }
    },
    inputPorts: ['transcript', 'speakers', 'segments'],
    outputPorts: []
  },
  {
    id: 'text-output',
    name: 'テキスト出力',
    type: 'output',
    icon: '📝',
    description: '文字起こし結果をテキスト形式でエクスポート',
    color: '#a855f7',
    parameters: {
      format: {
        type: 'select',
        label: 'フォーマット',
        description: 'テキスト形式',
        default: 'plain',
        options: ['plain', 'srt', 'vtt', 'markdown']
      },
      includeSpeakers: {
        type: 'boolean',
        label: '話者情報を含める',
        description: '話者ラベルを含めるかどうか',
        default: true
      },
      includeTimestamps: {
        type: 'boolean',
        label: 'タイムスタンプを含める',
        description: '時間情報を含めるかどうか',
        default: true
      }
    },
    inputPorts: ['transcript', 'speakers'],
    outputPorts: []
  }
];

// カテゴリ別にモジュールを取得
export const getModulesByType = (type: 'input' | 'preprocessing' | 'vad' | 'noise' | 'dereverberation' | 'beamforming' | 'normalization' | 'asr' | 'diarization' | 'output') => {
  return moduleDefinitions.filter(module => module.type === type);
};

// 全モジュールタイプを取得
export const getAllModuleTypes = () => {
  const types = new Set(moduleDefinitions.map(module => module.type));
  return Array.from(types);
};

// モジュールタイプの日本語名を取得
export const getModuleTypeLabel = (type: string): string => {
  const typeLabels: Record<string, string> = {
    'input': '入力',
    'preprocessing': '前処理',
    'vad': 'VAD',
    'noise': 'ノイズ抑制',
    'dereverberation': '残響除去',
    'beamforming': 'ビームフォーミング',
    'normalization': '正規化',
    'asr': '音声認識',
    'diarization': '話者分離',
    'output': '出力'
  };
  return typeLabels[type] || type;
};

// モジュールタイプのアイコンを取得
export const getModuleTypeIcon = (type: string): string => {
  const typeIcons: Record<string, string> = {
    'input': '📥',
    'preprocessing': '⚙️',
    'vad': '🎯',
    'noise': '🔇',
    'dereverberation': '🔊',
    'beamforming': '📢',
    'normalization': '📊',
    'asr': '🎙️',
    'diarization': '👥',
    'output': '📤'
  };
  return typeIcons[type] || '🔧';
};

// IDでモジュール定義を取得
export const getModuleDefinition = (id: string) => {
  return moduleDefinitions.find(module => module.id === id);
};
