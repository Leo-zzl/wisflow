import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudSTTStrategy } from '../CloudSTTStrategy';
import { AudioChunk } from '../../value-objects/AudioChunk';

/**
 * CloudSTTStrategy 单元测试
 *
 * 业务场景：
 * - 使用云端API（OpenAI/Kimi兼容接口）进行语音识别
 * - 支持自定义 endpoint、apiKey、model
 * - 处理网络错误和API错误
 */
describe('CloudSTTStrategy', () => {
  const defaultConfig = {
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    apiKey: 'test-api-key',
    model: 'whisper-1',
  };

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('创建与配置', () => {
    it('应使用提供的配置正确创建', () => {
      const strategy = new CloudSTTStrategy(defaultConfig);

      expect(strategy.strategyType).toBe('cloud');
      expect(strategy.getConfig()).toEqual(defaultConfig);
    });

    it('应支持Kimi API端点', () => {
      const kimiConfig = {
        endpoint: 'https://api.moonshot.cn/v1/audio/transcriptions',
        apiKey: 'kimi-api-key',
        model: 'moonshot-whisper',
      };

      const strategy = new CloudSTTStrategy(kimiConfig);

      expect(strategy.getConfig().endpoint).toBe(kimiConfig.endpoint);
      expect(strategy.getConfig().model).toBe(kimiConfig.model);
    });

    it('应支持自定义OpenAI兼容端点', () => {
      const customConfig = {
        endpoint: 'https://custom-api.example.com/v1/audio/transcriptions',
        apiKey: 'custom-key',
        model: 'custom-model',
      };

      const strategy = new CloudSTTStrategy(customConfig);

      expect(strategy.getConfig().endpoint).toBe(customConfig.endpoint);
    });
  });

  describe('可用性检查', () => {
    it('当配置有效时应返回可用', async () => {
      const strategy = new CloudSTTStrategy(defaultConfig);

      const available = await strategy.isAvailable();

      expect(available).toBe(true);
    });

    it('当apiKey为空时应返回不可用', async () => {
      const strategy = new CloudSTTStrategy({
        ...defaultConfig,
        apiKey: '',
      });

      const available = await strategy.isAvailable();

      expect(available).toBe(false);
    });

    it('当apiKey为undefined时应返回不可用', async () => {
      const strategy = new CloudSTTStrategy({
        ...defaultConfig,
        apiKey: undefined as unknown as string,
      });

      const available = await strategy.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('转写功能', () => {
    it('应正确转写音频并返回文本', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '这是转写结果' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(1000),
        sampleRate: 16000,
      });

      const result = await strategy.transcribe(audioChunk);

      expect(result.text).toBe('这是转写结果');
      expect(result.isEmpty()).toBe(false);
    });

    it('应在请求头中包含正确的Authorization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '测试' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await strategy.transcribe(audioChunk);

      expect(mockFetch).toHaveBeenCalledWith(
        defaultConfig.endpoint,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${defaultConfig.apiKey}`,
          }),
        })
      );
    });

    it('应在formData中包含model参数', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '测试' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await strategy.transcribe(audioChunk);

      const callArgs = mockFetch.mock.calls[0] as [string, { body: FormData }];
      const formData = callArgs[1].body;

      expect(formData.get('model')).toBe(defaultConfig.model);
    });

    it('处理空转写结果时应返回空文本', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      const result = await strategy.transcribe(audioChunk);

      expect(result.text).toBe('');
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('API返回错误时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await expect(strategy.transcribe(audioChunk)).rejects.toThrow('Invalid API key');
    });

    it('网络错误时应抛出异常', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await expect(strategy.transcribe(audioChunk)).rejects.toThrow('网络错误');
    });

    it('应处理API返回的详细错误信息', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Model not found'),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await expect(strategy.transcribe(audioChunk)).rejects.toThrow('Model not found');
    });
  });

  describe('音频格式处理', () => {
    it('应将音频转换为WAV格式上传', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '测试' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await strategy.transcribe(audioChunk);

      const callArgs = mockFetch.mock.calls[0] as [string, { body: FormData }];
      const formData = callArgs[1].body;
      const file = formData.get('file') as File;

      expect(file).toBeDefined();
      expect(file.type).toBe('audio/wav');
    });

    it('文件名应包含时间戳', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '测试' }),
      });

      const strategy = new CloudSTTStrategy(defaultConfig);
      const audioChunk = new AudioChunk({
        data: new Float32Array(100),
        sampleRate: 16000,
      });

      await strategy.transcribe(audioChunk);

      const callArgs = mockFetch.mock.calls[0] as [string, { body: FormData }];
      const formData = callArgs[1].body;
      const file = formData.get('file') as File;

      expect(file.name).toMatch(/audio_\d+\.wav/);
    });
  });
});
