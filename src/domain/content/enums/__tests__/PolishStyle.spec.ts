import { describe, it, expect } from 'vitest';
import {
  POLISH_STYLES,
  POLISH_STYLE_LABELS,
  isValidPolishStyle,
  type PolishStyle,
} from '../PolishStyle';

describe('PolishStyle', () => {
  describe('POLISH_STYLES', () => {
    it('应包含所有预期的润色风格', () => {
      expect(POLISH_STYLES).toContain('colloquial');
      expect(POLISH_STYLES).toContain('light');
      expect(POLISH_STYLES).toContain('deep');
      expect(POLISH_STYLES).toContain('condensed');
      expect(POLISH_STYLES).toContain('formal');
      expect(POLISH_STYLES).toContain('business');
      expect(POLISH_STYLES).toContain('technical');
      expect(POLISH_STYLES).toContain('humorous');
      expect(POLISH_STYLES).toContain('custom');
    });

    it('共有 9 种润色风格', () => {
      expect(POLISH_STYLES).toHaveLength(9);
    });
  });

  describe('POLISH_STYLE_LABELS', () => {
    it('每种风格都应有中文标签', () => {
      for (const style of POLISH_STYLES) {
        expect(POLISH_STYLE_LABELS[style]).toBeTruthy();
      }
    });

    it('标签应为中文字符串', () => {
      expect(POLISH_STYLE_LABELS.colloquial).toBe('口语化');
      expect(POLISH_STYLE_LABELS.light).toBe('轻度润色');
      expect(POLISH_STYLE_LABELS.deep).toBe('深度润色');
      expect(POLISH_STYLE_LABELS.condensed).toBe('精简压缩');
      expect(POLISH_STYLE_LABELS.formal).toBe('正式规范');
      expect(POLISH_STYLE_LABELS.business).toBe('商务专业');
      expect(POLISH_STYLE_LABELS.technical).toBe('技术文档');
      expect(POLISH_STYLE_LABELS.humorous).toBe('轻松幽默');
      expect(POLISH_STYLE_LABELS.custom).toBe('自定义');
    });
  });

  describe('isValidPolishStyle', () => {
    it('有效风格应返回 true', () => {
      const validStyles: PolishStyle[] = [
        'colloquial',
        'light',
        'deep',
        'condensed',
        'formal',
        'business',
        'technical',
        'humorous',
        'custom',
      ];
      for (const style of validStyles) {
        expect(isValidPolishStyle(style)).toBe(true);
      }
    });

    it('无效字符串应返回 false', () => {
      expect(isValidPolishStyle('invalid')).toBe(false);
      expect(isValidPolishStyle('')).toBe(false);
    });

    it('非字符串值应返回 false', () => {
      expect(isValidPolishStyle(null)).toBe(false);
      expect(isValidPolishStyle(undefined)).toBe(false);
      expect(isValidPolishStyle(42)).toBe(false);
    });
  });
});
