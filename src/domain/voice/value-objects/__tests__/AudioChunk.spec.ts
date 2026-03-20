import { describe, it, expect } from 'vitest';
import { AudioChunk } from '../AudioChunk';

describe('AudioChunk', () => {
  const makeSamples = (length: number): Float32Array =>
    new Float32Array(Array.from({ length }, (_, i) => Math.sin(i * 0.1)));

  describe('创建音频块', () => {
    it('应该使用有效参数创建音频块', () => {
      const data = makeSamples(1600);
      const chunk = new AudioChunk({
        data,
        sampleRate: 16000,
        channels: 1,
        timestamp: 1000,
        durationMs: 100,
      });

      expect(chunk.sampleRate).toBe(16000);
      expect(chunk.channels).toBe(1);
      expect(chunk.timestamp).toBe(1000);
      expect(chunk.durationMs).toBe(100);
      expect(chunk.sampleCount).toBe(1600);
    });

    it('应该通过 create 工厂方法创建音频块并自动计算时长', () => {
      const data = makeSamples(1600);
      const chunk = AudioChunk.create(data, 16000, 0);

      expect(chunk.durationMs).toBeCloseTo(100);
      expect(chunk.channels).toBe(1);
    });

    it('应该复制传入的 Float32Array 数据', () => {
      const data = makeSamples(100);
      const chunk = new AudioChunk({
        data,
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        durationMs: 10,
      });

      data[0] = 999;
      expect(chunk.data[0]).not.toBe(999);
    });
  });

  describe('验证参数', () => {
    it('应该拒绝空的音频数据', () => {
      expect(
        () =>
          new AudioChunk({
            data: new Float32Array(0),
            sampleRate: 16000,
            channels: 1,
            timestamp: 0,
            durationMs: 100,
          })
      ).toThrow('音频数据不能为空');
    });

    it('应该拒绝零采样率', () => {
      expect(
        () =>
          new AudioChunk({
            data: makeSamples(100),
            sampleRate: 0,
            channels: 1,
            timestamp: 0,
            durationMs: 100,
          })
      ).toThrow('采样率必须大于0');
    });

    it('应该拒绝零声道数', () => {
      expect(
        () =>
          new AudioChunk({
            data: makeSamples(100),
            sampleRate: 16000,
            channels: 0,
            timestamp: 0,
            durationMs: 100,
          })
      ).toThrow('声道数必须大于0');
    });

    it('应该拒绝负时间戳', () => {
      expect(
        () =>
          new AudioChunk({
            data: makeSamples(100),
            sampleRate: 16000,
            channels: 1,
            timestamp: -1,
            durationMs: 100,
          })
      ).toThrow('时间戳不能为负数');
    });

    it('应该拒绝零时长', () => {
      expect(
        () =>
          new AudioChunk({
            data: makeSamples(100),
            sampleRate: 16000,
            channels: 1,
            timestamp: 0,
            durationMs: 0,
          })
      ).toThrow('时长必须大于0');
    });
  });
});
