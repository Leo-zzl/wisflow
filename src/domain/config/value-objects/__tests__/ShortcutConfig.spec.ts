import { describe, it, expect } from 'vitest';
import { ShortcutConfig } from '../ShortcutConfig';

describe('ShortcutConfig', () => {
  describe('创建', () => {
    it('应该使用有效参数创建', () => {
      const shortcut = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
        mode: 'hold',
      });

      expect(shortcut.triggerKey).toBe('V');
      expect(shortcut.modifiers).toEqual(['Control', 'Shift']);
      expect(shortcut.mode).toBe('hold');
    });

    it('应该默认使用按住模式', () => {
      const shortcut = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
      });

      expect(shortcut.mode).toBe('hold');
    });

    it('应该拒绝空的触发键', () => {
      expect(() =>
        new ShortcutConfig({
          triggerKey: '',
          modifiers: ['Control'],
        })
      ).toThrow('快捷键不能为空');
    });

    it('应该拒绝无效的修饰键', () => {
      expect(() =>
        new ShortcutConfig({
          triggerKey: 'V',
          modifiers: ['InvalidKey' as never],
        })
      ).toThrow('无效的修饰键');
    });

    it('应该接受切换模式', () => {
      const shortcut = new ShortcutConfig({
        triggerKey: 'Space',
        modifiers: ['Alt'],
        mode: 'toggle',
      });

      expect(shortcut.mode).toBe('toggle');
    });
  });

  describe('相等性比较', () => {
    it('相同配置应该相等', () => {
      const a = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
        mode: 'hold',
      });
      const b = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
        mode: 'hold',
      });

      expect(a.equals(b)).toBe(true);
    });

    it('不同触发键应该不相等', () => {
      const a = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control'],
      });
      const b = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
      });

      expect(a.equals(b)).toBe(false);
    });

    it('不同修饰键应该不相等', () => {
      const a = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control'],
      });
      const b = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
      });

      expect(a.equals(b)).toBe(false);
    });

    it('修饰键顺序不应该影响相等性', () => {
      const a = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
      });
      const b = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Shift', 'Control'],
      });

      expect(a.equals(b)).toBe(true);
    });
  });

  describe('序列化', () => {
    it('应该正确转换为字符串表示', () => {
      const shortcut = new ShortcutConfig({
        triggerKey: 'V',
        modifiers: ['Control', 'Shift'],
        mode: 'hold',
      });

      expect(shortcut.toString()).toBe('Ctrl+Shift+V');
    });

    it('单个修饰键应该正确显示', () => {
      const shortcut = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
      });

      expect(shortcut.toString()).toBe('Ctrl+F9');
    });
  });
});
