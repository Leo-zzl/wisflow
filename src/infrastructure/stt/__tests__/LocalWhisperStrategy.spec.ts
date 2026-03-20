import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalWhisperStrategy } from '../LocalWhisperStrategy';
import { AudioChunk } from '@domain/model/value-objects/AudioChunk';

function makeSamples(count = 16000): Float32Array {
  return new Float32Array(count).fill(0.1);
}

function makeChunk(): AudioChunk {
  return new AudioChunk({ data: makeSamples(), sampleRate: 16000 });
}

describe('LocalWhisperStrategy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('strategyType', () => {
    it("应该是 'local'", () => {
      const strategy = new LocalWhisperStrategy();
      expect(strategy.strategyType).toBe('local');
    });
  });

  describe('transcribe', () => {
    it('应该发送 POST 请求到本地端点', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ text: '你好世界', language: 'zh' }),
        })
      );

      const strategy = new LocalWhisperStrategy();
      await strategy.transcribe(makeChunk());

      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765/v1/audio/transcriptions',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('应该使用自定义 baseUrl', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ text: 'test' }),
        })
      );

      const strategy = new LocalWhisperStrategy({ baseUrl: 'http://localhost:9000' });
      await strategy.transcribe(makeChunk());

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:9000/v1/audio/transcriptions',
        expect.anything()
      );
    });

    it('应该返回转录结果', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ text: '本地转录结果', language: 'zh' }),
        })
      );

      const strategy = new LocalWhisperStrategy();
      const result = await strategy.transcribe(makeChunk());

      expect(result.text).toBe('本地转录结果');
      expect(result.language).toBe('zh');
      expect(result.durationMs).toBe(1000);
    });

    it('请求失败时应抛出错误', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const strategy = new LocalWhisperStrategy();
      await expect(strategy.transcribe(makeChunk())).rejects.toThrow('本地Whisper请求失败: 500');
    });
  });

  describe('isAvailable', () => {
    it('健康检查成功时应返回 true', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      const strategy = new LocalWhisperStrategy();
      expect(await strategy.isAvailable()).toBe(true);

      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('健康检查失败时应返回 false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      const strategy = new LocalWhisperStrategy();
      expect(await strategy.isAvailable()).toBe(false);
    });

    it('网络错误时应返回 false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const strategy = new LocalWhisperStrategy();
      expect(await strategy.isAvailable()).toBe(false);
    });
  });
});
