import { describe, it, expect } from 'vitest';
import { UserConfig } from '../UserConfig';
import { ShortcutConfig } from '../../value-objects/ShortcutConfig';

describe('UserConfig', () => {
  describe('创建配置', () => {
    it('应该使用默认值创建配置', () => {
      const config = UserConfig.createDefault();

      expect(config.shortcut.triggerKey).toBe('V');
      expect(config.shortcut.modifiers).toContain('Control');
      expect(config.shortcut.modifiers).toContain('Shift');
    });

    it('应该允许自定义快捷键', () => {
      const customShortcut = new ShortcutConfig({
        triggerKey: 'Space',
        modifiers: ['Control', 'Alt'],
        mode: 'hold',
      });

      const config = UserConfig.create({
        shortcut: customShortcut,
      });

      expect(config.shortcut.triggerKey).toBe('Space');
      expect(config.shortcut.modifiers).toEqual(['Alt', 'Control']); // 排序后的顺序
    });

    it('应该验证快捷键不能为空', () => {
      expect(() =>
        UserConfig.create({
          shortcut: new ShortcutConfig({
            triggerKey: '',
            modifiers: ['Control'],
            mode: 'hold',
          }),
        })
      ).toThrow('快捷键不能为空');
    });
  });

  describe('更新配置', () => {
    it('应该更新润色风格', () => {
      const config = UserConfig.createDefault();
      const updated = config.updatePolishStyle('deep');

      expect(updated.polish.style).toBe('deep');
      expect(config.polish.style).toBe('light'); // 原对象不变
    });

    it('应该更新快捷键配置', () => {
      const config = UserConfig.createDefault();
      const newShortcut = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
        mode: 'toggle',
      });

      const updated = config.updateShortcut(newShortcut);

      expect(updated.shortcut.triggerKey).toBe('F9');
      expect(updated.shortcut.mode).toBe('toggle');
      expect(config.shortcut.triggerKey).toBe('V'); // 原对象不变
    });

    it('应该更新模型选择策略', () => {
      const config = UserConfig.createDefault();
      const updated = config.updateModelPolicy({
        stt: 'cloud',
        llm: 'local',
        fallback: true,
      });

      expect(updated.modelPolicy.stt).toBe('cloud');
      expect(updated.modelPolicy.llm).toBe('local');
    });
  });

  describe('验证配置', () => {
    it('应该验证快捷键不冲突', () => {
      const config = UserConfig.createDefault();
      const otherConfig = UserConfig.create({
        shortcut: new ShortcutConfig({
          triggerKey: 'V',
          modifiers: ['Control', 'Shift'],
          mode: 'hold',
        }),
      });

      expect(() => config.validateNoConflict(otherConfig)).toThrow('快捷键冲突');
    });

    it('不冲突的快捷键应该通过验证', () => {
      const config = UserConfig.createDefault();
      const otherConfig = UserConfig.create({
        shortcut: new ShortcutConfig({
          triggerKey: 'F9',
          modifiers: ['Control'],
          mode: 'hold',
        }),
      });

      expect(() => config.validateNoConflict(otherConfig)).not.toThrow();
    });
  });

  describe('序列化与反序列化', () => {
    it('应该正确序列化为 JSON', () => {
      const config = UserConfig.createDefault();
      const json = config.toJSON();

      expect(json).toHaveProperty('shortcut');
      expect(json).toHaveProperty('modelPolicy');
      expect(json).toHaveProperty('polish');
    });

    it('应该正确从 JSON 反序列化', () => {
      const original = UserConfig.createDefault();
      const json = original.toJSON();
      const restored = UserConfig.fromJSON(json);

      expect(restored.shortcut.triggerKey).toBe(original.shortcut.triggerKey);
      expect(restored.modelPolicy.stt).toBe(original.modelPolicy.stt);
    });
  });
});
