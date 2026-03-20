import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '../ConfigService';
import { ConfigRepository } from '../../repositories/ConfigRepository';
import { UserConfig } from '../../entities/UserConfig';
import { ShortcutConfig } from '../../value-objects/ShortcutConfig';

function makeRepository(overrides: Partial<ConfigRepository> = {}): ConfigRepository {
  return {
    load: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ConfigService', () => {
  let service: ConfigService;
  let repository: ConfigRepository;

  beforeEach(() => {
    repository = makeRepository();
    service = new ConfigService(repository);
  });

  describe('getConfig', () => {
    it('应该在没有持久化数据时返回默认配置', async () => {
      const config = await service.getConfig();

      expect(config.shortcut.triggerKey).toBe('V');
      expect(config.polish.style).toBe('light');
    });

    it('应该加载持久化的配置', async () => {
      const saved = UserConfig.createDefault().updatePolishStyle('deep');
      repository = makeRepository({ load: vi.fn().mockResolvedValue(saved) });
      service = new ConfigService(repository);

      const config = await service.getConfig();

      expect(config.polish.style).toBe('deep');
    });

    it('应该缓存已加载的配置，避免重复读取', async () => {
      await service.getConfig();
      await service.getConfig();

      expect(repository.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveConfig', () => {
    it('应该持久化配置', async () => {
      const config = UserConfig.createDefault();
      await service.saveConfig(config);

      expect(repository.save).toHaveBeenCalledWith(config);
    });

    it('应该更新内存缓存', async () => {
      const config = UserConfig.createDefault().updatePolishStyle('deep');
      await service.saveConfig(config);

      // 缓存命中，不再调用 repository.load
      const loaded = await service.getConfig();
      expect(loaded.polish.style).toBe('deep');
      expect(repository.load).not.toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('应该应用更新函数并持久化', async () => {
      await service.updateConfig((c) => c.updatePolishStyle('condensed'));

      const config = await service.getConfig();
      expect(config.polish.style).toBe('condensed');
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('应该更新快捷键配置并持久化', async () => {
      const newShortcut = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
        mode: 'toggle',
      });

      await service.updateConfig((c) => c.updateShortcut(newShortcut));

      const config = await service.getConfig();
      expect(config.shortcut.triggerKey).toBe('F9');
      expect(config.shortcut.mode).toBe('toggle');
    });

    it('应该返回更新后的配置', async () => {
      const updated = await service.updateConfig((c) => c.updatePolishStyle('colloquial'));

      expect(updated.polish.style).toBe('colloquial');
    });
  });

  describe('resetToDefault', () => {
    it('应该重置为默认配置并持久化', async () => {
      await service.updateConfig((c) => c.updatePolishStyle('deep'));

      await service.resetToDefault();

      const config = await service.getConfig();
      expect(config.polish.style).toBe('light');
      expect(repository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('持久化错误处理', () => {
    it('加载失败时应该返回默认配置', async () => {
      repository = makeRepository({
        load: vi.fn().mockRejectedValue(new Error('读取失败')),
      });
      service = new ConfigService(repository);

      const config = await service.getConfig();

      expect(config.shortcut.triggerKey).toBe('V');
    });

    it('保存失败时应该抛出错误', async () => {
      repository = makeRepository({
        save: vi.fn().mockRejectedValue(new Error('写入失败')),
      });
      service = new ConfigService(repository);

      await expect(service.saveConfig(UserConfig.createDefault())).rejects.toThrow('写入失败');
    });
  });
});
