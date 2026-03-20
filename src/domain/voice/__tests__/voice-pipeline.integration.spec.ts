import { describe, it, expect, beforeEach } from 'vitest';
import { RecordingSession } from '../entities/RecordingSession';
import { SemanticChunkDetector } from '../services/SemanticChunkDetector';
import { SemanticChunk } from '../value-objects/SemanticChunk';
import { VADFrame } from '../value-objects/VADFrame';
import {
  createMockAudio,
  createMockAudioWithPause,
  createSilenceAudio,
} from './audioTestUtils';

/**
 * 集成测试：录音会话 + 语义切分流程
 */
describe('录音 + 语义切分集成测试', () => {
  let session: RecordingSession;
  let detector: SemanticChunkDetector;

  beforeEach(() => {
    session = RecordingSession.create('integration-test');
    detector = new SemanticChunkDetector();
  });

  it('按住模式：说话达到字数阈值时自动切分', () => {
    session.start();

    const semanticChunks: SemanticChunk[] = [];

    // 模拟持续说话 3 秒（13.5字），应在某时刻触发
    const chunk1 = createMockAudio(1500); // 6.75字
    session.addChunk(chunk1);
    const result1 = detector.process(chunk1);
    if (result1) semanticChunks.push(result1);

    const chunk2 = createMockAudio(1500); // +6.75字 = 13.5字 → 触发
    session.addChunk(chunk2);
    const result2 = detector.process(chunk2);
    if (result2) semanticChunks.push(result2);

    expect(semanticChunks.length).toBe(1);
    expect(semanticChunks[0].triggerReason).toBe('length_threshold');
    expect(semanticChunks[0].estimatedLength).toBeGreaterThanOrEqual(10);
    expect(session.chunkCount).toBe(2);
  });

  it('按住模式：停顿时触发语义切分', () => {
    session.start();

    const semanticChunks: SemanticChunk[] = [];

    // 说 500ms 然后停顿 500ms
    const chunkWithPause = createMockAudioWithPause(500, 500);
    session.addChunk(chunkWithPause);
    const result = detector.process(chunkWithPause);
    if (result) semanticChunks.push(result);

    expect(semanticChunks.length).toBe(1);
    expect(semanticChunks[0].triggerReason).toBe('pause_detected');
  });

  it('松开快捷键时 flush 输出剩余音频', () => {
    session.start();

    // 说1秒，未达阈值
    const chunk = createMockAudio(1000);
    session.addChunk(chunk);
    const result1 = detector.process(chunk);
    expect(result1).toBeNull();

    // 录音结束
    session.stop();
    const flushed = detector.flush();

    expect(flushed).not.toBeNull();
    expect(flushed!.triggerReason).toBe('session_end');
  });

  it('多个语义块顺序正确', () => {
    session.start();
    const emitted: SemanticChunk[] = [];

    // 第一个语义块：3秒语音
    const audio1 = createMockAudio(3000);
    session.addChunk(audio1);
    const s1 = detector.process(audio1);
    if (s1) emitted.push(s1);

    // 第二个语义块：1.5秒 + 停顿
    const audio2 = createMockAudioWithPause(1500, 500);
    session.addChunk(audio2);
    const s2 = detector.process(audio2);
    if (s2) emitted.push(s2);

    // flush 最后剩余
    session.stop();
    const s3 = detector.flush();
    if (s3) emitted.push(s3);

    expect(emitted.length).toBeGreaterThanOrEqual(2);
    expect(emitted[0].triggerReason).toBe('length_threshold');
  });

  it('外部 VAD 驱动的流程', () => {
    session.start();
    const emitted: SemanticChunk[] = [];

    // 模拟外部 VAD 控制：语音帧
    for (let i = 0; i < 5; i++) {
      const chunk = createMockAudio(500); // 2.25字/次
      const frame = VADFrame.speech(i * 500, 500);
      session.addChunk(chunk);
      const result = detector.process(chunk, frame);
      if (result) emitted.push(result);
    }
    // 5次 × 2.25字 = 11.25字 → 应触发一次

    expect(emitted.length).toBe(1);
    expect(emitted[0].triggerReason).toBe('length_threshold');
  });

  it('VAD 静音后的停顿触发', () => {
    session.start();
    const emitted: SemanticChunk[] = [];

    // 语音阶段
    const speechChunk = createMockAudio(1000);
    session.addChunk(speechChunk);
    detector.process(speechChunk, VADFrame.speech(0, 1000));

    // 静音阶段（500ms触发停顿）
    const silenceChunk = createSilenceAudio(500);
    const result = detector.process(silenceChunk, VADFrame.silence(1000, 500));
    if (result) emitted.push(result);

    expect(emitted.length).toBe(1);
    expect(emitted[0].triggerReason).toBe('pause_detected');
    expect(emitted[0].estimatedLength).toBeCloseTo(4.5, 0);
  });

  it('录音会话状态与检测器生命周期一致', () => {
    // 开始录音
    session.start();
    expect(session.state).toBe('recording');

    // 积累一些数据
    const chunk = createMockAudio(1000);
    session.addChunk(chunk);
    detector.process(chunk);

    // 停止录音，flush 检测器
    session.stop();
    expect(session.state).toBe('stopped');

    const flushed = detector.flush();
    expect(flushed).not.toBeNull();

    // 录音会话包含音频数据
    expect(session.getMergedAudio()).not.toBeNull();
    expect(session.chunkCount).toBe(1);
  });
});
