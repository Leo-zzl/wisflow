import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  AudioCaptureService,
  AudioCaptureConfig,
  ChunkCallback,
  UnsubscribeFn,
  DEFAULT_CAPTURE_CONFIG,
} from '@domain/voice/services/AudioCaptureService';
import { AudioChunk } from '@domain/voice/value-objects/AudioChunk';

/**
 * Tauri 音频采集适配器
 * 实现 AudioCaptureService，通过 Rust cpal 采集麦克风音频
 * Rust 侧通过 Tauri event 推送 PCM 数据块到前端
 */
export class TauriAudioCaptureAdapter implements AudioCaptureService {
  private config: AudioCaptureConfig = { ...DEFAULT_CAPTURE_CONFIG };
  private capturing = false;
  private paused = false;
  private readonly callbacks = new Set<ChunkCallback>();
  private unlistenAudioChunk: UnlistenFn | null = null;

  async startCapture(config?: Partial<AudioCaptureConfig>): Promise<void> {
    if (this.capturing) return;

    this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
    this.capturing = true;
    this.paused = false;

    // 订阅 Rust 侧推送的音频块事件
    this.unlistenAudioChunk = await listen<number[]>('audio-chunk', event => {
      if (!this.capturing || this.paused) return;

      const rawData = new Float32Array(event.payload);
      const chunk = AudioChunk.create(
        rawData,
        this.config.sampleRate,
        Date.now(),
        this.config.channels
      );
      this.callbacks.forEach(cb => cb(chunk));
    });

    await invoke('start_audio_capture', {
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      chunkDurationMs: this.config.chunkDurationMs,
    });
  }

  async stopCapture(): Promise<void> {
    if (!this.capturing) return;

    this.capturing = false;
    this.paused = false;

    if (this.unlistenAudioChunk) {
      this.unlistenAudioChunk();
      this.unlistenAudioChunk = null;
    }

    await invoke('stop_audio_capture');
  }

  pauseCapture(): Promise<void> {
    this.paused = true;
    return Promise.resolve();
  }

  resumeCapture(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  onChunk(callback: ChunkCallback): UnsubscribeFn {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  isCapturing(): boolean {
    return this.capturing && !this.paused;
  }

  getConfig(): AudioCaptureConfig {
    return { ...this.config };
  }
}
