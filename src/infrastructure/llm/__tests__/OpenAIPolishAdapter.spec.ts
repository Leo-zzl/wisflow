import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIPolishAdapter, type OpenAIPolishConfig } from '../OpenAIPolishAdapter';

const BASE_CONFIG: OpenAIPolishConfig = {
  endpoint: 'https://api.openai.com',
  apiKey: 'test-key',
  model: 'gpt-4o-mini',
};

function makeSuccessResponse(content: string): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
  } as unknown as Response;
}

function makeErrorResponse(status: number): Response {
  return { ok: false, status, statusText: 'Error' } as unknown as Response;
}

describe('OpenAIPolishAdapter', () => {
  let adapter: OpenAIPolishAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse('润色后文本'));
    vi.stubGlobal('fetch', fetchMock);
    adapter = new OpenAIPolishAdapter(BASE_CONFIG);
  });

  describe('polish', () => {
    it('应该调用 OpenAI 兼容的 chat completions 接口', async () => {
      await adapter.polish('原始文本', 'light');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('应该返回 LLM 的响应文本', async () => {
      fetchMock.mockResolvedValue(makeSuccessResponse('今天天气非常好'));

      const result = await adapter.polish('今天天气不错', 'light');

      expect(result).toBe('今天天气非常好');
    });

    it('请求体应包含原始文本', async () => {
      await adapter.polish('需要润色的文本', 'light');

      const body = JSON.parse(
        (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string
      ) as {
        messages: Array<{ role: string; content: string }>;
      };
      const userMessage = body.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('需要润色的文本');
    });

    it('不同风格应使用不同的系统提示词', async () => {
      const styles = ['light', 'deep', 'condensed', 'colloquial'] as const;
      const systemPrompts: string[] = [];

      for (const style of styles) {
        await adapter.polish('文本', style);
        const body = JSON.parse(
          (fetchMock.mock.calls[systemPrompts.length] as [string, RequestInit])[1].body as string
        ) as { messages: Array<{ role: string; content: string }> };
        const sys = body.messages.find(m => m.role === 'system');
        systemPrompts.push(sys?.content ?? '');
      }

      // 不同风格的 system prompt 应该不同
      const unique = new Set(systemPrompts);
      expect(unique.size).toBe(styles.length);
    });

    it('HTTP 错误时应抛出包含状态码的错误', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(429));

      await expect(adapter.polish('文本', 'light')).rejects.toThrow('429');
    });

    it('应该使用配置指定的模型', async () => {
      adapter = new OpenAIPolishAdapter({ ...BASE_CONFIG, model: 'gpt-4o' });
      await adapter.polish('文本', 'light');

      const body = JSON.parse(
        (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string
      ) as { model: string };
      expect(body.model).toBe('gpt-4o');
    });
  });

  describe('isAvailable', () => {
    it('endpoint 和 apiKey 都存在时应返回 true', async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });

    it('缺少 endpoint 时应返回 false', async () => {
      adapter = new OpenAIPolishAdapter({ ...BASE_CONFIG, endpoint: '' });
      expect(await adapter.isAvailable()).toBe(false);
    });

    it('缺少 apiKey 时应返回 false', async () => {
      adapter = new OpenAIPolishAdapter({ ...BASE_CONFIG, apiKey: '' });
      expect(await adapter.isAvailable()).toBe(false);
    });
  });
});
