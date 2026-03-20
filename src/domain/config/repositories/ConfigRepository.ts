import { UserConfig } from '../entities/UserConfig';

export interface ConfigRepository {
  load(): Promise<UserConfig | null>;
  save(config: UserConfig): Promise<void>;
}
