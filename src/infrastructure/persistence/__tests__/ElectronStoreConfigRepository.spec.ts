import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserConfig } from '@domain/config/entities/UserConfig';
import { ShortcutConfig } from '@domain/config/value-objects/ShortcutConfig';
import {
  ElectronStoreConfigRepository,
  ConfigStore,
  PersistedConfig,
} from '../ElectronStoreConfigRepository';

function makeStore(initial?: PersistedConfig): ConfigStore {
  let data: PersistedConfig | undefined = initial;
  return {
    get: vi.fn(() => data),
    set: vi.fn((_key: 'userConfig', value: PersistedConfig) => {
      data = value;
    }),
  };
}

describe('ElectronStoreConfigRepository', () => {
  let store: ConfigStore;
  let repository: ElectronStoreConfigRepository;

  beforeEach(() => {
    store = makeStore();
    repository = new ElectronStoreConfigRepository(store);
  });

  describe('load', () => {
    it('应该在没有存储数据时返回 null', async () => {
      const result = await repository.load();

      expect(result).toBeNull();
    });

    it('应该从 store 中恢复默认配置', async () => {
      const defaultConfig = UserConfig.createDefault();
      const json = defaultConfig.toJSON();
      store = makeStore({
        shortcut: json.shortcut.toJSON(),
        modelPolicy: json.modelPolicy,
        polish: json.polish,
        ui: json.ui,
      });
      repository = new ElectronStoreConfigRepository(store);

      const result = await repository.load();

      expect(result).not.toBeNull();
      expect(result!.shortcut.triggerKey).toBe('V');
      expect(result!.polish.style).toBe('light');
    });

    it('应该正确恢复自定义配置', async () => {
      const customShortcut = new ShortcutConfig({
        triggerKey: 'F9',
        modifiers: ['Control'],
        mode: 'toggle',
      });
      const config = UserConfig.createDefault()
        .updateShortcut(customShortcut)
        .updatePolishStyle('deep');
      const json = config.toJSON();
      store = makeStore({
        shortcut: json.shortcut.toJSON(),
        modelPolicy: json.modelPolicy,
        polish: json.polish,
        ui: json.ui,
      });
      repository = new ElectronStoreConfigRepository(store);

      const result = await repository.load();

      expect(result!.shortcut.triggerKey).toBe('F9');
      expect(result!.shortcut.mode).toBe('toggle');
      expect(result!.polish.style).toBe('deep');
    });
  });

  describe('save', () => {
    it('应该将配置序列化后写入 store', async () => {
      const config = UserConfig.createDefault();

      await repository.save(config);

      expect(store.set).toHaveBeenCalledTimes(1);
      const [key, value] = (store.set as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        PersistedConfig,
      ];
      expect(key).toBe('userConfig');
      expect(value.shortcut.triggerKey).toBe('V');
      expect(value.polish.style).toBe('light');
    });

    it('保存后应该能完整恢复', async () => {
      const original = UserConfig.createDefault().updatePolishStyle('condensed');

      await repository.save(original);
      const restored = await repository.load();

      expect(restored!.polish.style).toBe('condensed');
      expect(restored!.shortcut.triggerKey).toBe(original.shortcut.triggerKey);
    });
  });
});
