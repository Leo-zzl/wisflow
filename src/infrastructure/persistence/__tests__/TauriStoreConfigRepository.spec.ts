import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserConfig } from '@domain/config/entities/UserConfig';
import { ShortcutConfig } from '@domain/config/value-objects/ShortcutConfig';
import {
  TauriStoreConfigRepository,
  TauriStoreInstance,
  TauriStoreLoader,
  PersistedConfig,
} from '../TauriStoreConfigRepository';

function makeStore(initial?: PersistedConfig): TauriStoreInstance {
  let data: PersistedConfig | undefined = initial;
  return {
    get: vi.fn().mockImplementation(async () => data ?? null),
    set: vi.fn().mockImplementation(async (_key: string, value: PersistedConfig) => {
      data = value;
    }),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function makeLoader(store: TauriStoreInstance): TauriStoreLoader {
  return {
    load: vi.fn().mockResolvedValue(store),
  };
}

describe('TauriStoreConfigRepository', () => {
  let store: TauriStoreInstance;
  let loader: TauriStoreLoader;
  let repository: TauriStoreConfigRepository;

  beforeEach(() => {
    store = makeStore();
    loader = makeLoader(store);
    repository = new TauriStoreConfigRepository(loader);
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
      loader = makeLoader(store);
      repository = new TauriStoreConfigRepository(loader);

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
      loader = makeLoader(store);
      repository = new TauriStoreConfigRepository(loader);

      const result = await repository.load();

      expect(result!.shortcut.triggerKey).toBe('F9');
      expect(result!.shortcut.mode).toBe('toggle');
      expect(result!.polish.style).toBe('deep');
    });

    it('每次 load 都应该调用 storeLoader.load', async () => {
      await repository.load();

      expect(loader.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('应该将配置序列化后写入 store', async () => {
      const config = UserConfig.createDefault();

      await repository.save(config);

      expect(store.set).toHaveBeenCalledTimes(1);
      const callArgs = (store.set as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        PersistedConfig,
      ];
      expect(callArgs[0]).toBe('userConfig');
      expect(callArgs[1].shortcut.triggerKey).toBe('V');
      expect(callArgs[1].polish.style).toBe('light');
    });

    it('保存后应该调用 store.save()', async () => {
      const config = UserConfig.createDefault();

      await repository.save(config);

      expect(store.save).toHaveBeenCalledTimes(1);
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
