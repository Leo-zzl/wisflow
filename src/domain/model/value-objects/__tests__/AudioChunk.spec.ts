import { describe, it, expect } from 'vitest';
import { AudioChunk } from '../AudioChunk';

function makeSamples(count: number, value = 0.5): Float32Array {
  return new Float32Array(count).fill(value);
}

describe('AudioChunk', () => {
  describe('创建', () => {
    it('应该创建有效音频块', () => {
      const chunk = new AudioChunk({ data: makeSamples(16000), sampleRate: 16000 });
      expect(chunk.sampleRate).toBe(16000);
      expect(chunk.channels).toBe(1);
    });

    it('应该拒绝空数据', () => {
      expect(() => new AudioChunk({ data: new Float32Array(0), sampleRate: 16000 })).toThrow(
        '音频数据不能为空'
      );
    });

    it('应该拒绝无效采样率', () => {
      expect(() => new AudioChunk({ data: makeSamples(100), sampleRate: 0 })).toThrow(
        '采样率必须大于0'
      );
    });

    it('应该支持多声道', () => {
      const chunk = new AudioChunk({ data: makeSamples(32000), sampleRate: 16000, channels: 2 });
      expect(chunk.channels).toBe(2);
    });
  });

  describe('durationMs', () => {
    it('应该正确计算单声道时长', () => {
      // 16000 samples / 16000 Hz = 1000ms
      const chunk = new AudioChunk({ data: makeSamples(16000), sampleRate: 16000 });
      expect(chunk.durationMs).toBe(1000);
    });

    it('应该正确计算双声道时长', () => {
      // 32000 samples / 2ch / 16000 Hz = 1000ms
      const chunk = new AudioChunk({ data: makeSamples(32000), sampleRate: 16000, channels: 2 });
      expect(chunk.durationMs).toBe(1000);
    });
  });

  describe('toWav', () => {
    it('应该生成有效的 WAV 文件头', () => {
      const chunk = new AudioChunk({ data: makeSamples(1000), sampleRate: 16000 });
      const wav = chunk.toWav();

      // RIFF 魔数
      expect(wav[0]).toBe(0x52); // R
      expect(wav[1]).toBe(0x49); // I
      expect(wav[2]).toBe(0x46); // F
      expect(wav[3]).toBe(0x46); // F
      // WAVE 标识
      expect(wav[8]).toBe(0x57); // W
      expect(wav[9]).toBe(0x41); // A
      expect(wav[10]).toBe(0x56); // V
      expect(wav[11]).toBe(0x45); // E
    });

    it('WAV 文件大小应为 44字节头 + PCM数据', () => {
      const samples = 1000;
      const chunk = new AudioChunk({ data: makeSamples(samples), sampleRate: 16000 });
      const wav = chunk.toWav();
      expect(wav.length).toBe(44 + samples * 2);
    });

    it('应该正确裁剪超出范围的样本值', () => {
      const data = new Float32Array([-2.0, 2.0, 0.0]);
      const chunk = new AudioChunk({ data, sampleRate: 16000 });
      const wav = chunk.toWav();
      // PCM 数据从偏移 44 开始，每个样本 2 字节
      const view = new DataView(wav.buffer);
      const s0 = view.getInt16(44, true);
      const s1 = view.getInt16(46, true);
      const s2 = view.getInt16(48, true);
      expect(s0).toBe(-32768); // min int16
      expect(s1).toBe(32767);  // max int16
      expect(s2).toBe(0);
    });
  });
});
