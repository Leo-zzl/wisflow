import { load } from '@tauri-apps/plugin-store';
import { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import {
  UserConfig,
  ModelPolicy,
  PolishConfig,
  UIConfig,
} from '@domain/config/entities/UserConfig';
import { ShortcutConfig, ShortcutConfigProps } from '@domain/config/value-objects/ShortcutConfig';

export interface PersistedConfig {
  shortcut: ShortcutConfigProps;
  modelPolicy: ModelPolicy;
  polish: PolishConfig;
  ui: UIConfig;
}

/** 可注入的 Tauri store 实例接口，便于单元测试 */
export interface TauriStoreInstance {
  get<T>(key: string): Promise<T | null | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
}

/** 可注入的 store 加载器接口，便于单元测试 */
export interface TauriStoreLoader {
  load(path: string, options?: { autoSave?: boolean }): Promise<TauriStoreInstance>;
}

const STORE_FILE = 'wisflow-config.json';
const CONFIG_KEY = 'userConfig';

// 默认生产加载器：直接调用 @tauri-apps/plugin-store
const defaultStoreLoader: TauriStoreLoader = {
  load: (path, options) => load(path, options) as Promise<TauriStoreInstance>,
};

/**
 * Tauri 配置仓库
 * 实现 ConfigRepository，使用 @tauri-apps/plugin-store 替代 electron-store。
 * 接受可注入的 TauriStoreLoader，生产时使用默认实现，测试时注入 mock。
 */
export class TauriStoreConfigRepository implements ConfigRepository {
  private readonly storeLoader: TauriStoreLoader;

  constructor(storeLoader: TauriStoreLoader = defaultStoreLoader) {
    this.storeLoader = storeLoader;
  }

  async load(): Promise<UserConfig | null> {
    const store = await this.storeLoader.load(STORE_FILE, { autoSave: false });
    const raw = await store.get<PersistedConfig>(CONFIG_KEY);
    if (!raw) return null;

    return UserConfig.fromJSON({
      shortcut: ShortcutConfig.fromJSON(raw.shortcut),
      modelPolicy: raw.modelPolicy,
      polish: raw.polish,
      ui: raw.ui,
    });
  }

  async save(config: UserConfig): Promise<void> {
    const store = await this.storeLoader.load(STORE_FILE, { autoSave: false });
    const json = config.toJSON();
    await store.set(CONFIG_KEY, {
      shortcut: json.shortcut.toJSON(),
      modelPolicy: json.modelPolicy,
      polish: json.polish,
      ui: json.ui,
    } satisfies PersistedConfig);
    await store.save();
  }
}
