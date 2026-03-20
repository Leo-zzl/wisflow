import { AudioChunk } from '../value-objects/AudioChunk';

export type ChunkCallback = (chunk: AudioChunk) => void;
export type UnsubscribeFn = () => void;

export interface AudioCaptureConfig {
  sampleRate: number;
  channels: number;
  chunkDurationMs: number;
}

export const DEFAULT_CAPTURE_CONFIG: AudioCaptureConfig = {
  sampleRate: 16000,
  channels: 1,
  chunkDurationMs: 100,
};

export interface AudioCaptureService {
  startCapture(config?: Partial<AudioCaptureConfig>): Promise<void>;
  stopCapture(): Promise<void>;
  pauseCapture(): Promise<void>;
  resumeCapture(): Promise<void>;
  onChunk(callback: ChunkCallback): UnsubscribeFn;
  isCapturing(): boolean;
  getConfig(): AudioCaptureConfig;
}
