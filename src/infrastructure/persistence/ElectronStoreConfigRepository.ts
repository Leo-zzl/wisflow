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

// 最小化的 store 接口，便于测试注入
export interface ConfigStore {
  get(key: 'userConfig'): PersistedConfig | undefined;
  set(key: 'userConfig', value: PersistedConfig): void;
}

// 此适配器运行在 Electron 主进程中
export class ElectronStoreConfigRepository implements ConfigRepository {
  constructor(private readonly store: ConfigStore) {}

  load(): Promise<UserConfig | null> {
    const raw = this.store.get('userConfig');
    if (!raw) return Promise.resolve(null);

    return Promise.resolve(
      UserConfig.fromJSON({
        shortcut: ShortcutConfig.fromJSON(raw.shortcut),
        modelPolicy: raw.modelPolicy,
        polish: raw.polish,
        ui: raw.ui,
      })
    );
  }

  save(config: UserConfig): Promise<void> {
    const json = config.toJSON();
    this.store.set('userConfig', {
      shortcut: json.shortcut.toJSON(),
      modelPolicy: json.modelPolicy,
      polish: json.polish,
      ui: json.ui,
    });
    return Promise.resolve();
  }
}

// 工厂函数，在主进程中创建真实的 store 实例
export function createElectronStoreRepository(): ElectronStoreConfigRepository {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const Store = require('electron-store') as typeof import('electron-store').default;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const store = new Store({ name: 'wisflow-config', defaults: {} });
  return new ElectronStoreConfigRepository(store as unknown as ConfigStore);
}
