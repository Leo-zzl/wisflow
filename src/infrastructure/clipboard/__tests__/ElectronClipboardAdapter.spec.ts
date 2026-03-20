import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ElectronClipboardAdapter,
  ElectronClipboardModule,
  KeyboardSimulator,
} from '../ElectronClipboardAdapter';

function makeClipboard(overrides: Partial<ElectronClipboardModule> = {}): ElectronClipboardModule {
  return {
    readText: vi.fn().mockReturnValue(''),
    writeText: vi.fn(),
    ...overrides,
  };
}

function makeKeyboard(overrides: Partial<KeyboardSimulator> = {}): KeyboardSimulator {
  return {
    paste: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ElectronClipboardAdapter', () => {
  let clipboard: ElectronClipboardModule;
  let keyboard: KeyboardSimulator;
  let adapter: ElectronClipboardAdapter;

  beforeEach(() => {
    clipboard = makeClipboard();
    keyboard = makeKeyboard();
    adapter = new ElectronClipboardAdapter(clipboard, keyboard);
  });

  describe('readText', () => {
    it('应该从 Electron 剪贴板读取文本', async () => {
      clipboard = makeClipboard({ readText: vi.fn().mockReturnValue('剪贴板内容') });
      adapter = new ElectronClipboardAdapter(clipboard, keyboard);

      const text = await adapter.readText();

      expect(text).toBe('剪贴板内容');
      expect(clipboard.readText).toHaveBeenCalledTimes(1);
    });

    it('剪贴板为空时应返回空字符串', async () => {
      const text = await adapter.readText();

      expect(text).toBe('');
    });

    it('应该返回最新的剪贴板内容', async () => {
      clipboard = makeClipboard({ readText: vi.fn().mockReturnValue('新内容') });
      adapter = new ElectronClipboardAdapter(clipboard, keyboard);

      const text = await adapter.readText();

      expect(text).toBe('新内容');
    });
  });

  describe('writeText', () => {
    it('应该向 Electron 剪贴板写入文本', async () => {
      await adapter.writeText('写入内容');

      expect(clipboard.writeText).toHaveBeenCalledWith('写入内容');
    });

    it('应该允许写入空字符串', async () => {
      await adapter.writeText('');

      expect(clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('应该允许写入多行文本', async () => {
      const multiline = '第一行\n第二行\n第三行';
      await adapter.writeText(multiline);

      expect(clipboard.writeText).toHaveBeenCalledWith(multiline);
    });
  });

  describe('simulatePaste', () => {
    it('应该调用键盘模拟器执行粘贴', async () => {
      await adapter.simulatePaste();

      expect(keyboard.paste).toHaveBeenCalledTimes(1);
    });

    it('键盘模拟失败时应该传播错误', async () => {
      keyboard = makeKeyboard({ paste: vi.fn().mockRejectedValue(new Error('模拟失败')) });
      adapter = new ElectronClipboardAdapter(clipboard, keyboard);

      await expect(adapter.simulatePaste()).rejects.toThrow('模拟失败');
    });
  });
});
