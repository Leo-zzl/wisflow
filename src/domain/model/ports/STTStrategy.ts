import { AudioChunk } from '../value-objects/AudioChunk';
import { TranscriptionResult } from '../value-objects/TranscriptionResult';

export type STTStrategyType = 'cloud' | 'local';

export interface STTStrategy {
  readonly strategyType: STTStrategyType;
  transcribe(chunk: AudioChunk): Promise<TranscriptionResult>;
  isAvailable(): Promise<boolean>;
}
