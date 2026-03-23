import { ShortcutConfig } from '../value-objects/ShortcutConfig';

export type ModelPolicyType = 'local' | 'cloud' | 'hybrid' | 'auto';
export type PolishStyle = 'colloquial' | 'light' | 'deep' | 'condensed' | 'custom';

export interface ModelPolicy {
  stt: ModelPolicyType;
  llm: ModelPolicyType;
  fallback: boolean;
}

export interface PolishConfig {
  style: PolishStyle;
  intensity: 1 | 2 | 3 | 4 | 5;
  autoPolish: boolean;
}

export interface UIConfig {
  showFloatingWindow: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface UserConfigProps {
  shortcut: ShortcutConfig;
  modelPolicy: ModelPolicy;
  polish: PolishConfig;
  ui: UIConfig;
}

export class UserConfig {
  readonly shortcut: ShortcutConfig;
  readonly modelPolicy: ModelPolicy;
  readonly polish: PolishConfig;
  readonly ui: UIConfig;

  private constructor(props: UserConfigProps) {
    this.validate(props);
    this.shortcut = props.shortcut;
    this.modelPolicy = Object.freeze({ ...props.modelPolicy });
    this.polish = Object.freeze({ ...props.polish });
    this.ui = Object.freeze({ ...props.ui });
  }

  private validate(props: UserConfigProps): void {
    if (!props.shortcut) {
      throw new Error('快捷键配置不能为空');
    }
  }

  static createDefault(): UserConfig {
    return new UserConfig({
      shortcut: new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
        mode: 'hold',
      }),
      modelPolicy: {
        stt: 'auto',
        llm: 'auto',
        fallback: true,
      },
      polish: {
        style: 'light',
        intensity: 3,
        autoPolish: true,
      },
      ui: {
        showFloatingWindow: true,
        theme: 'system',
      },
    });
  }

  static create(partial: Partial<UserConfigProps> = {}): UserConfig {
    const defaults = UserConfig.createDefault();
    return new UserConfig({
      shortcut: partial.shortcut ?? defaults.shortcut,
      modelPolicy: partial.modelPolicy ?? defaults.modelPolicy,
      polish: partial.polish ?? defaults.polish,
      ui: partial.ui ?? defaults.ui,
    });
  }

  updateShortcut(newShortcut: ShortcutConfig): UserConfig {
    return new UserConfig({
      ...this.toJSON(),
      shortcut: newShortcut,
    });
  }

  updatePolishStyle(style: PolishStyle): UserConfig {
    return new UserConfig({
      ...this.toJSON(),
      polish: { ...this.polish, style },
    });
  }

  updatePolishIntensity(intensity: 1 | 2 | 3 | 4 | 5): UserConfig {
    if (intensity < 1 || intensity > 5) {
      throw new Error('润色强度必须在 1-5 之间');
    }
    return new UserConfig({
      ...this.toJSON(),
      polish: { ...this.polish, intensity },
    });
  }

  updateModelPolicy(policy: Partial<ModelPolicy>): UserConfig {
    return new UserConfig({
      ...this.toJSON(),
      modelPolicy: { ...this.modelPolicy, ...policy },
    });
  }

  validateNoConflict(other: UserConfig): void {
    if (this.shortcut.equals(other.shortcut)) {
      throw new Error('快捷键冲突');
    }
  }

  toJSON(): UserConfigProps {
    return {
      shortcut: this.shortcut,
      modelPolicy: { ...this.modelPolicy },
      polish: { ...this.polish },
      ui: { ...this.ui },
    };
  }

  static fromJSON(json: UserConfigProps): UserConfig {
    return new UserConfig({
      shortcut: ShortcutConfig.fromJSON(json.shortcut.toJSON()),
      modelPolicy: json.modelPolicy,
      polish: json.polish,
      ui: json.ui,
    });
  }
}
