import type { PolishStyle } from '../enums/PolishStyle';

export class ContentSession {
  readonly id: string;
  readonly rawText: string;
  readonly polishedText: string | null;
  readonly polishStyle: PolishStyle;
  readonly createdAt: Date;

  private constructor(props: {
    id: string;
    rawText: string;
    polishedText: string | null;
    polishStyle: PolishStyle;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.rawText = props.rawText;
    this.polishedText = props.polishedText;
    this.polishStyle = props.polishStyle;
    this.createdAt = props.createdAt;
  }

  static create(_rawText: string, _style: PolishStyle): ContentSession {
    throw new Error('Not implemented');
  }

  setPolishedText(_text: string): ContentSession {
    throw new Error('Not implemented');
  }

  hasBeenPolished(): boolean {
    throw new Error('Not implemented');
  }

  getDisplayText(): string {
    throw new Error('Not implemented');
  }

  appendRawText(_chunk: string): ContentSession {
    throw new Error('Not implemented');
  }
}
