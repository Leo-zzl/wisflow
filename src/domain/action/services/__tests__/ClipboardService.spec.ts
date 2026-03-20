import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipboardService } from '../ClipboardService';
import { ClipboardPort } from '../../ports/ClipboardPort';

function makePort(overrides: Partial<ClipboardPort> = {}): ClipboardPort {
  return {
    readText: vi.fn().mockResolvedValue(''),
    writeText: vi.fn().mockResolvedValue(undefined),
    simulatePaste: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ClipboardService', () => {
  let port: ClipboardPort;
  let service: ClipboardService;

  beforeEach(() => {
    port = makePort();
    service = new ClipboardService(port);
  });

  // ── Task 6.1: 基本接口 ──────────────────────────────────────────────

  describe('readText', () => {
    it('应该通过端口读取剪贴板文本', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('剪贴板内容') });
      service = new ClipboardService(port);

      const text = await service.readText();

      expect(text).toBe('剪贴板内容');
      expect(port.readText).toHaveBeenCalledTimes(1);
    });

    it('剪贴板为空时应返回空字符串', async () => {
      const text = await service.readText();

      expect(text).toBe('');
    });
  });

  describe('writeText', () => {
    it('应该通过端口写入文本到剪贴板', async () => {
      await service.writeText('新内容');

      expect(port.writeText).toHaveBeenCalledWith('新内容');
    });

    it('应该允许写入空字符串', async () => {
      await service.writeText('');

      expect(port.writeText).toHaveBeenCalledWith('');
    });
  });

  // ── Task 6.5: 临时保存/恢复 ──────────────────────────────────────────

  describe('saveSnapshot', () => {
    it('应该保存当前剪贴板内容', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('原始内容') });
      service = new ClipboardService(port);

      const snapshot = await service.saveSnapshot();

      expect(snapshot.text).toBe('原始内容');
    });

    it('应该将快照缓存到服务内部', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('原始内容') });
      service = new ClipboardService(port);

      await service.saveSnapshot();
      const saved = service.getSavedSnapshot();

      expect(saved).not.toBeNull();
      expect(saved!.text).toBe('原始内容');
    });

    it('初始状态没有保存的快照', () => {
      expect(service.getSavedSnapshot()).toBeNull();
    });
  });

  describe('restoreSnapshot', () => {
    it('应该将快照内容恢复到剪贴板', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('原始内容') });
      service = new ClipboardService(port);
      const snapshot = await service.saveSnapshot();

      // 模拟剪贴板被改变
      await port.writeText('临时内容');

      await service.restoreSnapshot(snapshot);

      expect(port.writeText).toHaveBeenLastCalledWith('原始内容');
    });

    it('应该能恢复空快照', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('') });
      service = new ClipboardService(port);
      const snapshot = await service.saveSnapshot();

      await service.restoreSnapshot(snapshot);

      expect(port.writeText).toHaveBeenCalledWith('');
    });
  });

  describe('withRestoredClipboard', () => {
    it('应该在操作完成后恢复剪贴板', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('原始内容') });
      service = new ClipboardService(port);

      const pasted: string[] = [];
      await service.withRestoredClipboard(async () => {
        await port.writeText('临时内容');
        pasted.push('临时内容');
      });

      // 最后一次 writeText 调用应该是恢复原始内容
      const calls = (port.writeText as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.at(-1)![0]).toBe('原始内容');
    });

    it('应该返回回调函数的返回值', async () => {
      const result = await service.withRestoredClipboard(async () => 42);

      expect(result).toBe(42);
    });

    it('回调抛出异常时仍应恢复剪贴板', async () => {
      port = makePort({ readText: vi.fn().mockResolvedValue('原始内容') });
      service = new ClipboardService(port);

      await expect(
        service.withRestoredClipboard(async () => {
          throw new Error('操作失败');
        })
      ).rejects.toThrow('操作失败');

      const calls = (port.writeText as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.at(-1)![0]).toBe('原始内容');
    });

    it('读取失败时应该抛出错误', async () => {
      port = makePort({ readText: vi.fn().mockRejectedValue(new Error('读取失败')) });
      service = new ClipboardService(port);

      await expect(service.withRestoredClipboard(async () => {})).rejects.toThrow('读取失败');
    });
  });
});
