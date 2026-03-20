import { AudioChunk } from '../value-objects/AudioChunk';
import { VADFrame } from '../value-objects/VADFrame';
import { SemanticChunk, SemanticChunkTrigger } from '../value-objects/SemanticChunk';

export interface SemanticChunkDetectorConfig {
  /** 触发语义块的字数阈值，默认 10 字 */
  charThreshold: number;
  /** 中文语速（字/秒），默认 4.5 字/秒 */
  speechRateCharsPerSec: number;
  /** 触发停顿语义块的静音时长（ms），默认 500ms */
  pauseThresholdMs: number;
  /** 能量检测阈值（RMS），低于此值视为静音，默认 0.001 */
  energyThreshold: number;
  /** 能量分析的子帧时长（ms），默认 10ms */
  analysisFrameMs: number;
}

export const DEFAULT_DETECTOR_CONFIG: SemanticChunkDetectorConfig = {
  charThreshold: 10,
  speechRateCharsPerSec: 4.5,
  pauseThresholdMs: 500,
  energyThreshold: 0.001,
  analysisFrameMs: 10,
};

interface EnergyAnalysisResult {
  speechMs: number;
  endsWithSilence: boolean;
  trailingSilenceMs: number;
}

export class SemanticChunkDetector {
  private readonly config: SemanticChunkDetectorConfig;
  private accumulatedChunks: AudioChunk[];
  private accumulatedSpeechMs: number;
  private pendingSilenceMs: number;

  constructor(config: Partial<SemanticChunkDetectorConfig> = {}) {
    this.config = { ...DEFAULT_DETECTOR_CONFIG, ...config };
    this.accumulatedChunks = [];
    this.accumulatedSpeechMs = 0;
    this.pendingSilenceMs = 0;
  }

  /**
   * 处理一个音频块，返回语义块（如果触发条件满足）或 null。
   * @param chunk 音频块
   * @param vadFrame 可选的外部 VAD 结果；未提供时使用内部能量检测
   */
  process(chunk: AudioChunk, vadFrame?: VADFrame): SemanticChunk | null {
    const analysis = vadFrame
      ? this.analyzeFromVADFrame(chunk, vadFrame)
      : this.analyzeFromEnergy(chunk);

    if (analysis.speechMs > 0) {
      this.accumulatedChunks.push(chunk);
      this.accumulatedSpeechMs += analysis.speechMs;
      this.pendingSilenceMs = 0;
    }

    if (analysis.endsWithSilence) {
      this.pendingSilenceMs += analysis.trailingSilenceMs;
    }

    const estimatedChars = (this.accumulatedSpeechMs / 1000) * this.config.speechRateCharsPerSec;

    if (estimatedChars >= this.config.charThreshold && this.accumulatedChunks.length > 0) {
      return this.emit('length_threshold');
    }

    if (
      this.pendingSilenceMs >= this.config.pauseThresholdMs &&
      this.accumulatedChunks.length > 0
    ) {
      return this.emit('pause_detected');
    }

    return null;
  }

  /**
   * 强制输出剩余积累的音频（录音结束时调用）
   */
  flush(): SemanticChunk | null {
    if (this.accumulatedChunks.length === 0) return null;
    return this.emit('session_end');
  }

  reset(): void {
    this.accumulatedChunks = [];
    this.accumulatedSpeechMs = 0;
    this.pendingSilenceMs = 0;
  }

  get bufferedSpeechMs(): number {
    return this.accumulatedSpeechMs;
  }

  get bufferedChunkCount(): number {
    return this.accumulatedChunks.length;
  }

  private analyzeFromVADFrame(chunk: AudioChunk, frame: VADFrame): EnergyAnalysisResult {
    if (frame.isSpeech) {
      return { speechMs: chunk.durationMs, endsWithSilence: false, trailingSilenceMs: 0 };
    }
    return {
      speechMs: 0,
      endsWithSilence: true,
      trailingSilenceMs: chunk.durationMs,
    };
  }

  private analyzeFromEnergy(chunk: AudioChunk): EnergyAnalysisResult {
    const { sampleRate, data } = chunk;
    const frameSamples = Math.floor((sampleRate * this.config.analysisFrameMs) / 1000);

    if (frameSamples === 0) {
      const rms = this.calcRMS(data, 0, data.length);
      const isSpeech = rms > this.config.energyThreshold;
      return {
        speechMs: isSpeech ? chunk.durationMs : 0,
        endsWithSilence: !isSpeech,
        trailingSilenceMs: isSpeech ? 0 : chunk.durationMs,
      };
    }

    const frameCount = Math.floor(data.length / frameSamples);
    let speechMs = 0;
    let trailingSilenceMs = 0;
    let endsWithSilence = false;

    for (let i = 0; i < frameCount; i++) {
      const start = i * frameSamples;
      const rms = this.calcRMS(data, start, start + frameSamples);
      if (rms > this.config.energyThreshold) {
        speechMs += this.config.analysisFrameMs;
        trailingSilenceMs = 0;
        endsWithSilence = false;
      } else {
        trailingSilenceMs += this.config.analysisFrameMs;
        endsWithSilence = true;
      }
    }

    return { speechMs, endsWithSilence, trailingSilenceMs };
  }

  private calcRMS(data: Float32Array, start: number, end: number): number {
    const len = end - start;
    if (len <= 0) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / len);
  }

  private emit(reason: SemanticChunkTrigger): SemanticChunk {
    const merged = this.mergeChunks();
    const sampleRate = this.accumulatedChunks[0].sampleRate;
    const totalDurationMs = this.accumulatedChunks.reduce((s, c) => s + c.durationMs, 0);
    const estimatedLength =
      (this.accumulatedSpeechMs / 1000) * this.config.speechRateCharsPerSec;

    const chunk = new SemanticChunk({
      audioData: merged,
      sampleRate,
      durationMs: totalDurationMs,
      estimatedLength,
      triggerReason: reason,
    });

    this.reset();
    return chunk;
  }

  private mergeChunks(): Float32Array {
    const total = this.accumulatedChunks.reduce((s, c) => s + c.sampleCount, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of this.accumulatedChunks) {
      merged.set(c.data, offset);
      offset += c.sampleCount;
    }
    return merged;
  }
}
