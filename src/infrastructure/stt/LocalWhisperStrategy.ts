import { STTStrategy, STTStrategyType } from '@domain/model/ports/STTStrategy';
import { AudioChunk } from '@domain/model/value-objects/AudioChunk';
import { TranscriptionResult } from '@domain/model/value-objects/TranscriptionResult';

export interface LocalWhisperConfig {
  baseUrl?: string;
  language?: string;
  model?: string;
}

interface WhisperResponse {
  text: string;
  language?: string;
}

export class LocalWhisperStrategy implements STTStrategy {
  readonly strategyType: STTStrategyType = 'local';
  private readonly baseUrl: string;

  constructor(private readonly config: LocalWhisperConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://127.0.0.1:8765';
  }

  async transcribe(chunk: AudioChunk): Promise<TranscriptionResult> {
    const wav = chunk.toWav();
    const formData = new FormData();
    formData.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    if (this.config.language) formData.append('language', this.config.language);
    if (this.config.model) formData.append('model', this.config.model);

    const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`本地Whisper请求失败: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as WhisperResponse;
    return new TranscriptionResult({
      text: json.text,
      language: json.language ?? null,
      durationMs: chunk.durationMs,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
