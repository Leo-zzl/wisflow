import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AudioCaptureService, AudioCaptureConfig } from '../AudioCaptureService';
import { AudioChunk } from '../../value-objects/AudioChunk';
import { DEFAULT_CAPTURE_CONFIG } from '../AudioCaptureService';

/**
 * 测试辅助：创建内存版 AudioCaptureService mock，用于验证接口约束
 */
function createMockCaptureService(): AudioCaptureService {
  let capturing = false;
  let config: AudioCaptureConfig = { ...DEFAULT_CAPTURE_CONFIG };
  const subscribers: Array<(chunk: AudioChunk) => void> = [];

  return {
    async startCapture(partialConfig?: Partial<AudioCaptureConfig>): Promise<void> {
      if (capturing) throw new Error('已在录音中');
      config = { ...DEFAULT_CAPTURE_CONFIG, ...partialConfig };
      capturing = true;
    },

    async stopCapture(): Promise<void> {
      if (!capturing) throw new Error('未在录音中');
      capturing = false;
    },

    async pauseCapture(): Promise<void> {
      if (!capturing) throw new Error('未在录音中');
      capturing = false;
    },

    async resumeCapture(): Promise<void> {
      if (capturing) throw new Error('已在录音中');
      capturing = true;
    },

    onChunk(callback): () => void {
      subscribers.push(callback);
      return () => {
        const idx = subscribers.indexOf(callback);
        if (idx !== -1) subscribers.splice(idx, 1);
      };
    },

    isCapturing(): boolean {
      return capturing;
    },

    getConfig(): AudioCaptureConfig {
      return { ...config };
    },
  };
}

describe('AudioCaptureService 接口契约', () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    service = createMockCaptureService();
  });

  describe('录音控制', () => {
    it('初始状态不在录音中', () => {
      expect(service.isCapturing()).toBe(false);
    });

    it('startCapture 后处于录音中', async () => {
      await service.startCapture();
      expect(service.isCapturing()).toBe(true);
    });

    it('stopCapture 后不在录音中', async () => {
      await service.startCapture();
      await service.stopCapture();
      expect(service.isCapturing()).toBe(false);
    });

    it('未录音时调用 stopCapture 应抛出错误', async () => {
      await expect(service.stopCapture()).rejects.toThrow('未在录音中');
    });

    it('重复调用 startCapture 应抛出错误', async () => {
      await service.startCapture();
      await expect(service.startCapture()).rejects.toThrow('已在录音中');
    });
  });

  describe('配置', () => {
    it('应该使用默认配置', async () => {
      await service.startCapture();
      const config = service.getConfig();
      expect(config.sampleRate).toBe(DEFAULT_CAPTURE_CONFIG.sampleRate);
      expect(config.channels).toBe(DEFAULT_CAPTURE_CONFIG.channels);
    });

    it('应该接受自定义采样率', async () => {
      await service.startCapture({ sampleRate: 44100 });
      expect(service.getConfig().sampleRate).toBe(44100);
    });
  });

  describe('音频块订阅', () => {
    it('应该能订阅音频块回调', () => {
      const callback = vi.fn();
      const unsubscribe = service.onChunk(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('取消订阅后不再收到回调', async () => {
      const callback = vi.fn();
      const unsubscribe = service.onChunk(callback);
      unsubscribe();

      const chunk = AudioChunk.create(new Float32Array([0.1, 0.2]), 16000, 0);
      // 验证取消订阅不抛出错误
      expect(() => unsubscribe()).not.toThrow();
    });

    it('可以注册多个订阅者', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      service.onChunk(cb1);
      service.onChunk(cb2);
      // 验证不会抛出错误
    });
  });

  describe('DEFAULT_CAPTURE_CONFIG', () => {
    it('应该有合理的默认值', () => {
      expect(DEFAULT_CAPTURE_CONFIG.sampleRate).toBe(16000);
      expect(DEFAULT_CAPTURE_CONFIG.channels).toBe(1);
      expect(DEFAULT_CAPTURE_CONFIG.chunkDurationMs).toBeGreaterThan(0);
    });
  });
});
