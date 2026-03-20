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

// ─── helpers ────────────────────────────────────────────────────────────────

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

// Mock AudioCaptureService that lets tests inject audio chunks manually
function makeAudioCaptureService(): AudioCaptureService & {
  triggerChunk: (cb: Parameters<ChunkCallback>[0]) => void;
} {
  let registeredCallback: ChunkCallback | null = null;

  const service: AudioCaptureService & {
    triggerChunk: (cb: Parameters<ChunkCallback>[0]) => void;
  } = {
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

  return service;
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

function makeSTTStrategy(text = '今天天气真不错'): STTStrategy {
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

function makeClipboardPort(initialText = '旧剪贴板内容'): ClipboardPort {
  return {
    readText: vi.fn().mockResolvedValue(initialText),
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

function makeHoldConfig(
  overrides: Partial<VoiceInputOrchestratorConfig> = {}
): VoiceInputOrchestratorConfig {
  return {
    polishStyle: 'light',
    autoPolish: true,
    mode: 'hold',
    ...overrides,
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('VoiceInputOrchestrator - 按住模式（hold）', () => {
  let ports: ReturnType<typeof makePorts>;
  let config: VoiceInputOrchestratorConfig;
  let orchestrator: VoiceInputOrchestrator;

  beforeEach(() => {
    ports = makePorts();
    config = makeHoldConfig();
    orchestrator = new VoiceInputOrchestrator(ports, config);
  });

  describe('初始状态', () => {
    it('初始状态为 idle', () => {
      expect(orchestrator.getStatus()).toBe('idle');
    });
  });

  describe('按下快捷键开始录音', () => {
    it('按下快捷键后状态变为 recording', async () => {
      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');
    });

    it('按下时应保存剪贴板快照', async () => {
      await orchestrator.onShortcutPressed();
      expect(ports.clipboardPort.readText).toHaveBeenCalledOnce();
    });

    it('按下时应启动音频采集', async () => {
      await orchestrator.onShortcutPressed();
      expect(ports.audioCapture.startCapture).toHaveBeenCalledOnce();
    });

    it('按下时应订阅音频块回调', async () => {
      await orchestrator.onShortcutPressed();
      expect(ports.audioCapture.onChunk).toHaveBeenCalledOnce();
    });
  });

  describe('语义块处理 → STT → 增量粘贴', () => {
    it('音频块产生语义块时应调用 STT 转写', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });

      // Wait for async processing
      await vi.waitFor(() => {
        expect(ports.sttStrategy.transcribe).toHaveBeenCalledOnce();
      });
    });

    it('转写结果非空时应增量粘贴原文', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });

      await vi.waitFor(() => {
        expect(ports.pasterService.paste).toHaveBeenCalledWith('今天天气真不错');
      });
    });

    it('转写结果为空时不应粘贴', async () => {
      const chunk = makeSemanticChunk();
      const sttStrategy = makeSTTStrategy('');
      ports = makePorts({
        chunkDetector: makeChunkDetector(chunk),
        sttStrategy,
      });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });

      await new Promise(r => setTimeout(r, 50));
      expect(ports.pasterService.paste).not.toHaveBeenCalled();
    });

    it('音频块未产生语义块时不应调用 STT', async () => {
      // chunkDetector.process returns null (default)
      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });

      await new Promise(r => setTimeout(r, 50));
      expect(ports.sttStrategy.transcribe).not.toHaveBeenCalled();
    });
  });

  describe('松开快捷键停止录音', () => {
    it('松开后状态恢复为 idle', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased();
      expect(orchestrator.getStatus()).toBe('idle');
    });

    it('松开时应停止音频采集', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased();
      expect(ports.audioCapture.stopCapture).toHaveBeenCalledOnce();
    });

    it('松开时应 flush 检测器剩余音频', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased();
      expect(ports.chunkDetector.flush).toHaveBeenCalledOnce();
    });

    it('松开时 flush 出剩余语义块应进行 STT 转写', async () => {
      const remainingChunk = makeSemanticChunk();
      const chunkDetector = makeChunkDetector();
      (chunkDetector.flush as ReturnType<typeof vi.fn>).mockReturnValue(remainingChunk);
      ports = makePorts({ chunkDetector });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased();

      expect(ports.sttStrategy.transcribe).toHaveBeenCalledOnce();
    });
  });

  describe('停止后润色（autoPolish）', () => {
    it('autoPolish=true 且有累积文本时应触发润色', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      config = makeHoldConfig({ autoPolish: true });
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

      await orchestrator.onShortcutReleased();
      expect(ports.polishService.polish).toHaveBeenCalledOnce();
    });

    it('autoPolish=false 时不应触发润色', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      config = makeHoldConfig({ autoPolish: false });
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

      await orchestrator.onShortcutReleased();
      expect(ports.polishService.polish).not.toHaveBeenCalled();
    });

    it('无累积文本时不应触发润色', async () => {
      // No chunks produced, no text accumulated
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased();
      expect(ports.polishService.polish).not.toHaveBeenCalled();
    });
  });

  describe('idle 状态下松开快捷键无效', () => {
    it('idle 时松开快捷键不做任何操作', async () => {
      expect(orchestrator.getStatus()).toBe('idle');
      await orchestrator.onShortcutReleased();
      expect(ports.audioCapture.stopCapture).not.toHaveBeenCalled();
    });
  });

  describe('多次录音不累积状态', () => {
    it('第二次录音是全新会话，不含上次文本', async () => {
      const chunk = makeSemanticChunk();
      ports = makePorts({ chunkDetector: makeChunkDetector(chunk) });
      orchestrator = new VoiceInputOrchestrator(ports, config);

      // First session
      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });
      await vi.waitFor(() => expect(ports.pasterService.paste).toHaveBeenCalledOnce());
      await orchestrator.onShortcutReleased();

      // Second session
      (ports.pasterService.paste as ReturnType<typeof vi.fn>).mockClear();
      (ports.sttStrategy.transcribe as ReturnType<typeof vi.fn>).mockClear();

      await orchestrator.onShortcutPressed();
      ports.audioCapture.triggerChunk({
        data: new Float32Array(1600).fill(0.1),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 100,
      });
      await vi.waitFor(() => expect(ports.pasterService.paste).toHaveBeenCalledOnce());

      // Only one paste in second session, not two
      expect(ports.pasterService.paste).toHaveBeenCalledTimes(1);
    });
  });
});
