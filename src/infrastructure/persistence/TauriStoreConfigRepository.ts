import { load } from '@tauri-apps/plugin-store';
import { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import {
  UserConfig,
  ModelPolicy,
  PolishConfig,
  UIConfig,
} from '@domain/config/entities/UserConfig';
import { ShortcutConfig, ShortcutConfigProps } from '@domain/config/value-objects/ShortcutConfig';

interface PersistedConfig {
  shortcut: ShortcutConfigProps;
  modelPolicy: ModelPolicy;
  polish: PolishConfig;
  ui: UIConfig;
}

const STORE_FILE = 'wisflow-config.json';
const CONFIG_KEY = 'userConfig';

/**
 * Tauri 配置仓库
 * 实现 ConfigRepository，使用 @tauri-apps/plugin-store 替代 electron-store
 */
export class TauriStoreConfigRepository implements ConfigRepository {
  async load(): Promise<UserConfig | null> {
    const store = await load(STORE_FILE, { autoSave: false });
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
    const store = await load(STORE_FILE, { autoSave: false });
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
