export interface ClipboardPort {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  simulatePaste(): Promise<void>;
}
