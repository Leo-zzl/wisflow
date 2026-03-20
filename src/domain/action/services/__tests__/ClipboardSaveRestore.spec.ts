import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipboardService } from '../ClipboardService';
import { PasterService } from '../PasterService';
import { ClipboardPort } from '../../ports/ClipboardPort';

/**
 * Task 6.5: 剪贴板临时保存/恢复集成测试
 *
 * 场景：语音输入过程中，PasterService 需要改写剪贴板内容来完成粘贴。
 * ClipboardService 负责在操作前保存用户原始剪贴板，操作后恢复。
 */

function makePort(initialContent = ''): ClipboardPort & { currentContent: string } {
  let currentContent = initialContent;
  const port = {
    get currentContent() {
      return currentContent;
    },
    readText: vi.fn(async () => currentContent),
    writeText: vi.fn(async (text: string) => {
      currentContent = text;
    }),
    simulatePaste: vi.fn().mockResolvedValue(undefined),
  };
  return port;
}

describe('剪贴板临时保存/恢复（Task 6.5）', () => {
  let port: ReturnType<typeof makePort>;
  let clipboardService: ClipboardService;
  let pasterService: PasterService;

  beforeEach(() => {
    port = makePort('用户原始内容');
    clipboardService = new ClipboardService(port);
    pasterService = new PasterService(port);
  });

  describe('语音输入全流程场景', () => {
    it('语音输入完成后应恢复用户原始剪贴板内容', async () => {
      // 语音输入开始前保存剪贴板
      const snapshot = await clipboardService.saveSnapshot();
      expect(snapshot.text).toBe('用户原始内容');

      // 语音识别结果依次粘贴
      await pasterService.paste('今天天气');
      expect(port.currentContent).toBe('今天天气');
      await pasterService.paste('真不错');
      expect(port.currentContent).toBe('真不错');

      // 语音输入结束后恢复剪贴板
      await clipboardService.restoreSnapshot(snapshot);
      expect(port.currentContent).toBe('用户原始内容');
    });

    it('withRestoredClipboard 应在粘贴过程中保持快照，结束后恢复', async () => {
      const pastedTexts: string[] = [];

      await clipboardService.withRestoredClipboard(async () => {
        await pasterService.paste('语音块一');
        pastedTexts.push(port.currentContent);
        await pasterService.paste('语音块二');
        pastedTexts.push(port.currentContent);
      });

      // 粘贴过程中剪贴板内容已被修改
      expect(pastedTexts).toEqual(['语音块一', '语音块二']);
      // 操作结束后恢复原始内容
      expect(port.currentContent).toBe('用户原始内容');
    });

    it('粘贴过程异常时仍应恢复原始剪贴板', async () => {
      const flakyPaster = new PasterService({
        ...port,
        simulatePaste: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('粘贴窗口丢失')),
      });

      await expect(
        clipboardService.withRestoredClipboard(async () => {
          await flakyPaster.paste('第一块正常');
          await flakyPaster.paste('第二块失败');
        })
      ).rejects.toThrow('粘贴窗口丢失');

      expect(port.currentContent).toBe('用户原始内容');
    });
  });

  describe('原始剪贴板为空的场景', () => {
    it('原始剪贴板为空时应能正常保存并恢复空快照', async () => {
      port = makePort('');
      clipboardService = new ClipboardService(port);
      pasterService = new PasterService(port);

      const snapshot = await clipboardService.saveSnapshot();
      expect(snapshot.isEmpty()).toBe(true);

      await pasterService.paste('语音文本');
      await clipboardService.restoreSnapshot(snapshot);

      expect(port.currentContent).toBe('');
    });
  });

  describe('多次连续语音输入', () => {
    it('每次语音输入都应独立保存和恢复剪贴板', async () => {
      // 第一次语音输入
      await clipboardService.withRestoredClipboard(async () => {
        await pasterService.paste('第一次输入');
      });
      expect(port.currentContent).toBe('用户原始内容');

      // 模拟用户复制了新内容
      await port.writeText('用户中途复制的内容');

      // 第二次语音输入
      await clipboardService.withRestoredClipboard(async () => {
        await pasterService.paste('第二次输入');
      });
      // 应恢复第二次的快照，不是第一次的
      expect(port.currentContent).toBe('用户中途复制的内容');
    });
  });
});
