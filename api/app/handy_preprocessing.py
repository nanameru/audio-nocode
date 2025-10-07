"""
Handy音声前処理パイプライン
Handyプロジェクトの音声処理ロジックをPythonに移植
"""
import numpy as np
import librosa
import soundfile as sf
import onnxruntime as ort
from collections import deque
from typing import List, Tuple, Dict, Optional
from pathlib import Path


class SileroVAD:
    """Silero VADモデル (Handyのsilero.rs移植)"""

    def __init__(self, model_path: str, threshold: float = 0.3):
        self.session = ort.InferenceSession(model_path)
        self.threshold = threshold
        self.sample_rate = 16000
        self.frame_samples = 480  # 30ms at 16kHz

    def detect(self, frame: np.ndarray) -> float:
        """
        30msフレームの音声確率を返す
        Returns: 0.0-1.0の確率値
        """
        if len(frame) != self.frame_samples:
            raise ValueError(f"Expected {self.frame_samples} samples, got {len(frame)}")

        # ONNXモデル実行
        ort_inputs = {"input": frame.reshape(1, -1).astype(np.float32)}
        prob = self.session.run(None, ort_inputs)[0][0][0]
        return float(prob)

    def is_speech(self, frame: np.ndarray) -> bool:
        """音声かどうか判定"""
        return self.detect(frame) > self.threshold


class SmoothedVAD:
    """スムージングVAD (Handyのsmoothed.rs移植)"""

    def __init__(
        self,
        vad: SileroVAD,
        prefill_frames: int = 15,
        hangover_frames: int = 15,
        onset_frames: int = 2
    ):
        self.vad = vad
        self.prefill_frames = prefill_frames
        self.hangover_frames = hangover_frames
        self.onset_frames = onset_frames

        # 状態管理
        self.frame_buffer = deque(maxlen=prefill_frames + 1)
        self.hangover_counter = 0
        self.onset_counter = 0
        self.in_speech = False

    def reset(self):
        """状態をリセット"""
        self.frame_buffer.clear()
        self.hangover_counter = 0
        self.onset_counter = 0
        self.in_speech = False

    def process_frame(self, frame: np.ndarray) -> Tuple[bool, Optional[np.ndarray]]:
        """
        フレームを処理
        Returns: (is_speech, audio_data)
            - is_speech: このフレームを出力に含めるか
            - audio_data: 出力する音声データ（Noneの場合は出力しない）
        """
        # バッファに追加
        self.frame_buffer.append(frame.copy())

        # VAD判定
        is_voice = self.vad.is_speech(frame)

        # 状態遷移
        if not self.in_speech and is_voice:
            # 音声開始の可能性
            self.onset_counter += 1
            if self.onset_counter >= self.onset_frames:
                # 音声開始確定 - prefillバッファを含めて返す
                self.in_speech = True
                self.hangover_counter = self.hangover_frames
                self.onset_counter = 0
                # バッファ全体を連結して返す
                return True, np.concatenate(list(self.frame_buffer))
            return False, None

        elif self.in_speech and is_voice:
            # 音声継続
            self.hangover_counter = self.hangover_frames
            return True, frame

        elif self.in_speech and not is_voice:
            # 音声終了の可能性
            if self.hangover_counter > 0:
                self.hangover_counter -= 1
                return True, frame  # hangover期間は出力に含める
            else:
                # 音声終了確定
                self.in_speech = False
                return False, None

        else:  # not in_speech and not is_voice
            # 無音継続
            self.onset_counter = 0
            return False, None


class HandyPreprocessor:
    """Handy音声前処理パイプライン（グローバルシングルトン）"""

    def __init__(self, vad_model_path: str = "/app/models/silero_vad.onnx"):
        self.vad_model_path = vad_model_path
        self.target_sr = 16000
        self.frame_duration_ms = 30
        self.frame_samples = int(self.target_sr * self.frame_duration_ms / 1000)  # 480

        # VADモデルを初期化時にロード
        self.silero_vad = SileroVAD(vad_model_path)
        print(f"✅ Handy preprocessor initialized with VAD model: {vad_model_path}")

    def process(
        self,
        input_path: str,
        output_path: str,
        vad_enabled: bool = True,
        vad_threshold: float = 0.3,
        onset_frames: int = 2,
        prefill_frames: int = 15,
        hangover_frames: int = 15,
        enable_visualization: bool = True
    ) -> Dict:
        """
        音声ファイルを前処理

        Args:
            input_path: 入力音声ファイルパス
            output_path: 出力音声ファイルパス
            vad_enabled: VADを有効にするか
            vad_threshold: Silero VAD閾値 (0.0-1.0)
            onset_frames: 音声開始判定フレーム数
            prefill_frames: 音声開始前バッファフレーム数
            hangover_frames: 音声終了後保持フレーム数
            enable_visualization: スペクトル可視化データ生成

        Returns:
            metadata: 処理メタデータ
        """
        print(f"🎙️  Handy preprocessing: {input_path}")
        print(f"   VAD: {vad_enabled}, threshold: {vad_threshold}")
        print(f"   Onset: {onset_frames}, Prefill: {prefill_frames}, Hangover: {hangover_frames}")

        # 1. 音声読み込み（モノラル化）
        audio, original_sr = librosa.load(input_path, sr=None, mono=True)
        print(f"📥 Loaded: {len(audio)} samples at {original_sr}Hz")

        # 2. リサンプリング (16kHz)
        if original_sr != self.target_sr:
            print(f"🔄 Resampling {original_sr}Hz → {self.target_sr}Hz...")
            audio = librosa.resample(audio, orig_sr=original_sr, target_sr=self.target_sr)

        # 3. VAD適用
        processed_audio = []
        vad_segments = []

        if vad_enabled:
            print(f"🎯 Applying VAD...")

            # SmoothedVADインスタンス作成（パラメータ適用）
            self.silero_vad.threshold = vad_threshold
            smoothed_vad = SmoothedVAD(
                self.silero_vad,
                prefill_frames=prefill_frames,
                hangover_frames=hangover_frames,
                onset_frames=onset_frames
            )

            # フレーム単位で処理
            segment_start = None
            for i in range(0, len(audio), self.frame_samples):
                frame = audio[i:i + self.frame_samples]

                # 最後のフレームをパディング
                if len(frame) < self.frame_samples:
                    frame = np.pad(frame, (0, self.frame_samples - len(frame)))

                is_speech, speech_data = smoothed_vad.process_frame(frame)

                if is_speech and speech_data is not None:
                    if segment_start is None:
                        segment_start = len(processed_audio) / self.target_sr if processed_audio else 0
                    processed_audio.append(speech_data)
                elif segment_start is not None:
                    # セグメント終了
                    vad_segments.append({
                        'start': segment_start,
                        'end': (len(np.concatenate(processed_audio)) if processed_audio else 0) / self.target_sr
                    })
                    segment_start = None

            # 最後のセグメントを閉じる
            if segment_start is not None and processed_audio:
                vad_segments.append({
                    'start': segment_start,
                    'end': len(np.concatenate(processed_audio)) / self.target_sr
                })

            if processed_audio:
                processed_audio = np.concatenate(processed_audio)
                print(f"✅ VAD: {len(vad_segments)} segments, {len(processed_audio)} samples")
            else:
                print(f"⚠️  VAD: No speech detected, using original audio")
                processed_audio = audio
        else:
            processed_audio = audio

        # 4. パディング（1秒未満なら1.25秒に）
        if len(processed_audio) < self.target_sr:
            target_length = int(self.target_sr * 1.25)
            print(f"📌 Padding: {len(processed_audio)} → {target_length} samples")
            processed_audio = np.pad(processed_audio, (0, target_length - len(processed_audio)))

        # 5. スペクトル可視化データ生成
        visualization = None
        if enable_visualization:
            visualization = self._generate_spectrum(processed_audio)
            print(f"📊 Visualization: {len(visualization)} buckets")

        # 6. 保存
        sf.write(output_path, processed_audio, self.target_sr)
        print(f"💾 Saved: {output_path}")

        return {
            'original_sr': int(original_sr),
            'resampled_sr': self.target_sr,
            'original_duration': float(len(audio) / original_sr),
            'processed_duration': float(len(processed_audio) / self.target_sr),
            'vad_enabled': vad_enabled,
            'vad_segments': vad_segments if vad_enabled else [],
            'num_segments': len(vad_segments) if vad_enabled else 0,
            'visualization': visualization
        }

    def _generate_spectrum(self, audio: np.ndarray, num_buckets: int = 16) -> List[float]:
        """
        FFTスペクトル分析（Handyのvisualizer.rs移植）
        80-4000Hz、対数スケール、dB正規化
        """
        # STFTでスペクトログラム計算
        D = librosa.stft(audio, n_fft=512, hop_length=256, window='hann')
        S = np.abs(D)

        # dB変換
        S_db = librosa.amplitude_to_db(S, ref=np.max)

        # 周波数ビンを取得
        freqs = librosa.fft_frequencies(sr=self.target_sr, n_fft=512)

        # 16バケットに集約（80-4000Hz、対数スケール）
        buckets = []
        for i in range(num_buckets):
            # 対数スケール (Handyと同じ)
            log_start = (i / num_buckets) ** 2
            log_end = ((i + 1) / num_buckets) ** 2

            freq_start = 80 + (4000 - 80) * log_start
            freq_end = 80 + (4000 - 80) * log_end

            # 該当する周波数ビンの平均
            mask = (freqs >= freq_start) & (freqs < freq_end)
            if np.any(mask):
                bucket_db = np.mean(S_db[mask, :])
                # -55dB ~ -8dB を 0~1 に正規化
                normalized = (bucket_db - (-55)) / ((-8) - (-55))
                normalized = np.clip(normalized, 0, 1)
                # ゲイン補正とカーブ適用 (Handyと同じ)
                final_value = (normalized * 1.3) ** 0.7
                buckets.append(float(np.clip(final_value, 0, 1)))
            else:
                buckets.append(0.0)

        return buckets


# グローバルシングルトン
_handy_preprocessor: Optional[HandyPreprocessor] = None

def get_handy_preprocessor() -> HandyPreprocessor:
    """Handy前処理のシングルトンインスタンスを取得"""
    global _handy_preprocessor
    if _handy_preprocessor is None:
        _handy_preprocessor = HandyPreprocessor()
    return _handy_preprocessor
