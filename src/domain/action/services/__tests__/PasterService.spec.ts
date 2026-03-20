import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasterService } from '../PasterService';
import { ClipboardPort } from '../../ports/ClipboardPort';

function makePort(overrides: Partial<ClipboardPort> = {}): ClipboardPort {
  return {
    readText: vi.fn().mockResolvedValue(''),
    writeText: vi.fn().mockResolvedValue(undefined),
    simulatePaste: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('PasterService', () => {
  let port: ClipboardPort;
  let service: PasterService;

  beforeEach(() => {
    port = makePort();
    service = new PasterService(port);
  });

  describe('paste', () => {
    it('应该将文本写入剪贴板并模拟粘贴', async () => {
      await service.paste('今天天气真不错');

      expect(port.writeText).toHaveBeenCalledWith('今天天气真不错');
      expect(port.simulatePaste).toHaveBeenCalledTimes(1);
    });

    it('应该保证先写入后粘贴的顺序', async () => {
      const callOrder: string[] = [];
      port = makePort({
        writeText: vi.fn().mockImplementation(async () => {
          callOrder.push('write');
        }),
        simulatePaste: vi.fn().mockImplementation(async () => {
          callOrder.push('paste');
        }),
      });
      service = new PasterService(port);

      await service.paste('文本');

      expect(callOrder).toEqual(['write', 'paste']);
    });

    it('空字符串不应触发任何操作', async () => {
      await service.paste('');

      expect(port.writeText).not.toHaveBeenCalled();
      expect(port.simulatePaste).not.toHaveBeenCalled();
    });

    it('写入失败时应该传播错误', async () => {
      port = makePort({ writeText: vi.fn().mockRejectedValue(new Error('写入失败')) });
      service = new PasterService(port);

      await expect(service.paste('文本')).rejects.toThrow('写入失败');
      expect(port.simulatePaste).not.toHaveBeenCalled();
    });

    it('模拟粘贴失败时应该传播错误', async () => {
      port = makePort({ simulatePaste: vi.fn().mockRejectedValue(new Error('粘贴失败')) });
      service = new PasterService(port);

      await expect(service.paste('文本')).rejects.toThrow('粘贴失败');
    });
  });

  describe('pasteChunks (增量粘贴)', () => {
    it('应该按顺序粘贴多个语义块', async () => {
      const chunks = ['今天天气', '真不错', '明天也要继续加油'];

      for (const chunk of chunks) {
        await service.paste(chunk);
      }

      expect(port.writeText).toHaveBeenCalledTimes(3);
      expect(port.simulatePaste).toHaveBeenCalledTimes(3);

      const writeCalls = (port.writeText as ReturnType<typeof vi.fn>).mock.calls as [string][];
      expect(writeCalls[0][0]).toBe('今天天气');
      expect(writeCalls[1][0]).toBe('真不错');
      expect(writeCalls[2][0]).toBe('明天也要继续加油');
    });

    it('应该跳过空块', async () => {
      await service.paste('第一块');
      await service.paste('');
      await service.paste('第三块');

      expect(port.writeText).toHaveBeenCalledTimes(2);
      expect(port.simulatePaste).toHaveBeenCalledTimes(2);
    });
  });

  describe('pasteAll', () => {
    it('应该将完整文本一次性粘贴', async () => {
      await service.pasteAll('今天天气真不错');

      expect(port.writeText).toHaveBeenCalledWith('今天天气真不错');
      expect(port.simulatePaste).toHaveBeenCalledTimes(1);
    });

    it('完整文本为空时不应触发操作', async () => {
      await service.pasteAll('');

      expect(port.writeText).not.toHaveBeenCalled();
    });
  });
});
