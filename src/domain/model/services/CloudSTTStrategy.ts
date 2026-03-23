import type { STTStrategy, STTStrategyType } from '../ports/STTStrategy';
import { AudioChunk } from '../value-objects/AudioChunk';
import { TranscriptionResult } from '../value-objects/TranscriptionResult';

export interface CloudSTTConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * 云端语音识别策略
 *
 * 支持 OpenAI 兼容接口（包括 Kimi、OpenAI 等）
 */
export class CloudSTTStrategy implements STTStrategy {
  readonly strategyType: STTStrategyType = 'cloud';

  constructor(private readonly config: CloudSTTConfig) {}

  getConfig(): CloudSTTConfig {
    return { ...this.config };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async transcribe(chunk: AudioChunk): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('API key 未配置');
    }

    const wavData = chunk.toWav();
    const formData = new FormData();

    // Create file from WAV data
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const timestamp = Date.now();
    const file = new File([blob], `audio_${timestamp}.wav`, { type: 'audio/wav' });

    formData.append('file', file);
    formData.append('model', this.config.model);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `语音识别失败`);
      }

      const data = (await response.json()) as { text?: string };
      const text = data.text ?? '';

      // Estimate duration from audio chunk
      const durationMs = Math.round((chunk.data.length / chunk.sampleRate) * 1000);

      return new TranscriptionResult({ text, durationMs });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('network')
        ) {
          throw new Error('网络错误');
        }
        throw error;
      }
      throw new Error('语音识别失败');
    }
  }
}
