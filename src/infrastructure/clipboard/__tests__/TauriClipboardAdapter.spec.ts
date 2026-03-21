import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TauriClipboardAdapter,
  TauriClipboardModule,
  TauriPasteInvoker,
} from '../TauriClipboardAdapter';

function makeModule(overrides: Partial<TauriClipboardModule> = {}): TauriClipboardModule {
  return {
    readText: vi.fn().mockResolvedValue(''),
    writeText: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePaste(overrides: Partial<TauriPasteInvoker> = {}): TauriPasteInvoker {
  return {
    simulatePaste: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('TauriClipboardAdapter', () => {
  let module: TauriClipboardModule;
  let paste: TauriPasteInvoker;
  let adapter: TauriClipboardAdapter;

  beforeEach(() => {
    module = makeModule();
    paste = makePaste();
    adapter = new TauriClipboardAdapter(module, paste);
  });

  describe('readText', () => {
    it('应读取系统剪贴板的当前文本内容', async () => {
      module = makeModule({ readText: vi.fn().mockResolvedValue('剪贴板内容') });
      adapter = new TauriClipboardAdapter(module, paste);

      const text = await adapter.readText();

      expect(text).toBe('剪贴板内容');
      expect(module.readText).toHaveBeenCalledTimes(1);
    });

    it('剪贴板为空时应返回空字符串', async () => {
      const text = await adapter.readText();

      expect(text).toBe('');
    });

    it('应该返回最新的剪贴板内容', async () => {
      module = makeModule({ readText: vi.fn().mockResolvedValue('最新内容') });
      adapter = new TauriClipboardAdapter(module, paste);

      const text = await adapter.readText();

      expect(text).toBe('最新内容');
    });
  });

  describe('writeText', () => {
    it('应将文本写入系统剪贴板', async () => {
      await adapter.writeText('写入内容');

      expect(module.writeText).toHaveBeenCalledWith('写入内容');
    });

    it('应该允许写入空字符串', async () => {
      await adapter.writeText('');

      expect(module.writeText).toHaveBeenCalledWith('');
    });

    it('应该允许写入多行文本', async () => {
      const multiline = '第一行\n第二行\n第三行';
      await adapter.writeText(multiline);

      expect(module.writeText).toHaveBeenCalledWith(multiline);
    });
  });

  describe('simulatePaste', () => {
    it('应将剪贴板内容粘贴到当前活动窗口', async () => {
      await adapter.simulatePaste();

      expect(paste.simulatePaste).toHaveBeenCalledTimes(1);
    });

    it('粘贴操作失败时应向上层传播错误', async () => {
      paste = makePaste({ simulatePaste: vi.fn().mockRejectedValue(new Error('invoke 失败')) });
      adapter = new TauriClipboardAdapter(module, paste);

      await expect(adapter.simulatePaste()).rejects.toThrow('invoke 失败');
    });
  });
});
