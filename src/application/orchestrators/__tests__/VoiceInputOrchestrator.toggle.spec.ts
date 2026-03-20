import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceInputOrchestrator } from '../VoiceInputOrchestrator';
import type {
  VoiceInputOrchestratorPorts,
  VoiceInputOrchestratorConfig,
} from '../VoiceInputOrchestrator';
import type {
  AudioCaptureService,
  ChunkCallback,
} from '@domain/voice/services/AudioCaptureService';
import type { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type { PolishService } from '@domain/content/services/PolishService';
import type { PasterService } from '@domain/action/services/PasterService';
import type { ClipboardPort } from '@domain/action/ports/ClipboardPort';
import { SemanticChunk } from '@domain/voice/value-objects/SemanticChunk';
import { TranscriptionResult } from '@domain/model/value-objects/TranscriptionResult';
import { ContentSession } from '@domain/content/entities/ContentSession';

// ─── helpers (mirrors hold spec) ─────────────────────────────────────────────

function makeSemanticChunk(durationMs = 1000): SemanticChunk {
  const sampleRate = 16000;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  return new SemanticChunk({
    audioData: new Float32Array(sampleCount).fill(0.1),
    sampleRate,
    durationMs,
    estimatedLength: 4.5,
    triggerReason: 'length_threshold',
  });
}

function makeAudioCaptureService(): AudioCaptureService & {
  triggerChunk: (chunk: Parameters<ChunkCallback>[0]) => void;
} {
  let registeredCallback: ChunkCallback | null = null;

  return {
    startCapture: vi.fn().mockResolvedValue(undefined),
    stopCapture: vi.fn().mockResolvedValue(undefined),
    pauseCapture: vi.fn().mockResolvedValue(undefined),
    resumeCapture: vi.fn().mockResolvedValue(undefined),
    isCapturing: vi.fn().mockReturnValue(false),
    getConfig: vi.fn().mockReturnValue({ sampleRate: 16000, channels: 1, chunkDurationMs: 100 }),
    onChunk: vi.fn().mockImplementation((cb: ChunkCallback) => {
      registeredCallback = cb;
      return () => {
        registeredCallback = null;
      };
    }),
    triggerChunk: chunk => {
      registeredCallback?.(chunk);
    },
  };
}

function makeChunkDetector(semanticChunk: SemanticChunk | null = null): SemanticChunkDetector {
  return {
    process: vi.fn().mockReturnValue(semanticChunk),
    flush: vi.fn().mockReturnValue(null),
    reset: vi.fn(),
    get bufferedSpeechMs() {
      return 0;
    },
    get bufferedChunkCount() {
      return 0;
    },
  } as unknown as SemanticChunkDetector;
}

function makeSTTStrategy(text = '转写文本'): STTStrategy {
  return {
    strategyType: 'cloud' as const,
    transcribe: vi.fn().mockResolvedValue(new TranscriptionResult({ text, durationMs: 1000 })),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

function makePolishService(): PolishService {
  return {
    polish: vi
      .fn()
      .mockImplementation(async (session: ContentSession) => session.setPolishedText('润色后文本')),
    isAvailable: vi.fn().mockResolvedValue(true),
  } as unknown as PolishService;
}

function makePasterService(): PasterService {
  return {
    paste: vi.fn().mockResolvedValue(undefined),
    pasteAll: vi.fn().mockResolvedValue(undefined),
  } as unknown as PasterService;
}

function makeClipboardPort(): ClipboardPort {
  return {
    readText: vi.fn().mockResolvedValue('旧剪贴板内容'),
    writeText: vi.fn().mockResolvedValue(undefined),
    simulatePaste: vi.fn().mockResolvedValue(undefined),
  };
}

function makePorts(
  overrides: Partial<VoiceInputOrchestratorPorts> = {}
): VoiceInputOrchestratorPorts & {
  audioCapture: ReturnType<typeof makeAudioCaptureService>;
} {
  const audioCapture = makeAudioCaptureService();
  return {
    audioCapture,
    chunkDetector: makeChunkDetector(),
    sttStrategy: makeSTTStrategy(),
    polishService: makePolishService(),
    pasterService: makePasterService(),
    clipboardPort: makeClipboardPort(),
    ...overrides,
  };
}

function makeToggleConfig(
  overrides: Partial<VoiceInputOrchestratorConfig> = {}
): VoiceInputOrchestratorConfig {
  return {
    polishStyle: 'light',
    autoPolish: true,
    mode: 'toggle',
    ...overrides,
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('VoiceInputOrchestrator - 切换模式（toggle）', () => {
  let ports: ReturnType<typeof makePorts>;
  let config: VoiceInputOrchestratorConfig;
  let orchestrator: VoiceInputOrchestrator;

  beforeEach(() => {
    ports = makePorts();
    config = makeToggleConfig();
    orchestrator = new VoiceInputOrchestrator(ports, config);
  });

  describe('首次按下开始录音', () => {
    it('首次按下后状态变为 recording', async () => {
      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');
    });

    it('首次按下时应保存剪贴板快照', async () => {
      await orchestrator.onShortcutPressed();
      expect(ports.clipboardPort.readText).toHaveBeenCalledOnce();
    });

    it('首次按下时应启动音频采集', async () => {
      await orchestrator.onShortcutPressed();
      expect(ports.audioCapture.startCapture).toHaveBeenCalledOnce();
    });
  });

  describe('第二次按下停止录音', () => {
    it('第二次按下后状态恢复为 idle', async () => {
      await orchestrator.onShortcutPressed(); // start
      await orchestrator.onShortcutPressed(); // stop
      expect(orchestrator.getStatus()).toBe('idle');
    });

    it('第二次按下时应停止音频采集', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();
      expect(ports.audioCapture.stopCapture).toHaveBeenCalledOnce();
    });

    it('第二次按下时应 flush 检测器', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();
      expect(ports.chunkDetector.flush).toHaveBeenCalledOnce();
    });
  });

  describe('toggle 模式下 onShortcutReleased 无效', () => {
    it('toggle 模式松开快捷键不停止录音', async () => {
      await orchestrator.onShortcutPressed(); // start
      await orchestrator.onShortcutReleased(); // should do nothing in toggle mode
      expect(orchestrator.getStatus()).toBe('recording');
      expect(ports.audioCapture.stopCapture).not.toHaveBeenCalled();
    });
  });

  describe('停止后润色（autoPolish）', () => {
    it('第二次按下后 autoPolish=true 应触发润色', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      config = makeToggleConfig({ autoPolish: true });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed(); // start
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });
      await vi.waitFor(() => expect(ports.pasterService.paste).toHaveBeenCalled());

      await orchestrator.onShortcutPressed(); // stop
      expect(ports.polishService.polish).toHaveBeenCalledOnce();
    });

    it('第二次按下后 autoPolish=false 不触发润色', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      config = makeToggleConfig({ autoPolish: false });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });
      await vi.waitFor(() => expect(ports.pasterService.paste).toHaveBeenCalled());

      await orchestrator.onShortcutPressed();
      expect(ports.polishService.polish).not.toHaveBeenCalled();
    });
  });

  describe('toggle 录音期间行为与 hold 一致', () => {
    it('录音期间语义块 → STT → 增量粘贴', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      orchestrator = new VoiceInputOrchestrator(ports, makeToggleConfig());

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });

      await vi.waitFor(() => {
        expect(ports.sttStrategy.transcribe).toHaveBeenCalledOnce();
        expect(ports.pasterService.paste).toHaveBeenCalledWith('转写文本');
      });
    });
  });

  describe('idle 时第三次按下应重新开始', () => {
    it('停止后再次按下应重启录音', async () => {
      await orchestrator.onShortcutPressed(); // start
      await orchestrator.onShortcutPressed(); // stop
      expect(orchestrator.getStatus()).toBe('idle');

      await orchestrator.onShortcutPressed(); // start again
      expect(orchestrator.getStatus()).toBe('recording');
      expect(ports.audioCapture.startCapture).toHaveBeenCalledTimes(2);
    });
  });
});
