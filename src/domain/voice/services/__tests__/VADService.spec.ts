import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VADService } from '../VADService';
import { VADFrame } from '../../value-objects/VADFrame';
import { createMockAudio } from '../../__tests__/audioTestUtils';

/**
 * 测试辅助：创建满足 VADService 接口的 mock 实现
 */
function createMockVADService(speechProbability = 0.9): VADService {
  let ready = false;

  return {
    async initialize(): Promise<void> {
      ready = true;
    },

    async analyze(chunk) {
      if (!ready) throw new Error('VAD 服务未初始化');
      return new VADFrame({
        speechProbability,
        timestamp: chunk.timestamp,
        durationMs: chunk.durationMs,
      });
    },

    isReady(): boolean {
      return ready;
    },

    destroy(): void {
      ready = false;
    },
  };
}

describe('VADService 接口契约', () => {
  let service: VADService;

  beforeEach(() => {
    service = createMockVADService();
  });

  describe('初始化', () => {
    it('初始状态未就绪', () => {
      expect(service.isReady()).toBe(false);
    });

    it('initialize 后处于就绪状态', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('destroy 后退出就绪状态', async () => {
      await service.initialize();
      service.destroy();
      expect(service.isReady()).toBe(false);
    });
  });

  describe('音频分析', () => {
    it('未初始化时调用 analyze 应抛出错误', async () => {
      const chunk = createMockAudio(100);
      await expect(service.analyze(chunk)).rejects.toThrow('VAD 服务未初始化');
    });

    it('初始化后应返回 VADFrame', async () => {
      await service.initialize();
      const chunk = createMockAudio(100);
      const frame = await service.analyze(chunk);

      expect(frame).toBeInstanceOf(VADFrame);
      expect(typeof frame.isSpeech).toBe('boolean');
      expect(frame.durationMs).toBeGreaterThan(0);
    });

    it('语音概率高时应检测到语音', async () => {
      service = createMockVADService(0.95);
      await service.initialize();
      const chunk = createMockAudio(100);
      const frame = await service.analyze(chunk);
      expect(frame.isSpeech).toBe(true);
    });

    it('语音概率低时应检测到静音', async () => {
      service = createMockVADService(0.1);
      await service.initialize();
      const chunk = createMockAudio(100);
      const frame = await service.analyze(chunk);
      expect(frame.isSpeech).toBe(false);
    });
  });

  describe('多次分析', () => {
    it('可以连续分析多个音频块', async () => {
      await service.initialize();
      const analyzeFn = vi.fn().mockImplementation(service.analyze.bind(service));
      service.analyze = analyzeFn;

      await service.analyze(createMockAudio(100));
      await service.analyze(createMockAudio(200));
      await service.analyze(createMockAudio(100));

      expect(analyzeFn).toHaveBeenCalledTimes(3);
    });
  });
});
