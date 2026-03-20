import { ContentSession } from '@domain/content/entities/ContentSession';
import type { PolishStyle } from '@domain/content/enums/PolishStyle';
import type { PolishService } from '@domain/content/services/PolishService';
import type { ClipboardPort } from '@domain/action/ports/ClipboardPort';
import type { PasterService } from '@domain/action/services/PasterService';
import type { ShortcutMode } from '@domain/config/value-objects/ShortcutConfig';
import { AudioChunk as ModelAudioChunk } from '@domain/model/value-objects/AudioChunk';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type {
  AudioCaptureService,
  UnsubscribeFn,
} from '@domain/voice/services/AudioCaptureService';
import type { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import type { SemanticChunk } from '@domain/voice/value-objects/SemanticChunk';

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
  private status: OrchestratorStatus = 'idle';
  private session: ContentSession | null = null;
  private unsubscribe: UnsubscribeFn | null = null;

  constructor(
    private readonly ports: VoiceInputOrchestratorPorts,
    private readonly config: VoiceInputOrchestratorConfig
  ) {}

  getStatus(): OrchestratorStatus {
    return this.status;
  }

  /**
   * Hold mode:  press → start recording
   * Toggle mode: first press → start; second press → stop
   */
  async onShortcutPressed(): Promise<void> {
    if (this.config.mode === 'hold') {
      if (this.status === 'idle') {
        await this.startRecording();
      }
    } else {
      // toggle
      if (this.status === 'idle') {
        await this.startRecording();
      } else {
        await this.stopAndFinalize();
      }
    }
  }

  /**
   * Hold mode only: release key → stop recording
   */
  async onShortcutReleased(): Promise<void> {
    if (this.config.mode === 'hold' && this.status === 'recording') {
      await this.stopAndFinalize();
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private async startRecording(): Promise<void> {
    // Save clipboard snapshot (side effect — stored for future restore if needed)
    await this.ports.clipboardPort.readText();

    // Reset session
    this.session = null;

    // Subscribe to audio chunks before starting capture
    this.unsubscribe = this.ports.audioCapture.onChunk(chunk => {
      const semanticChunk = this.ports.chunkDetector.process(chunk);
      if (semanticChunk) {
        // Fire-and-forget: async processing of each chunk
        void this.processSemanticChunk(semanticChunk);
      }
    });

    await this.ports.audioCapture.startCapture();
    this.status = 'recording';
  }

  private async stopAndFinalize(): Promise<void> {
    this.status = 'idle';

    // Unsubscribe from new chunks first
    this.unsubscribe?.();
    this.unsubscribe = null;

    // Stop audio capture
    await this.ports.audioCapture.stopCapture();

    // Flush any remaining buffered audio
    const remaining = this.ports.chunkDetector.flush();
    if (remaining) {
      await this.processSemanticChunk(remaining);
    }

    // Polish accumulated text if autoPolish enabled
    if (this.config.autoPolish && this.session !== null) {
      const polished = await this.ports.polishService.polish(this.session);
      this.session = polished;
    }

    this.session = null;
  }

  private async processSemanticChunk(chunk: SemanticChunk): Promise<void> {
    // Convert voice SemanticChunk → model AudioChunk for STT
    const audioChunk = new ModelAudioChunk({
      data: chunk.audioData,
      sampleRate: chunk.sampleRate,
    });

    const result = await this.ports.sttStrategy.transcribe(audioChunk);
    if (result.isEmpty()) return;

    // Accumulate raw text in session
    if (this.session === null) {
      this.session = ContentSession.create(result.text, this.config.polishStyle);
    } else {
      this.session = this.session.appendRawText(result.text);
    }

    // Incremental paste of raw text (low latency)
    await this.ports.pasterService.paste(result.text);
  }
}
