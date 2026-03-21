import { useMemo } from 'react';
import { MicIndicator } from './components/MicIndicator';
import { useOrchestrator } from './hooks/useOrchestrator';
import { useRecordingStore } from './stores/recordingStore';
import { createOrchestrator } from './createOrchestrator';
import { UserConfig } from '@domain/config/entities/UserConfig';
import { TauriStoreConfigRepository } from '@infrastructure/persistence/TauriStoreConfigRepository';
import { useEffect, useState } from 'react';

function MicIndicatorApp(): React.ReactElement {
  const [config, setConfig] = useState<UserConfig>(UserConfig.createDefault());

  useEffect((): void => {
    const repo = new TauriStoreConfigRepository();
    void repo.load().then(loaded => {
      if (loaded) setConfig(loaded);
    });
  }, []);

  const orchestrator = useMemo(() => createOrchestrator(config), [config]);

  useOrchestrator(orchestrator);

  const status = useRecordingStore(s => s.status);

  return (
    <div className="flex items-center justify-center w-full h-full bg-transparent">
      <MicIndicator status={status} />
    </div>
  );
}

export default MicIndicatorApp;
