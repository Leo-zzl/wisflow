import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import SettingsApp from './presentation/SettingsApp';
import MicIndicatorApp from './presentation/MicIndicatorApp';

// Detect which Tauri window we're in
const windowLabel =
  (
    window as unknown as {
      __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
    }
  ).__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';

function bootstrap(): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (windowLabel === 'mic-indicator') {
    createRoot(rootEl).render(
      <StrictMode>
        <MicIndicatorApp />
      </StrictMode>
    );
  } else {
    createRoot(rootEl).render(
      <StrictMode>
        <SettingsApp />
      </StrictMode>
    );
  }
}

bootstrap();
