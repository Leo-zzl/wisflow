import type { ClipboardPort } from '../ports/ClipboardPort';

/**
 * PasterService - 增量粘贴服务
 *
 * 负责将语音识别转写的文本粘贴到当前活动窗口。
 * 支持按语义块增量粘贴（流式输出）和一次性粘贴两种模式。
 */
export class PasterService {
  constructor(private readonly clipboard: ClipboardPort) {}

  /**
   * 将文本粘贴到当前活动窗口
   * 先写入剪贴板，再模拟 Ctrl+V
   * 空字符串不触发任何操作
   */
  async paste(text: string): Promise<void> {
    if (text.length === 0) return;
    await this.clipboard.writeText(text);
    await this.clipboard.simulatePaste();
  }

  /**
   * 一次性粘贴完整文本（语音输入结束后调用）
   */
  async pasteAll(text: string): Promise<void> {
    await this.paste(text);
  }
}
