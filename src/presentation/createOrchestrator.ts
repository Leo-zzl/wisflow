import { VoiceInputOrchestrator } from '@application/orchestrators/VoiceInputOrchestrator';
import { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import { PasterService } from '@domain/action/services/PasterService';
import { PolishService } from '@domain/content/services/PolishService';
import { UserConfig } from '@domain/config/entities/UserConfig';
import { TranscriptionResult } from '@domain/model/value-objects/TranscriptionResult';
import { TauriAudioCaptureAdapter } from '@infrastructure/audio/TauriAudioCaptureAdapter';
import { TauriClipboardAdapter } from '@infrastructure/clipboard/TauriClipboardAdapter';
import { CloudSTTStrategy } from '@infrastructure/stt/CloudSTTStrategy';
import { OpenAIPolishAdapter } from '@infrastructure/llm/OpenAIPolishAdapter';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type { PolishPort } from '@domain/content/ports/PolishPort';

function buildSTTStrategy(config: UserConfig): STTStrategy {
  const endpoint = (window as Record<string, unknown>)['WISFLOW_STT_ENDPOINT'] as
    | string
    | undefined;
  const apiKey = (window as Record<string, unknown>)['WISFLOW_API_KEY'] as string | undefined;

  if (endpoint && apiKey) {
    return new CloudSTTStrategy({ endpoint, apiKey });
  }

  // noop STT：返回空文本（UI 可用，但无实际转写）
  const noopSTT: STTStrategy = {
    strategyType: 'cloud',
    transcribe: () => Promise.resolve(TranscriptionResult.empty(0)),
  };
  void config;
  return noopSTT;
}

function buildPolishPort(config: UserConfig): PolishPort {
  const endpoint = (window as Record<string, unknown>)['WISFLOW_LLM_ENDPOINT'] as
    | string
    | undefined;
  const apiKey = (window as Record<string, unknown>)['WISFLOW_API_KEY'] as string | undefined;

  if (endpoint && apiKey) {
    return new OpenAIPolishAdapter({ endpoint, apiKey });
  }

  // noop polish：原文透传
  const noopPolish: PolishPort = {
    polish: text => Promise.resolve(text),
    isAvailable: () => Promise.resolve(false),
  };
  void config;
  return noopPolish;
}

export function createOrchestrator(config: UserConfig): VoiceInputOrchestrator {
  const audioCapture = new TauriAudioCaptureAdapter();
  const clipboardPort = new TauriClipboardAdapter();
  const pasterService = new PasterService(clipboardPort);
  const chunkDetector = new SemanticChunkDetector();
  const sttStrategy = buildSTTStrategy(config);
  const polishPort = buildPolishPort(config);
  const polishService = new PolishService(polishPort);

  return new VoiceInputOrchestrator(
    {
      audioCapture,
      chunkDetector,
      sttStrategy,
      polishService,
      pasterService,
      clipboardPort,
    },
    {
      polishStyle: config.polish.style,
      autoPolish: config.polish.autoPolish,
      mode: config.shortcut.mode,
    }
  );
}
