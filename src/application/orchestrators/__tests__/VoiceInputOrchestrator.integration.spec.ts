/**
 * 集成测试：VoiceInputOrchestrator 完整流程
 *
 * 使用真实的 SemanticChunkDetector，只 mock 外部端口
 * （AudioCapture, STT, Polish, Paster, Clipboard）。
 */
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
import { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type { PolishService } from '@domain/content/services/PolishService';
import type { PasterService } from '@domain/action/services/PasterService';
import type { ClipboardPort } from '@domain/action/ports/ClipboardPort';
import { AudioChunk as VoiceAudioChunk } from '@domain/voice/value-objects/AudioChunk';
import { TranscriptionResult } from '@domain/model/value-objects/TranscriptionResult';
import { ContentSession } from '@domain/content/entities/ContentSession';

// ─── helpers ────────────────────────────────────────────────────────────────

/** 创建含语音信号的音频块（能量足够触发 SemanticChunkDetector 积累） */
function makeSpeechChunk(durationMs: number): VoiceAudioChunk {
  const sampleRate = 16000;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const data = new Float32Array(sampleCount).fill(0.1); // rms > threshold
  return new VoiceAudioChunk({ data, sampleRate, channels: 1, timestamp: 0, durationMs });
}

function makeAudioCaptureService(): AudioCaptureService & {
  triggerChunk: (chunk: VoiceAudioChunk) => void;
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

// ─── tests ───────────────────────────────────────────────────────────────────

describe('VoiceInputOrchestrator 集成测试', () => {
  let audioCapture: ReturnType<typeof makeAudioCaptureService>;
  let sttStrategy: STTStrategy;
  let polishService: PolishService;
  let pasterService: PasterService;
  let clipboardPort: ClipboardPort;
  let ports: VoiceInputOrchestratorPorts & {
    audioCapture: ReturnType<typeof makeAudioCaptureService>;
  };
  let orchestrator: VoiceInputOrchestrator;

  beforeEach(() => {
    audioCapture = makeAudioCaptureService();

    sttStrategy = {
      strategyType: 'cloud' as const,
      transcribe: vi
        .fn()
        .mockResolvedValue(new TranscriptionResult({ text: '今天天气', durationMs: 1000 })),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    polishService = {
      polish: vi
        .fn()
        .mockImplementation(async (session: ContentSession) =>
          session.setPolishedText('今天的天气真的非常好')
        ),
      isAvailable: vi.fn().mockResolvedValue(true),
    } as unknown as PolishService;

    pasterService = {
      paste: vi.fn().mockResolvedValue(undefined),
      pasteAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as PasterService;

    clipboardPort = {
      readText: vi.fn().mockResolvedValue('旧内容'),
      writeText: vi.fn().mockResolvedValue(undefined),
      simulatePaste: vi.fn().mockResolvedValue(undefined),
    };

    ports = {
      audioCapture,
      chunkDetector: new SemanticChunkDetector({ charThreshold: 10 }), // 真实实现
      sttStrategy,
      polishService,
      pasterService,
      clipboardPort,
    };
  });

  describe('hold 模式完整流程', () => {
    const holdConfig: VoiceInputOrchestratorConfig = {
      polishStyle: 'light',
      autoPolish: true,
      mode: 'hold',
    };

    beforeEach(() => {
      orchestrator = new VoiceInputOrchestrator(ports, holdConfig);
    });

    it('语音 2.5 秒（≈11.25字）应触发语义块 → STT → 粘贴', async () => {
      await orchestrator.onShortcutPressed();

      // 2.5 秒语音 → 11.25 字估计 → 超过 charThreshold=10 → 触发语义块
      const speechChunk = makeSpeechChunk(2500);
      audioCapture.triggerChunk(speechChunk);

      await vi.waitFor(() => {
        expect(sttStrategy.transcribe).toHaveBeenCalledOnce();
        expect(pasterService.paste).toHaveBeenCalledWith('今天天气');
      });
    });

    it('松开快捷键后应触发润色', async () => {
      await orchestrator.onShortcutPressed();

      const speechChunk = makeSpeechChunk(2500);
      audioCapture.triggerChunk(speechChunk);
      await vi.waitFor(() => expect(pasterService.paste).toHaveBeenCalled());

      await orchestrator.onShortcutReleased();
      expect(polishService.polish).toHaveBeenCalledOnce();
    });

    it('松开时剩余不足阈值的音频被 flush 并转写', async () => {
      await orchestrator.onShortcutPressed();

      // 只说 1 秒（4.5字，低于10字阈值），不会触发检测
      const shortChunk = makeSpeechChunk(1000);
      audioCapture.triggerChunk(shortChunk);

      // 没有立即转写
      await new Promise(r => setTimeout(r, 50));
      expect(sttStrategy.transcribe).not.toHaveBeenCalled();

      // 松开 → flush → 转写剩余
      await orchestrator.onShortcutReleased();
      expect(sttStrategy.transcribe).toHaveBeenCalledOnce();
    });

    it('完整流程：按下 → 多语义块 → 松开 → 润色', async () => {
      // 模拟 STT 返回不同文本
      (sttStrategy.transcribe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(new TranscriptionResult({ text: '今天天气', durationMs: 1000 }))
        .mockResolvedValueOnce(new TranscriptionResult({ text: '真不错', durationMs: 800 }));

      await orchestrator.onShortcutPressed();

      // 第一个语义块（2.5秒语音）
      audioCapture.triggerChunk(makeSpeechChunk(2500));
      await vi.waitFor(() => expect(pasterService.paste).toHaveBeenCalledWith('今天天气'));

      // 第二个语义块（2.5秒语音）
      audioCapture.triggerChunk(makeSpeechChunk(2500));
      await vi.waitFor(() => expect(pasterService.paste).toHaveBeenCalledWith('真不错'));

      // 松开 → 润色
      await orchestrator.onShortcutReleased();

      expect(pasterService.paste).toHaveBeenCalledTimes(2);
      expect(polishService.polish).toHaveBeenCalledOnce();

      // 润色服务收到的 session 应包含完整 rawText
      const sessionArg = (polishService.polish as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as ContentSession;
      expect(sessionArg.rawText).toBe('今天天气真不错');
    });
  });

  describe('toggle 模式完整流程', () => {
    const toggleConfig: VoiceInputOrchestratorConfig = {
      polishStyle: 'deep',
      autoPolish: true,
      mode: 'toggle',
    };

    beforeEach(() => {
      orchestrator = new VoiceInputOrchestrator(ports, toggleConfig);
    });

    it('第一次按下开始，第二次按下停止并润色', async () => {
      await orchestrator.onShortcutPressed(); // start
      expect(orchestrator.getStatus()).toBe('recording');

      audioCapture.triggerChunk(makeSpeechChunk(2500));
      await vi.waitFor(() => expect(pasterService.paste).toHaveBeenCalled());

      await orchestrator.onShortcutPressed(); // stop
      expect(orchestrator.getStatus()).toBe('idle');
      expect(polishService.polish).toHaveBeenCalledOnce();
    });

    it('toggle 模式 onShortcutReleased 不触发停止', async () => {
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutReleased(); // no-op in toggle
      expect(orchestrator.getStatus()).toBe('recording');
      expect(polishService.polish).not.toHaveBeenCalled();
    });
  });

  describe('autoPolish=false 时', () => {
    it('停止后不触发润色', async () => {
      orchestrator = new VoiceInputOrchestrator(ports, {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'hold',
      });

      await orchestrator.onShortcutPressed();
      audioCapture.triggerChunk(makeSpeechChunk(2500));
      await vi.waitFor(() => expect(pasterService.paste).toHaveBeenCalled());

      await orchestrator.onShortcutReleased();
      expect(polishService.polish).not.toHaveBeenCalled();
    });
  });
});
