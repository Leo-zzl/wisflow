import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudSTTStrategy } from '../CloudSTTStrategy';
import { AudioChunk } from '@domain/model/value-objects/AudioChunk';

function makeSamples(count = 16000): Float32Array {
  return new Float32Array(count).fill(0.1);
}

function makeChunk(samples = 16000, sampleRate = 16000): AudioChunk {
  return new AudioChunk({ data: makeSamples(samples), sampleRate });
}

function mockFetchSuccess(text: string, language = 'zh'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text, language, duration: 1.0 }),
    })
  );
}

function mockFetchError(status: number, statusText: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
    })
  );
}

describe('CloudSTTStrategy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('strategyType', () => {
    it("应该是 'cloud'", () => {
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });
      expect(strategy.strategyType).toBe('cloud');
    });
  });

  describe('transcribe', () => {
    it('应该发送 POST 请求到正确端点', async () => {
      mockFetchSuccess('今天天气不错');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });

      await strategy.transcribe(makeChunk());

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('应该在请求头中携带 Authorization', async () => {
      mockFetchSuccess('hello');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-abc' });

      await strategy.transcribe(makeChunk());

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-abc');
    });

    it('应该返回包含文本和语言的转录结果', async () => {
      mockFetchSuccess('今天天气不错', 'zh');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });

      const result = await strategy.transcribe(makeChunk());

      expect(result.text).toBe('今天天气不错');
      expect(result.language).toBe('zh');
    });

    it('应该正确设置 durationMs（来自音频块）', async () => {
      mockFetchSuccess('test');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });
      const chunk = makeChunk(16000, 16000); // 1000ms

      const result = await strategy.transcribe(chunk);

      expect(result.durationMs).toBe(1000);
    });

    it('请求失败时应抛出错误', async () => {
      mockFetchError(401, 'Unauthorized');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'bad-key' });

      await expect(strategy.transcribe(makeChunk())).rejects.toThrow('云端STT请求失败: 401');
    });

    it('应该使用自定义模型名', async () => {
      mockFetchSuccess('test');
      const strategy = new CloudSTTStrategy({
        endpoint: 'https://custom.api',
        apiKey: 'key',
        model: 'whisper-large-v3',
      });

      await strategy.transcribe(makeChunk());

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      const body = init.body as FormData;
      expect(body.get('model')).toBe('whisper-large-v3');
    });

    it('应该使用默认模型 whisper-1', async () => {
      mockFetchSuccess('test');
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });

      await strategy.transcribe(makeChunk());

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      const body = init.body as FormData;
      expect(body.get('model')).toBe('whisper-1');
    });
  });

  describe('isAvailable', () => {
    it('配置了 endpoint 和 apiKey 时应返回 true', async () => {
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: 'sk-test' });
      expect(await strategy.isAvailable()).toBe(true);
    });

    it('缺少 apiKey 时应返回 false', async () => {
      const strategy = new CloudSTTStrategy({ endpoint: 'https://api.openai.com', apiKey: '' });
      expect(await strategy.isAvailable()).toBe(false);
    });

    it('缺少 endpoint 时应返回 false', async () => {
      const strategy = new CloudSTTStrategy({ endpoint: '', apiKey: 'sk-test' });
      expect(await strategy.isAvailable()).toBe(false);
    });
  });
});
