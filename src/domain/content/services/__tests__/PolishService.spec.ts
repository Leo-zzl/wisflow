import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolishService } from '../PolishService';
import { ContentSession } from '../../entities/ContentSession';
import type { PolishPort } from '../../ports/PolishPort';

function makePort(overrides: Partial<PolishPort> = {}): PolishPort {
  return {
    polish: vi.fn().mockResolvedValue('润色后的文本'),
    isAvailable: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('PolishService', () => {
  let port: PolishPort;
  let service: PolishService;

  beforeEach(() => {
    port = makePort();
    service = new PolishService(port);
  });

  describe('polish', () => {
    it('应该调用端口并返回带润色结果的新会话', async () => {
      const session = ContentSession.create('今天天气不错', 'light');
      port = makePort({ polish: vi.fn().mockResolvedValue('今天天气非常好') });
      service = new PolishService(port);

      const result = await service.polish(session);

      expect(result.polishedText).toBe('今天天气非常好');
      expect(result.rawText).toBe('今天天气不错');
      expect(result.id).toBe(session.id);
    });

    it('应该将会话的 polishStyle 传给端口', async () => {
      const session = ContentSession.create('文本', 'deep');

      await service.polish(session);

      expect(port.polish).toHaveBeenCalledWith('文本', 'deep', undefined);
    });

    it('应该支持传入额外配置', async () => {
      const session = ContentSession.create('文本', 'light');
      const config = { intensity: 5 as const };

      await service.polish(session, config);

      expect(port.polish).toHaveBeenCalledWith('文本', 'light', config);
    });

    it('端口不可用时应该抛出错误', async () => {
      port = makePort({ isAvailable: vi.fn().mockResolvedValue(false) });
      service = new PolishService(port);
      const session = ContentSession.create('文本', 'light');

      await expect(service.polish(session)).rejects.toThrow('润色服务不可用');
    });

    it('端口调用失败时应该传播错误', async () => {
      port = makePort({ polish: vi.fn().mockRejectedValue(new Error('网络错误')) });
      service = new PolishService(port);
      const session = ContentSession.create('文本', 'light');

      await expect(service.polish(session)).rejects.toThrow('网络错误');
    });
  });

  describe('多风格润色', () => {
    it('不同风格应各自调用端口', async () => {
      const styles = ['colloquial', 'light', 'deep', 'condensed'] as const;

      for (const style of styles) {
        const session = ContentSession.create('文本内容', style);
        await service.polish(session);
        expect(port.polish).toHaveBeenCalledWith('文本内容', style, undefined);
      }

      expect(port.polish).toHaveBeenCalledTimes(styles.length);
    });
  });

  describe('isAvailable', () => {
    it('端口可用时应返回 true', async () => {
      expect(await service.isAvailable()).toBe(true);
    });

    it('端口不可用时应返回 false', async () => {
      port = makePort({ isAvailable: vi.fn().mockResolvedValue(false) });
      service = new PolishService(port);
      expect(await service.isAvailable()).toBe(false);
    });
  });
});
