export interface AudioChunkProps {
  data: Float32Array;
  sampleRate: number;
  channels: number;
  timestamp: number;
  durationMs: number;
}

export class AudioChunk {
  readonly data: Float32Array;
  readonly sampleRate: number;
  readonly channels: number;
  readonly timestamp: number;
  readonly durationMs: number;

  constructor(props: AudioChunkProps) {
    this.validate(props);
    this.data = new Float32Array(props.data);
    this.sampleRate = props.sampleRate;
    this.channels = props.channels;
    this.timestamp = props.timestamp;
    this.durationMs = props.durationMs;
  }

  private validate(props: AudioChunkProps): void {
    if (!props.data || props.data.length === 0) {
      throw new Error('音频数据不能为空');
    }
    if (props.sampleRate <= 0) {
      throw new Error('采样率必须大于0');
    }
    if (props.channels <= 0) {
      throw new Error('声道数必须大于0');
    }
    if (props.timestamp < 0) {
      throw new Error('时间戳不能为负数');
    }
    if (props.durationMs <= 0) {
      throw new Error('时长必须大于0');
    }
  }

  get sampleCount(): number {
    return this.data.length;
  }

  static create(
    data: Float32Array,
    sampleRate: number,
    timestamp: number,
    channels = 1
  ): AudioChunk {
    const durationMs = (data.length / sampleRate) * 1000;
    return new AudioChunk({ data, sampleRate, channels, timestamp, durationMs });
  }
}
