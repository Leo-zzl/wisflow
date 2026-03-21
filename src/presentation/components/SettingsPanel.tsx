import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';

interface Props {
  repo: ConfigRepository;
}

// Stub — intentionally incomplete for red TDD state
export function SettingsPanel({ repo: _repo }: Props): React.ReactElement {
  return <div />;
}
