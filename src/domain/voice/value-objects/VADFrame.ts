export interface VADFrameProps {
  speechProbability: number;
  timestamp: number;
  durationMs: number;
}

export class VADFrame {
  static readonly SPEECH_THRESHOLD = 0.5;

  readonly speechProbability: number;
  readonly isSpeech: boolean;
  readonly timestamp: number;
  readonly durationMs: number;

  constructor(props: VADFrameProps) {
    this.validate(props);
    this.speechProbability = props.speechProbability;
    this.isSpeech = props.speechProbability >= VADFrame.SPEECH_THRESHOLD;
    this.timestamp = props.timestamp;
    this.durationMs = props.durationMs;
  }

  private validate(props: VADFrameProps): void {
    if (props.speechProbability < 0 || props.speechProbability > 1) {
      throw new Error('语音概率必须在 [0, 1] 范围内');
    }
    if (props.timestamp < 0) {
      throw new Error('时间戳不能为负数');
    }
    if (props.durationMs <= 0) {
      throw new Error('帧时长必须大于0');
    }
  }

  static speech(timestamp: number, durationMs: number): VADFrame {
    return new VADFrame({ speechProbability: 1.0, timestamp, durationMs });
  }

  static silence(timestamp: number, durationMs: number): VADFrame {
    return new VADFrame({ speechProbability: 0.0, timestamp, durationMs });
  }
}
