export type SemanticChunkTrigger = 'length_threshold' | 'pause_detected' | 'session_end';

export interface SemanticChunkProps {
  audioData: Float32Array;
  sampleRate: number;
  durationMs: number;
  estimatedLength: number;
  triggerReason: SemanticChunkTrigger;
}

export class SemanticChunk {
  readonly audioData: Float32Array;
  readonly sampleRate: number;
  readonly durationMs: number;
  readonly estimatedLength: number;
  readonly triggerReason: SemanticChunkTrigger;

  constructor(props: SemanticChunkProps) {
    this.validate(props);
    this.audioData = new Float32Array(props.audioData);
    this.sampleRate = props.sampleRate;
    this.durationMs = props.durationMs;
    this.estimatedLength = props.estimatedLength;
    this.triggerReason = props.triggerReason;
  }

  private validate(props: SemanticChunkProps): void {
    if (!props.audioData || props.audioData.length === 0) {
      throw new Error('语义块音频数据不能为空');
    }
    if (props.sampleRate <= 0) {
      throw new Error('采样率必须大于0');
    }
    if (props.durationMs <= 0) {
      throw new Error('时长必须大于0');
    }
    if (props.estimatedLength < 0) {
      throw new Error('估计字数不能为负数');
    }
  }

  get sampleCount(): number {
    return this.audioData.length;
  }
}
