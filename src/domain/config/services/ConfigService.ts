import { UserConfig } from '../entities/UserConfig';
import type { ConfigRepository } from '../repositories/ConfigRepository';

export class ConfigService {
  private cache: UserConfig | null = null;

  constructor(private readonly repository: ConfigRepository) {}

  async getConfig(): Promise<UserConfig> {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      const loaded = await this.repository.load();
      this.cache = loaded ?? UserConfig.createDefault();
    } catch {
      this.cache = UserConfig.createDefault();
    }

    return this.cache;
  }

  async saveConfig(config: UserConfig): Promise<void> {
    await this.repository.save(config);
    this.cache = config;
  }

  async updateConfig(updater: (config: UserConfig) => UserConfig): Promise<UserConfig> {
    const current = await this.getConfig();
    const updated = updater(current);
    await this.saveConfig(updated);
    return updated;
  }

  async resetToDefault(): Promise<UserConfig> {
    const defaults = UserConfig.createDefault();
    await this.saveConfig(defaults);
    return defaults;
  }
}
