export interface TranscriptionResultProps {
  text: string;
  language?: string | null;
  confidence?: number | null;
  durationMs: number;
}

export class TranscriptionResult {
  readonly text: string;
  readonly language: string | null;
  readonly confidence: number | null;
  readonly durationMs: number;

  constructor(props: TranscriptionResultProps) {
    if (props.durationMs < 0) throw new Error('时长不能为负数');

    this.text = props.text;
    this.language = props.language ?? null;
    this.confidence = props.confidence ?? null;
    this.durationMs = props.durationMs;
  }

  isEmpty(): boolean {
    return this.text.trim() === '';
  }

  append(other: TranscriptionResult): TranscriptionResult {
    return new TranscriptionResult({
      text: this.isEmpty() ? other.text : `${this.text}${other.text}`,
      language: this.language ?? other.language,
      confidence:
        this.confidence !== null && other.confidence !== null
          ? (this.confidence + other.confidence) / 2
          : (this.confidence ?? other.confidence),
      durationMs: this.durationMs + other.durationMs,
    });
  }

  static empty(durationMs = 0): TranscriptionResult {
    return new TranscriptionResult({ text: '', durationMs });
  }
}
