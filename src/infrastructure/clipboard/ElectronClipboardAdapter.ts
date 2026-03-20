import { ClipboardPort } from '@domain/action/ports/ClipboardPort';

/**
 * 最小化的 Electron clipboard 模块接口，便于测试注入
 */
export interface ElectronClipboardModule {
  readText(): string;
  writeText(text: string, type?: string): void;
}

/**
 * 键盘模拟接口 - 在主进程中通过 robotjs 或 uiohook-napi 实现
 */
export interface KeyboardSimulator {
  paste(): Promise<void>;
}

/**
 * Windows 剪贴板适配器
 * 实现 ClipboardPort，桥接 Electron clipboard API 与键盘模拟
 * 运行在 Electron 主进程中
 */
export class ElectronClipboardAdapter implements ClipboardPort {
  constructor(
    private readonly clipboard: ElectronClipboardModule,
    private readonly keyboard: KeyboardSimulator
  ) {}

  readText(): Promise<string> {
    return Promise.resolve(this.clipboard.readText());
  }

  writeText(text: string): Promise<void> {
    this.clipboard.writeText(text);
    return Promise.resolve();
  }

  simulatePaste(): Promise<void> {
    return this.keyboard.paste();
  }
}

/**
 * 默认的键盘模拟实现（主进程使用）
 * 通过发送 IPC 消息触发渲染进程执行 Ctrl+V
 */
export class IpcKeyboardSimulator implements KeyboardSimulator {
  constructor(private readonly sendToFocusedWindow: (channel: string) => void) {}

  paste(): Promise<void> {
    this.sendToFocusedWindow('simulate-paste');
    return Promise.resolve();
  }
}
