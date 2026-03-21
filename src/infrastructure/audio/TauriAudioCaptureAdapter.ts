import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  AudioCaptureService,
  AudioCaptureConfig,
  ChunkCallback,
  UnsubscribeFn,
  DEFAULT_CAPTURE_CONFIG,
} from '@domain/voice/services/AudioCaptureService';
import { AudioChunk } from '@domain/voice/value-objects/AudioChunk';

/** 可注入的 Tauri 事件总线接口，便于单元测试 */
export interface TauriEventBus {
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void>;
}

/** 可注入的 Tauri invoke 接口，便于单元测试 */
export interface TauriAudioInvoker {
  startCapture(sampleRate: number, channels: number, chunkDurationMs: number): Promise<void>;
  stopCapture(): Promise<void>;
}

// 默认生产事件总线：直接调用 @tauri-apps/api/event
const defaultEventBus: TauriEventBus = {
  listen: <T>(event: string, handler: (e: { payload: T }) => void) => listen<T>(event, handler),
};

// 默认生产 invoker：直接调用 Tauri invoke
const defaultInvoker: TauriAudioInvoker = {
  startCapture: (sampleRate, channels, chunkDurationMs) =>
    invoke<void>('start_audio_capture', { sampleRate, channels, chunkDurationMs }),
  stopCapture: () => invoke<void>('stop_audio_capture'),
};

/**
 * Tauri 音频采集适配器
 * 实现 AudioCaptureService，通过 Rust cpal 采集麦克风音频。
 * Rust 侧通过 Tauri event 推送 PCM 数据块到前端。
 * 接受可注入依赖，生产时使用默认实现，测试时注入 mock。
 */
export class TauriAudioCaptureAdapter implements AudioCaptureService {
  private config: AudioCaptureConfig = { ...DEFAULT_CAPTURE_CONFIG };
  private capturing = false;
  private paused = false;
  private readonly callbacks = new Set<ChunkCallback>();
  private unlistenAudioChunk: (() => void) | null = null;

  private readonly eventBus: TauriEventBus;
  private readonly invoker: TauriAudioInvoker;

  constructor(
    eventBus: TauriEventBus = defaultEventBus,
    invoker: TauriAudioInvoker = defaultInvoker
  ) {
    this.eventBus = eventBus;
    this.invoker = invoker;
  }

  async startCapture(config?: Partial<AudioCaptureConfig>): Promise<void> {
    if (this.capturing) return;

    this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
    this.capturing = true;
    this.paused = false;

    // 订阅 Rust 侧推送的音频块事件
    this.unlistenAudioChunk = await this.eventBus.listen<number[]>('audio-chunk', event => {
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

    await this.invoker.startCapture(
      this.config.sampleRate,
      this.config.channels,
      this.config.chunkDurationMs
    );
  }

  async stopCapture(): Promise<void> {
    if (!this.capturing) return;

    this.capturing = false;
    this.paused = false;

    if (this.unlistenAudioChunk) {
      this.unlistenAudioChunk();
      this.unlistenAudioChunk = null;
    }

    await this.invoker.stopCapture();
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
