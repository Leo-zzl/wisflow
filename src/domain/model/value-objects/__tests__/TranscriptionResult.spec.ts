import { describe, it, expect } from 'vitest';
import { TranscriptionResult } from '../TranscriptionResult';

describe('TranscriptionResult', () => {
  describe('创建', () => {
    it('应该创建有效转录结果', () => {
      const result = new TranscriptionResult({ text: '今天天气不错', durationMs: 1000 });
      expect(result.text).toBe('今天天气不错');
      expect(result.durationMs).toBe(1000);
      expect(result.language).toBeNull();
      expect(result.confidence).toBeNull();
    });

    it('应该支持可选字段', () => {
      const result = new TranscriptionResult({
        text: 'hello',
        language: 'en',
        confidence: 0.95,
        durationMs: 500,
      });
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.95);
    });

    it('应该拒绝负时长', () => {
      expect(() => new TranscriptionResult({ text: '', durationMs: -1 })).toThrow(
        '时长不能为负数'
      );
    });
  });

  describe('isEmpty', () => {
    it('空文本应返回 true', () => {
      expect(new TranscriptionResult({ text: '', durationMs: 0 }).isEmpty()).toBe(true);
    });

    it('纯空格文本应返回 true', () => {
      expect(new TranscriptionResult({ text: '   ', durationMs: 0 }).isEmpty()).toBe(true);
    });

    it('有内容文本应返回 false', () => {
      expect(new TranscriptionResult({ text: '你好', durationMs: 100 }).isEmpty()).toBe(false);
    });
  });

  describe('append', () => {
    it('应该拼接两个结果的文本', () => {
      const a = new TranscriptionResult({ text: '今天天气', durationMs: 500 });
      const b = new TranscriptionResult({ text: '真不错', durationMs: 400 });
      const merged = a.append(b);
      expect(merged.text).toBe('今天天气真不错');
      expect(merged.durationMs).toBe(900);
    });

    it('空结果 append 时应使用另一方文本', () => {
      const empty = TranscriptionResult.empty();
      const b = new TranscriptionResult({ text: '你好', durationMs: 200 });
      expect(empty.append(b).text).toBe('你好');
    });

    it('应该平均计算 confidence', () => {
      const a = new TranscriptionResult({ text: 'a', confidence: 0.8, durationMs: 100 });
      const b = new TranscriptionResult({ text: 'b', confidence: 0.6, durationMs: 100 });
      expect(a.append(b).confidence).toBe(0.7);
    });
  });

  describe('empty', () => {
    it('应该创建空结果', () => {
      const e = TranscriptionResult.empty();
      expect(e.isEmpty()).toBe(true);
      expect(e.durationMs).toBe(0);
    });
  });
});
