import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import { ClipboardPort } from '@domain/action/ports/ClipboardPort';

/** 可注入的剪贴板读写接口，便于单元测试 */
export interface TauriClipboardModule {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

/** 可注入的粘贴命令接口，便于单元测试 */
export interface TauriPasteInvoker {
  simulatePaste(): Promise<void>;
}

/**
 * Tauri 剪贴板适配器
 * 实现 ClipboardPort，使用 Tauri 插件 API 替代 Electron clipboard。
 * 接受可选的依赖注入参数以支持单元测试。
 */
export class TauriClipboardAdapter implements ClipboardPort {
  constructor(
    private readonly _module?: TauriClipboardModule,
    private readonly _paste?: TauriPasteInvoker
  ) {}

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
