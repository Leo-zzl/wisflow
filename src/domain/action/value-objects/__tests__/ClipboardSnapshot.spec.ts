import { describe, it, expect, vi } from 'vitest';
import { ClipboardSnapshot } from '../ClipboardSnapshot';

describe('ClipboardSnapshot', () => {
  describe('create', () => {
    it('应该创建包含文本的快照', () => {
      const snapshot = ClipboardSnapshot.create('hello world');

      expect(snapshot.text).toBe('hello world');
    });

    it('应该记录创建时间', () => {
      const before = new Date();
      const snapshot = ClipboardSnapshot.create('test');
      const after = new Date();

      expect(snapshot.capturedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(snapshot.capturedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('应该支持空字符串快照', () => {
      const snapshot = ClipboardSnapshot.create('');

      expect(snapshot.text).toBe('');
      expect(snapshot.isEmpty()).toBe(true);
    });

    it('非空文本的快照 isEmpty 应返回 false', () => {
      const snapshot = ClipboardSnapshot.create('有内容');

      expect(snapshot.isEmpty()).toBe(false);
    });

    it('capturedAt 应不可变', () => {
      const snapshot = ClipboardSnapshot.create('test');
      const originalTime = snapshot.capturedAt.getTime();

      // 尝试修改 capturedAt 不影响快照内部状态
      snapshot.capturedAt.setFullYear(2000);

      expect(snapshot.capturedAt.getTime()).toBe(originalTime);
    });

    it('两次创建应产生不同快照', () => {
      vi.useFakeTimers();
      const snapshot1 = ClipboardSnapshot.create('text');
      vi.advanceTimersByTime(10);
      const snapshot2 = ClipboardSnapshot.create('text');

      expect(snapshot2.capturedAt.getTime()).toBeGreaterThan(snapshot1.capturedAt.getTime());
      vi.useRealTimers();
    });
  });
});
