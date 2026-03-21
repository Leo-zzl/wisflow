import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import { ClipboardPort } from '@domain/action/ports/ClipboardPort';

/**
 * Tauri 剪贴板适配器
 * 实现 ClipboardPort，使用 Tauri 插件 API 替代 Electron clipboard
 */
export class TauriClipboardAdapter implements ClipboardPort {
  async readText(): Promise<string> {
    return await readText();
  }

  async writeText(text: string): Promise<void> {
    await writeText(text);
  }

  async simulatePaste(): Promise<void> {
    await invoke('simulate_paste');
  }
}
