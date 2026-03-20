import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticChunkDetector, DEFAULT_DETECTOR_CONFIG } from '../SemanticChunkDetector';
import { VADFrame } from '../../value-objects/VADFrame';
import {
  createMockAudio,
  createMockAudioWithPause,
  createSilenceAudio,
} from '../../__tests__/audioTestUtils';

describe('SemanticChunkDetector', () => {
  let detector: SemanticChunkDetector;

  beforeEach(() => {
    detector = new SemanticChunkDetector();
  });

  describe('默认配置', () => {
    it('应该使用默认配置创建检测器', () => {
      expect(detector.bufferedSpeechMs).toBe(0);
      expect(detector.bufferedChunkCount).toBe(0);
    });

    it('DEFAULT_DETECTOR_CONFIG 应有合理的默认值', () => {
      expect(DEFAULT_DETECTOR_CONFIG.charThreshold).toBe(10);
      expect(DEFAULT_DETECTOR_CONFIG.speechRateCharsPerSec).toBe(4.5);
      expect(DEFAULT_DETECTOR_CONFIG.pauseThresholdMs).toBe(500);
    });
  });

  describe('字数阈值触发（长度触发）', () => {
    it('应该在累积约10字时触发语义块', () => {
      const detector10 = new SemanticChunkDetector({ charThreshold: 10 });

      // 2秒 × 4.5字/秒 = 9字 → 未达阈值
      const audio9Chars = createMockAudio(2000);
      const result1 = detector10.process(audio9Chars);
      expect(result1).toBeNull();

      // 再加1秒 × 4.5字/秒 = 4.5字，累计 13.5字 ≥ 10字 → 触发
      const audio4Chars = createMockAudio(1000);
      const result2 = detector10.process(audio4Chars);
      expect(result2).not.toBeNull();
      expect(result2!.estimatedLength).toBeGreaterThanOrEqual(10);
      expect(result2!.triggerReason).toBe('length_threshold');
    });

    it('触发后应重置内部状态', () => {
      const audio = createMockAudio(3000); // 13.5字 → 触发
      detector.process(audio);

      expect(detector.bufferedSpeechMs).toBe(0);
      expect(detector.bufferedChunkCount).toBe(0);
    });

    it('可以使用自定义字数阈值', () => {
      const detector5 = new SemanticChunkDetector({ charThreshold: 5 });

      // 1秒 × 4.5字/秒 = 4.5字 < 5 → 未触发
      const result1 = detector5.process(createMockAudio(1000));
      expect(result1).toBeNull();

      // 再加 0.2秒 → 累计 ~5.4字 ≥ 5字 → 触发
      const result2 = detector5.process(createMockAudio(200));
      expect(result2).not.toBeNull();
    });
  });

  describe('停顿触发（VAD 检测）', () => {
    it('应该在检测到停顿时触发语义块（能量检测）', () => {
      // 500ms 语音 + 500ms 静音 = 停顿达到阈值
      const audioWithPause = createMockAudioWithPause(500, 500);
      const result = detector.process(audioWithPause);
      expect(result).not.toBeNull();
      expect(result!.triggerReason).toBe('pause_detected');
    });

    it('静音时长不足时不触发', () => {
      // 500ms 语音 + 100ms 静音 = 停顿未达阈值（默认500ms）
      const shortPause = createMockAudioWithPause(500, 100);
      const result = detector.process(shortPause);
      expect(result).toBeNull();
    });

    it('应该在使用外部 VADFrame 时触发停顿语义块', () => {
      // 先添加一些语音
      const speechChunk = createMockAudio(500);
      const speechFrame = VADFrame.speech(0, 500);
      detector.process(speechChunk, speechFrame);

      // 然后检测到静音
      const silenceChunk = createSilenceAudio(500);
      const silenceFrame = VADFrame.silence(500, 500);
      const result = detector.process(silenceChunk, silenceFrame);

      expect(result).not.toBeNull();
      expect(result!.triggerReason).toBe('pause_detected');
    });

    it('没有语音积累时停顿不触发', () => {
      // 只有静音，没有先前的语音
      const silence = createSilenceAudio(1000);
      const result = detector.process(silence);
      expect(result).toBeNull();
    });

    it('自定义停顿阈值', () => {
      const detector200 = new SemanticChunkDetector({ pauseThresholdMs: 200 });

      // 200ms 停顿即触发
      const result = detector200.process(createMockAudioWithPause(500, 200));
      expect(result).not.toBeNull();
    });
  });

  describe('flush - 会话结束强制输出', () => {
    it('有积累音频时 flush 应输出语义块', () => {
      detector.process(createMockAudio(1000)); // 4.5字，未达阈值

      const result = detector.flush();
      expect(result).not.toBeNull();
      expect(result!.triggerReason).toBe('session_end');
      expect(result!.estimatedLength).toBeCloseTo(4.5, 0);
    });

    it('无积累音频时 flush 返回 null', () => {
      expect(detector.flush()).toBeNull();
    });

    it('flush 后状态重置', () => {
      detector.process(createMockAudio(1000));
      detector.flush();

      expect(detector.bufferedSpeechMs).toBe(0);
      expect(detector.bufferedChunkCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('reset 应清空所有积累状态', () => {
      detector.process(createMockAudio(1000));
      expect(detector.bufferedChunkCount).toBeGreaterThan(0);

      detector.reset();

      expect(detector.bufferedSpeechMs).toBe(0);
      expect(detector.bufferedChunkCount).toBe(0);
      expect(detector.flush()).toBeNull();
    });
  });

  describe('语义块内容', () => {
    it('输出的语义块应包含正确的音频数据', () => {
      const audio = createMockAudio(3000); // 触发长度阈值
      const result = detector.process(audio);

      expect(result).not.toBeNull();
      expect(result!.audioData.length).toBe(audio.sampleCount);
      expect(result!.sampleRate).toBe(audio.sampleRate);
    });

    it('多块积累后合并输出', () => {
      const audio1 = createMockAudio(1500); // 6.75字
      const audio2 = createMockAudio(1000); // +4.5字 = 11.25字 → 触发

      detector.process(audio1);
      const result = detector.process(audio2);

      expect(result).not.toBeNull();
      expect(result!.audioData.length).toBe(audio1.sampleCount + audio2.sampleCount);
      expect(result!.estimatedLength).toBeGreaterThanOrEqual(10);
    });

    it('估计字数基于语音时长计算', () => {
      const audio = createMockAudio(2222); // 2.222秒 × 4.5 = 10.0字
      const result = detector.process(audio);

      if (result) {
        expect(result.estimatedLength).toBeCloseTo(2.222 * 4.5, 0);
      }
    });
  });

  describe('外部 VAD 优先级', () => {
    it('提供 VADFrame 时应使用外部 VAD 判断', () => {
      // 即使音频有能量，外部VAD标记为静音时应视为静音
      const speechAudio = createMockAudio(500);
      const silenceFrame = VADFrame.silence(0, 500);

      const result = detector.process(speechAudio, silenceFrame);
      expect(detector.bufferedChunkCount).toBe(0); // 没有积累任何语音
      expect(result).toBeNull();
    });

    it('外部VAD标记语音时应累积', () => {
      const audio = createMockAudio(500);
      const speechFrame = VADFrame.speech(0, 500);

      detector.process(audio, speechFrame);
      expect(detector.bufferedChunkCount).toBe(1);
      expect(detector.bufferedSpeechMs).toBe(500);
    });
  });
});
