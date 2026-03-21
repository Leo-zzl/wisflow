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
// 默认生产模块：直接调用 Tauri 插件 API
const defaultModule: TauriClipboardModule = {
  readText: () => readText(),
  writeText: (text: string) => writeText(text),
};

// 默认生产粘贴命令：通过 Tauri invoke 执行 Rust 侧 simulate_paste
const defaultPaste: TauriPasteInvoker = {
  simulatePaste: () => invoke<void>('simulate_paste'),
};

/**
 * Tauri 剪贴板适配器
 * 实现 ClipboardPort，使用 Tauri 插件 API 替代 Electron clipboard。
 * 接受可注入依赖，生产时使用默认实现，测试时注入 mock。
 */
export class TauriClipboardAdapter implements ClipboardPort {
  private readonly module: TauriClipboardModule;
  private readonly paste: TauriPasteInvoker;

  constructor(
    module: TauriClipboardModule = defaultModule,
    paste: TauriPasteInvoker = defaultPaste
  ) {
    this.module = module;
    this.paste = paste;
  }

  async readText(): Promise<string> {
    return await this.module.readText();
  }

  async writeText(text: string): Promise<void> {
    await this.module.writeText(text);
  }

  async simulatePaste(): Promise<void> {
    await this.paste.simulatePaste();
  }
}
