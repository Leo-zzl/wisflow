import type { AudioCaptureService } from '@domain/voice/services/AudioCaptureService';
import type { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type { PolishService } from '@domain/content/services/PolishService';
import type { PasterService } from '@domain/action/services/PasterService';
import type { ClipboardPort } from '@domain/action/ports/ClipboardPort';
import type { PolishStyle } from '@domain/content/enums/PolishStyle';
import type { ShortcutMode } from '@domain/config/value-objects/ShortcutConfig';

export interface VoiceInputOrchestratorPorts {
  audioCapture: AudioCaptureService;
  chunkDetector: SemanticChunkDetector;
  sttStrategy: STTStrategy;
  polishService: PolishService;
  pasterService: PasterService;
  clipboardPort: ClipboardPort;
}

export interface VoiceInputOrchestratorConfig {
  polishStyle: PolishStyle;
  autoPolish: boolean;
  mode: ShortcutMode;
}

export type OrchestratorStatus = 'idle' | 'recording';

export class VoiceInputOrchestrator {
  constructor(_ports: VoiceInputOrchestratorPorts, _config: VoiceInputOrchestratorConfig) {}

  getStatus(): OrchestratorStatus {
    return Promise.reject(new Error('Not implemented')) as unknown as OrchestratorStatus;
  }

  async onShortcutPressed(): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  async onShortcutReleased(): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }
}
