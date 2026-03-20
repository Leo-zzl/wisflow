import { describe, it, expect } from 'vitest';
import { ContentSession } from '../ContentSession';
import type { PolishStyle } from '../../enums/PolishStyle';

describe('ContentSession', () => {
  describe('create', () => {
    it('应该用原始文本和润色风格创建会话', () => {
      const session = ContentSession.create('今天天气真不错', 'light');

      expect(session.rawText).toBe('今天天气真不错');
      expect(session.polishStyle).toBe('light');
      expect(session.polishedText).toBeNull();
    });

    it('应该自动生成唯一 ID', () => {
      const s1 = ContentSession.create('文本一', 'light');
      const s2 = ContentSession.create('文本二', 'light');

      expect(s1.id).toBeTruthy();
      expect(s2.id).toBeTruthy();
      expect(s1.id).not.toBe(s2.id);
    });

    it('应该记录创建时间', () => {
      const before = Date.now();
      const session = ContentSession.create('测试文本', 'deep');
      const after = Date.now();

      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('应该支持所有润色风格', () => {
      const styles: PolishStyle[] = ['colloquial', 'light', 'deep', 'condensed', 'custom'];

      for (const style of styles) {
        const session = ContentSession.create('文本', style);
        expect(session.polishStyle).toBe(style);
      }
    });

    it('原始文本为空时应抛出错误', () => {
      expect(() => ContentSession.create('', 'light')).toThrow('原始文本不能为空');
    });
  });

  describe('setPolishedText', () => {
    it('应该返回带有润色文本的新会话（不可变）', () => {
      const original = ContentSession.create('今天天气真不错', 'light');
      const polished = original.setPolishedText('今天的天气非常好');

      expect(polished.polishedText).toBe('今天的天气非常好');
      expect(original.polishedText).toBeNull(); // 原对象不变
    });

    it('应该保留原始文本和风格', () => {
      const session = ContentSession.create('原始文本', 'deep');
      const polished = session.setPolishedText('润色后文本');

      expect(polished.rawText).toBe('原始文本');
      expect(polished.polishStyle).toBe('deep');
      expect(polished.id).toBe(session.id);
    });

    it('润色文本为空时应抛出错误', () => {
      const session = ContentSession.create('原始文本', 'light');
      expect(() => session.setPolishedText('')).toThrow('润色文本不能为空');
    });
  });

  describe('hasBeenPolished', () => {
    it('未润色时应返回 false', () => {
      const session = ContentSession.create('文本', 'light');
      expect(session.hasBeenPolished()).toBe(false);
    });

    it('润色后应返回 true', () => {
      const session = ContentSession.create('文本', 'light').setPolishedText('润色文本');
      expect(session.hasBeenPolished()).toBe(true);
    });
  });

  describe('getDisplayText', () => {
    it('未润色时应返回原始文本', () => {
      const session = ContentSession.create('原始文本', 'light');
      expect(session.getDisplayText()).toBe('原始文本');
    });

    it('润色后应返回润色文本', () => {
      const session = ContentSession.create('原始文本', 'light').setPolishedText('润色文本');
      expect(session.getDisplayText()).toBe('润色文本');
    });
  });

  describe('updateRawText', () => {
    it('应该返回带有新原始文本的会话（累积追加语义块）', () => {
      const session = ContentSession.create('今天天气', 'light');
      const updated = session.appendRawText('真不错');

      expect(updated.rawText).toBe('今天天气真不错');
      expect(updated.polishedText).toBeNull(); // 追加文本后润色结果重置
    });

    it('追加文本后 id 保持不变', () => {
      const session = ContentSession.create('开始', 'light');
      const updated = session.appendRawText('继续');
      expect(updated.id).toBe(session.id);
    });
  });
});
