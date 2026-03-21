import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Detect which Tauri window we're in
const windowLabel =
  (
    window as unknown as {
      __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
    }
  ).__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (windowLabel === 'mic-indicator') {
    const { default: MicIndicatorApp } = await import('./presentation/MicIndicatorApp');
    createRoot(rootEl).render(
      <StrictMode>
        <MicIndicatorApp />
      </StrictMode>
    );
  } else {
    const { default: SettingsApp } = await import('./presentation/SettingsApp');
    createRoot(rootEl).render(
      <StrictMode>
        <SettingsApp />
      </StrictMode>
    );
  }
}

void bootstrap();
