import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceInputOrchestrator } from '../VoiceInputOrchestrator';
import type { AudioCaptureService } from '@domain/voice/services/AudioCaptureService';
import type { SemanticChunkDetector } from '@domain/voice/services/SemanticChunkDetector';
import type { STTStrategy } from '@domain/model/ports/STTStrategy';
import type { PolishService } from '@domain/content/services/PolishService';
import type { PasterService } from '@domain/action/services/PasterService';
import type { ClipboardPort } from '@domain/action/ports/ClipboardPort';
import type { ContentSession } from '@domain/content/entities/ContentSession';

/**
 * VoiceInputOrchestrator Toggle模式测试
 *
 * 业务场景：
 * - Toggle模式：按一次开始录音，再按一次结束
 * - Hold模式：按住开始，松开结束
 */
describe('VoiceInputOrchestrator - Toggle模式', () => {
  let mockAudioCapture: AudioCaptureService;
  let mockChunkDetector: SemanticChunkDetector;
  let mockSttStrategy: STTStrategy;
  let mockPolishService: PolishService;
  let mockPasterService: PasterService;
  let mockClipboardPort: ClipboardPort;

  beforeEach(() => {
    mockAudioCapture = {
      startCapture: vi.fn().mockResolvedValue(undefined),
      stopCapture: vi.fn().mockResolvedValue(undefined),
      onChunk: vi.fn().mockReturnValue(() => {}),
    } as unknown as AudioCaptureService;

    mockChunkDetector = {
      process: vi.fn().mockReturnValue(null),
      flush: vi.fn().mockReturnValue(null),
    } as unknown as SemanticChunkDetector;

    mockSttStrategy = {
      strategyType: 'cloud',
      transcribe: vi.fn().mockResolvedValue({ text: '测试文本', isEmpty: () => false }),
      isAvailable: vi.fn().mockResolvedValue(true),
    } as unknown as STTStrategy;

    mockPolishService = {
      polish: vi.fn().mockImplementation(async (session: ContentSession) => session),
      isAvailable: vi.fn().mockResolvedValue(true),
    } as unknown as PolishService;

    mockPasterService = {
      paste: vi.fn().mockResolvedValue(undefined),
    } as unknown as PasterService;

    mockClipboardPort = {
      readText: vi.fn().mockResolvedValue(''),
      writeText: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClipboardPort;
  });

  const createPorts = () => ({
    audioCapture: mockAudioCapture,
    chunkDetector: mockChunkDetector,
    sttStrategy: mockSttStrategy,
    polishService: mockPolishService,
    pasterService: mockPasterService,
    clipboardPort: mockClipboardPort,
  });

  describe('Toggle模式基本流程', () => {
    it('首次按下快捷键时应开始录音', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      expect(orchestrator.getStatus()).toBe('idle');

      await orchestrator.onShortcutPressed();

      expect(orchestrator.getStatus()).toBe('recording');
      expect(mockAudioCapture.startCapture).toHaveBeenCalledTimes(1);
      expect(mockClipboardPort.readText).toHaveBeenCalledTimes(1);
    });

    it('第二次按下快捷键时应停止录音', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');

      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('idle');
      expect(mockAudioCapture.stopCapture).toHaveBeenCalledTimes(1);
    });

    it('第三次按下快捷键时应重新开始录音', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      // 第一次按下 - 开始
      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');

      // 第二次按下 - 停止
      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('idle');

      // 第三次按下 - 重新开始
      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');
      expect(mockAudioCapture.startCapture).toHaveBeenCalledTimes(2);
    });

    it('在toggle模式下释放快捷键不应停止录音', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');

      await orchestrator.onShortcutReleased();
      expect(orchestrator.getStatus()).toBe('recording');
      expect(mockAudioCapture.stopCapture).not.toHaveBeenCalled();
    });
  });

  describe('Toggle模式与Hold模式对比', () => {
    it('hold模式下释放快捷键应停止录音', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'hold',
      });

      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');

      await orchestrator.onShortcutReleased();
      expect(orchestrator.getStatus()).toBe('idle');
      expect(mockAudioCapture.stopCapture).toHaveBeenCalledTimes(1);
    });

    it('hold模式下第二次按下快捷键不应执行任何操作', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'hold',
      });

      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();

      expect(mockAudioCapture.startCapture).toHaveBeenCalledTimes(1);
      expect(orchestrator.getStatus()).toBe('recording');
    });

    it('hold模式下按下快捷键并保持应持续录音状态', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'hold',
      });

      await orchestrator.onShortcutPressed();
      expect(orchestrator.getStatus()).toBe('recording');

      // 模拟多次按下（不应该影响状态）
      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();

      expect(orchestrator.getStatus()).toBe('recording');
      expect(mockAudioCapture.startCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle模式润色触发', () => {
    it('toggle模式停止后应触发润色（当autoPolish为true时）', async () => {
      mockChunkDetector.flush = vi.fn().mockReturnValue({
        audioData: new Float32Array(100),
        sampleRate: 16000,
        durationMs: 1000,
        timestamp: Date.now(),
      });

      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: true,
        mode: 'toggle',
      });

      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();

      expect(mockPolishService.polish).toHaveBeenCalled();
    });

    it('toggle模式停止后不应触发润色（当autoPolish为false时）', async () => {
      mockChunkDetector.flush = vi.fn().mockReturnValue({
        audioData: new Float32Array(100),
        sampleRate: 16000,
        durationMs: 1000,
        timestamp: Date.now(),
      });

      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      await orchestrator.onShortcutPressed();
      await orchestrator.onShortcutPressed();

      expect(mockPolishService.polish).not.toHaveBeenCalled();
    });
  });

  describe('Toggle模式状态转换', () => {
    it('应正确记录状态转换历史', async () => {
      const orchestrator = new VoiceInputOrchestrator(createPorts(), {
        polishStyle: 'light',
        autoPolish: false,
        mode: 'toggle',
      });

      const states: string[] = [];
      states.push(orchestrator.getStatus());

      await orchestrator.onShortcutPressed();
      states.push(orchestrator.getStatus());

      await orchestrator.onShortcutPressed();
      states.push(orchestrator.getStatus());

      await orchestrator.onShortcutPressed();
      states.push(orchestrator.getStatus());

      expect(states).toEqual(['idle', 'recording', 'idle', 'recording']);
    });
  });
});
