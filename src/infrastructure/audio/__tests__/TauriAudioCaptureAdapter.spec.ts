import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TauriAudioCaptureAdapter,
  TauriEventBus,
  TauriAudioInvoker,
} from '../TauriAudioCaptureAdapter';
import type { AudioChunk } from '@domain/voice/value-objects/AudioChunk';

// ─── helpers ─────────────────────────────────────────────────────────────────

type EventHandler<T> = (event: { payload: T }) => void;

/**
 * 可触发事件的 EventBus mock
 * 允许测试手动推送音频块，模拟 Rust 侧的行为
 */
function makeEventBus(): TauriEventBus & {
  triggerAudioChunk: (payload: number[]) => void;
} {
  const handlers: EventHandler<number[]>[] = [];

  const bus: TauriEventBus = {
    listen: vi.fn().mockImplementation(async <T>(_event: string, handler: EventHandler<T>) => {
      handlers.push(handler as unknown as EventHandler<number[]>);
      return () => {
        const idx = handlers.indexOf(handler as unknown as EventHandler<number[]>);
        if (idx !== -1) handlers.splice(idx, 1);
      };
    }),
  };

  return Object.assign(bus, {
    triggerAudioChunk: (payload: number[]) => {
      handlers.forEach(h => h({ payload }));
    },
  });
}

function makeInvoker(): TauriAudioInvoker {
  return {
    startCapture: vi.fn().mockResolvedValue(undefined),
    stopCapture: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('TauriAudioCaptureAdapter', () => {
  let eventBus: ReturnType<typeof makeEventBus>;
  let invoker: TauriAudioInvoker;
  let adapter: TauriAudioCaptureAdapter;

  beforeEach(() => {
    eventBus = makeEventBus();
    invoker = makeInvoker();
    adapter = new TauriAudioCaptureAdapter(eventBus, invoker);
  });

  // ─── startCapture ─────────────────────────────────────────────────────────

  describe('startCapture', () => {
    it('应该调用 invoker.startCapture', async () => {
      await adapter.startCapture();

      expect(invoker.startCapture).toHaveBeenCalledTimes(1);
    });

    it('应该使用默认采样率和声道数调用 invoker', async () => {
      await adapter.startCapture();

      expect(invoker.startCapture).toHaveBeenCalledWith(16000, 1, 100);
    });

    it('应该订阅 audio-chunk 事件', async () => {
      await adapter.startCapture();

      expect(eventBus.listen).toHaveBeenCalledWith('audio-chunk', expect.any(Function));
    });

    it('重复调用时不应再次 invoke', async () => {
      await adapter.startCapture();
      await adapter.startCapture();

      expect(invoker.startCapture).toHaveBeenCalledTimes(1);
    });

    it('开始后 isCapturing 应返回 true', async () => {
      await adapter.startCapture();

      expect(adapter.isCapturing()).toBe(true);
    });
  });

  // ─── stopCapture ──────────────────────────────────────────────────────────

  describe('stopCapture', () => {
    it('应该调用 invoker.stopCapture', async () => {
      await adapter.startCapture();
      await adapter.stopCapture();

      expect(invoker.stopCapture).toHaveBeenCalledTimes(1);
    });

    it('停止后 isCapturing 应返回 false', async () => {
      await adapter.startCapture();
      await adapter.stopCapture();

      expect(adapter.isCapturing()).toBe(false);
    });

    it('未开始时调用 stopCapture 不应 invoke', async () => {
      await adapter.stopCapture();

      expect(invoker.stopCapture).not.toHaveBeenCalled();
    });
  });

  // ─── onChunk / 音频块分发 ─────────────────────────────────────────────────

  describe('onChunk 回调', () => {
    it('应该将 audio-chunk 事件转发给注册的回调', async () => {
      const callback = vi.fn();
      adapter.onChunk(callback);
      await adapter.startCapture();

      eventBus.triggerAudioChunk([0.1, 0.2, 0.3]);

      expect(callback).toHaveBeenCalledTimes(1);
      const chunk = callback.mock.calls[0][0] as AudioChunk;
      expect(chunk.sampleCount).toBe(3);
    });

    it('暂停时不应触发回调', async () => {
      const callback = vi.fn();
      adapter.onChunk(callback);
      await adapter.startCapture();
      await adapter.pauseCapture();

      eventBus.triggerAudioChunk([0.1, 0.2]);

      expect(callback).not.toHaveBeenCalled();
    });

    it('恢复后应再次触发回调', async () => {
      const callback = vi.fn();
      adapter.onChunk(callback);
      await adapter.startCapture();
      await adapter.pauseCapture();
      await adapter.resumeCapture();

      eventBus.triggerAudioChunk([0.1, 0.2]);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('取消订阅后不应再触发回调', async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.onChunk(callback);
      await adapter.startCapture();

      unsubscribe();
      eventBus.triggerAudioChunk([0.1, 0.2]);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ─── pauseCapture / resumeCapture ─────────────────────────────────────────

  describe('pauseCapture / resumeCapture', () => {
    it('暂停后 isCapturing 应返回 false', async () => {
      await adapter.startCapture();
      await adapter.pauseCapture();

      expect(adapter.isCapturing()).toBe(false);
    });

    it('恢复后 isCapturing 应返回 true', async () => {
      await adapter.startCapture();
      await adapter.pauseCapture();
      await adapter.resumeCapture();

      expect(adapter.isCapturing()).toBe(true);
    });
  });

  // ─── getConfig ────────────────────────────────────────────────────────────

  describe('getConfig', () => {
    it('应该返回当前配置（默认值）', async () => {
      await adapter.startCapture();

      const config = adapter.getConfig();

      expect(config.sampleRate).toBe(16000);
      expect(config.channels).toBe(1);
    });

    it('应该返回自定义配置', async () => {
      await adapter.startCapture({ sampleRate: 44100, channels: 2 });

      const config = adapter.getConfig();

      expect(config.sampleRate).toBe(44100);
      expect(config.channels).toBe(2);
    });
  });
});
