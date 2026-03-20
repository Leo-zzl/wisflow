export class ClipboardSnapshot {
  readonly text: string;
  private readonly _capturedAtMs: number;

  private constructor(text: string, capturedAt: Date) {
    this.text = text;
    this._capturedAtMs = capturedAt.getTime();
  }

  get capturedAt(): Date {
    return new Date(this._capturedAtMs);
  }

  static create(text: string): ClipboardSnapshot {
    return new ClipboardSnapshot(text, new Date());
  }

  isEmpty(): boolean {
    return this.text.length === 0;
  }
}
