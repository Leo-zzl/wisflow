import type { PolishPort, PolishConfig } from '@domain/content/ports/PolishPort';
import type { PolishStyle } from '@domain/content/enums/PolishStyle';

export interface OpenAIPolishConfig {
  endpoint: string;
  apiKey: string;
  model?: string;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

const SYSTEM_PROMPTS: Record<PolishStyle, string> = {
  colloquial:
    '你是一个文字润色助手。请将用户输入的文字改写为更加口语化、自然流畅的表达，保持原意不变，语气轻松亲切。只返回润色后的文字，不要添加解释。',
  light:
    '你是一个文字润色助手。请对用户输入的文字进行轻度润色，修正语病、改善措辞，使其更加通顺自然，保持原有风格和意思。只返回润色后的文字，不要添加解释。',
  deep: '你是一个文字润色助手。请对用户输入的文字进行深度润色，大幅提升表达质量，使其更加专业、流畅、逻辑清晰，同时保留核心意思。只返回润色后的文字，不要添加解释。',
  condensed:
    '你是一个文字润色助手。请将用户输入的文字精简压缩，去除冗余表达，保留核心信息，使其更加简洁有力。只返回精简后的文字，不要添加解释。',
  custom:
    '你是一个文字润色助手。请根据用户的需求对文字进行润色改写，保持原意。只返回润色后的文字，不要添加解释。',
};

export class OpenAIPolishAdapter implements PolishPort {
  private readonly model: string;

  constructor(private readonly config: OpenAIPolishConfig) {
    this.model = config.model ?? 'gpt-4o-mini';
  }

  async polish(text: string, style: PolishStyle, _config?: PolishConfig): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[style] },
          { role: 'user', content: text },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM润色请求失败: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = json.choices[0]?.message.content;
    if (!content) throw new Error('LLM返回内容为空');
    return content.trim();
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(!!(this.config.endpoint && this.config.apiKey));
  }
}
