import { STTStrategy, STTStrategyType } from '@domain/model/ports/STTStrategy';
import { AudioChunk } from '@domain/model/value-objects/AudioChunk';
import { TranscriptionResult } from '@domain/model/value-objects/TranscriptionResult';

export interface CloudSTTConfig {
  endpoint: string;
  apiKey: string;
  model?: string;
  language?: string;
}

interface OpenAITranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

export class CloudSTTStrategy implements STTStrategy {
  readonly strategyType: STTStrategyType = 'cloud';
  private readonly model: string;

  constructor(private readonly config: CloudSTTConfig) {
    this.model = config.model ?? 'whisper-1';
  }

  async transcribe(chunk: AudioChunk): Promise<TranscriptionResult> {
    const wav = chunk.toWav();
    const formData = new FormData();
    formData.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', this.model);
    formData.append('response_format', 'verbose_json');
    if (this.config.language) formData.append('language', this.config.language);

    const response = await fetch(`${this.config.endpoint}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`云端STT请求失败: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as OpenAITranscriptionResponse;
    return new TranscriptionResult({
      text: json.text,
      language: json.language ?? null,
      durationMs: chunk.durationMs,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.endpoint && this.config.apiKey);
  }
}
