import { AudioChunk } from '../value-objects/AudioChunk';
import type { RecordingState } from '../value-objects/RecordingState';
import { isValidTransition } from '../value-objects/RecordingState';

export interface RecordingSessionProps {
  id: string;
}

export class RecordingSession {
  readonly id: string;
  private _state: RecordingState;
  private readonly _chunks: AudioChunk[];
  private _startTime: number | null;
  private _endTime: number | null;

  private constructor(props: RecordingSessionProps) {
    this.id = props.id;
    this._state = 'idle';
    this._chunks = [];
    this._startTime = null;
    this._endTime = null;
  }

  static create(id?: string): RecordingSession {
    return new RecordingSession({
      id: id ?? RecordingSession.generateId(),
    });
  }

  private static generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  get state(): RecordingState {
    return this._state;
  }

  get startTime(): number | null {
    return this._startTime;
  }

  get endTime(): number | null {
    return this._endTime;
  }

  private transition(to: RecordingState): void {
    if (!isValidTransition(this._state, to)) {
      throw new Error(`无效的状态转换: ${this._state} -> ${to}`);
    }
    this._state = to;
  }

  start(): void {
    this.transition('recording');
    this._startTime = Date.now();
  }

  stop(): void {
    this.transition('stopped');
    this._endTime = Date.now();
  }

  pause(): void {
    this.transition('paused');
  }

  resume(): void {
    this.transition('recording');
  }

  addChunk(chunk: AudioChunk): void {
    if (this._state !== 'recording') {
      throw new Error('只能在录音状态下添加音频块');
    }
    this._chunks.push(chunk);
  }

  getChunks(): readonly AudioChunk[] {
    return this._chunks;
  }

  getDurationMs(): number {
    if (this._startTime === null) return 0;
    const end = this._endTime ?? Date.now();
    return end - this._startTime;
  }

  getTotalAudioDurationMs(): number {
    return this._chunks.reduce((sum, chunk) => sum + chunk.durationMs, 0);
  }

  getMergedAudio(): Float32Array | null {
    if (this._chunks.length === 0) return null;

    const totalSamples = this._chunks.reduce((sum, chunk) => sum + chunk.sampleCount, 0);
    const merged = new Float32Array(totalSamples);

    let offset = 0;
    for (const chunk of this._chunks) {
      merged.set(chunk.data, offset);
      offset += chunk.sampleCount;
    }

    return merged;
  }

  getSampleRate(): number | null {
    return this._chunks[0]?.sampleRate ?? null;
  }

  get chunkCount(): number {
    return this._chunks.length;
  }

  isActive(): boolean {
    return this._state === 'recording' || this._state === 'paused';
  }
}
