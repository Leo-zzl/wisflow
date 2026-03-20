export type ModifierKey = 'Control' | 'Shift' | 'Alt' | 'Meta';
export type ShortcutMode = 'hold' | 'toggle';

export interface ShortcutConfigProps {
  triggerKey: string;
  modifiers: ModifierKey[];
  mode?: ShortcutMode;
}

export class ShortcutConfig {
  readonly triggerKey: string;
  readonly modifiers: readonly ModifierKey[];
  readonly mode: ShortcutMode;

  private static readonly VALID_MODIFIERS: ModifierKey[] = [
    'Control',
    'Shift',
    'Alt',
    'Meta',
  ];

  constructor(props: ShortcutConfigProps) {
    this.validate(props);
    this.triggerKey = props.triggerKey;
    this.modifiers = Object.freeze([...props.modifiers].sort());
    this.mode = props.mode ?? 'hold';
  }

  private validate(props: ShortcutConfigProps): void {
    if (!props.triggerKey || props.triggerKey.trim() === '') {
      throw new Error('快捷键不能为空');
    }

    for (const modifier of props.modifiers) {
      if (!ShortcutConfig.VALID_MODIFIERS.includes(modifier)) {
        throw new Error(`无效的修饰键: ${modifier}`);
      }
    }
  }

  equals(other: ShortcutConfig): boolean {
    if (this.triggerKey !== other.triggerKey) return false;
    if (this.modifiers.length !== other.modifiers.length) return false;

    const thisModifiers = [...this.modifiers].sort();
    const otherModifiers = [...other.modifiers].sort();

    return thisModifiers.every((mod, index) => mod === otherModifiers[index]);
  }

  toString(): string {
    const modifierMap: Record<ModifierKey, string> = {
      Control: 'Ctrl',
      Shift: 'Shift',
      Alt: 'Alt',
      Meta: 'Meta',
    };

    const modifierStr = this.modifiers.map((m) => modifierMap[m]).join('+');
    return modifierStr ? `${modifierStr}+${this.triggerKey}` : this.triggerKey;
  }

  toJSON(): ShortcutConfigProps {
    return {
      triggerKey: this.triggerKey,
      modifiers: [...this.modifiers],
      mode: this.mode,
    };
  }

  static fromJSON(json: ShortcutConfigProps): ShortcutConfig {
    return new ShortcutConfig(json);
  }
}
