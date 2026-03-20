import type { PolishStyle } from '../enums/PolishStyle';

export interface PolishConfig {
  intensity: 1 | 2 | 3 | 4 | 5;
  customPrompt?: string;
}

export interface PolishPort {
  polish(text: string, style: PolishStyle, config?: PolishConfig): Promise<string>;
  isAvailable(): Promise<boolean>;
}
