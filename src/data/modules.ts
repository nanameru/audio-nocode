import { ModuleDefinition } from '@/types/pipeline';

// 利用可能なモジュール定義
export const moduleDefinitions: ModuleDefinition[] = [
  // Input Modules
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

  // Processing Modules
  {
    id: 'vad',
    name: '音声区間検出',
    type: 'processing',
    icon: '🎯',
    description: '音声が含まれる区間を自動検出',
    color: '#8b5cf6',
    parameters: {
      backend: {
        type: 'select',
        label: 'アルゴリズム',
        description: '使用するVADアルゴリズム',
        default: 'marblenet',
        options: ['marblenet', 'pyannote', 'whisper']
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
      minSilence: {
        type: 'number',
        label: '最小無音時間 (ms)',
        description: '無音と判定する最小時間',
        default: 500,
        min: 100,
        max: 2000
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio', 'segments']
  },
  {
    id: 'noise-suppression',
    name: 'ノイズ抑制',
    type: 'processing',
    icon: '🔇',
    description: 'バックグラウンドノイズを除去',
    color: '#f59e0b',
    parameters: {
      backend: {
        type: 'select',
        label: 'アルゴリズム',
        description: 'ノイズ抑制アルゴリズム',
        default: 'demucs',
        options: ['demucs', 'noisereduce', 'bsp_mpnet', 'diffusion_buffer']
      },
      strength: {
        type: 'slider',
        label: '強度',
        description: 'ノイズ抑制の強さ',
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
    id: 'dereverberation',
    name: '残響除去',
    type: 'processing',
    icon: '🔊',
    description: '室内の残響・エコーを除去',
    color: '#06b6d4',
    parameters: {
      backend: {
        type: 'select',
        label: 'アルゴリズム',
        description: '残響除去アルゴリズム',
        default: 'wpe',
        options: ['wpe', 'mimo_wpe', 'wpd', 'adaptive_wpd']
      },
      taps: {
        type: 'number',
        label: 'フィルタータップ数',
        description: 'フィルターのタップ数',
        default: 10,
        min: 5,
        max: 50
      },
      delay: {
        type: 'number',
        label: '遅延',
        description: '予測遅延時間',
        default: 3,
        min: 1,
        max: 10
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'beamforming',
    name: 'ビームフォーミング',
    type: 'processing',
    icon: '📢',
    description: '空間音響処理による音質向上',
    color: '#84cc16',
    parameters: {
      mode: {
        type: 'select',
        label: 'モード',
        description: 'ビームフォーミングモード',
        default: 'mvdr',
        options: ['mvdr', 'gss', 'wpd_mwf', 'auto']
      },
      maxClusters: {
        type: 'number',
        label: '最大クラスター数',
        description: 'クラスタリングの最大数',
        default: 2,
        min: 1,
        max: 8
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['audio']
  },
  {
    id: 'normalization',
    name: '音量正規化',
    type: 'processing',
    icon: '📊',
    description: '音声レベルを適切に調整',
    color: '#ec4899',
    parameters: {
      backend: {
        type: 'select',
        label: '方式',
        description: '正規化方式',
        default: 'lufs',
        options: ['lufs', 'aes_td1008', 'peak', 'rms']
      },
      targetLevel: {
        type: 'slider',
        label: '目標レベル (dB)',
        description: '目標とする音声レベル',
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
    id: 'asr',
    name: '音声認識',
    type: 'processing',
    icon: '🎙️',
    description: '音声を自動的にテキストに変換',
    color: '#6366f1',
    parameters: {
      backend: {
        type: 'select',
        label: 'エンジン',
        description: '音声認識エンジン',
        default: 'whisper',
        options: ['whisper', 'gemini', 'wav2vec2']
      },
      modelSize: {
        type: 'select',
        label: 'モデルサイズ',
        description: 'モデルサイズ（精度 vs 速度）',
        default: 'medium',
        options: ['tiny', 'small', 'medium', 'large', 'large-v3']
      },
      language: {
        type: 'select',
        label: '言語',
        description: '認識対象の言語',
        default: 'auto',
        options: ['auto', 'en', 'ja', 'zh', 'es', 'fr', 'de']
      }
    },
    inputPorts: ['audio'],
    outputPorts: ['transcript', 'words']
  },
  {
    id: 'speaker-diarization',
    name: '話者分離',
    type: 'processing',
    icon: '👥',
    description: '異なる話者を自動識別・分離',
    color: '#f97316',
    parameters: {
      backend: {
        type: 'select',
        label: 'アルゴリズム',
        description: '話者分離アルゴリズム',
        default: 'pyannote',
        options: ['pyannote', 'eend_vc', 'ts_vad']
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
export const getModulesByType = (type: 'input' | 'processing' | 'output') => {
  return moduleDefinitions.filter(module => module.type === type);
};

// IDでモジュール定義を取得
export const getModuleDefinition = (id: string) => {
  return moduleDefinitions.find(module => module.id === id);
};
