import type { PolishStyle } from '../enums/PolishStyle';

interface ContentSessionProps {
  id: string;
  rawText: string;
  polishedText: string | null;
  polishStyle: PolishStyle;
  createdAt: Date;
}

export class ContentSession {
  readonly id: string;
  readonly rawText: string;
  readonly polishedText: string | null;
  readonly polishStyle: PolishStyle;
  readonly createdAt: Date;

  private constructor(props: ContentSessionProps) {
    this.id = props.id;
    this.rawText = props.rawText;
    this.polishedText = props.polishedText;
    this.polishStyle = props.polishStyle;
    this.createdAt = new Date(props.createdAt);
  }

  private static generateId(): string {
    return `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  static create(rawText: string, style: PolishStyle): ContentSession {
    if (!rawText.trim()) throw new Error('原始文本不能为空');
    return new ContentSession({
      id: ContentSession.generateId(),
      rawText,
      polishedText: null,
      polishStyle: style,
      createdAt: new Date(),
    });
  }

  setPolishedText(text: string): ContentSession {
    if (!text.trim()) throw new Error('润色文本不能为空');
    return new ContentSession({ ...this.toProps(), polishedText: text });
  }

  appendRawText(chunk: string): ContentSession {
    return new ContentSession({
      ...this.toProps(),
      rawText: this.rawText + chunk,
      polishedText: null,
    });
  }

  hasBeenPolished(): boolean {
    return this.polishedText !== null;
  }

  getDisplayText(): string {
    return this.polishedText ?? this.rawText;
  }

  private toProps(): ContentSessionProps {
    return {
      id: this.id,
      rawText: this.rawText,
      polishedText: this.polishedText,
      polishStyle: this.polishStyle,
      createdAt: this.createdAt,
    };
  }
}
