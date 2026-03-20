import { AudioChunk } from '../value-objects/AudioChunk';

const SAMPLE_RATE = 16000;
const SPEECH_AMPLITUDE = 0.3;

/**
 * 创建指定时长的模拟语音音频块（正弦波）
 */
export function createMockAudio(durationMs: number, sampleRate = SAMPLE_RATE): AudioChunk {
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const data = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = SPEECH_AMPLITUDE * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  return AudioChunk.create(data, sampleRate, Date.now());
}

/**
 * 创建语音+停顿的模拟音频块
 * @param speechMs 语音时长（ms）
 * @param silenceMs 静音时长（ms）
 */
export function createMockAudioWithPause(
  speechMs: number,
  silenceMs: number,
  sampleRate = SAMPLE_RATE
): AudioChunk {
  const speechSamples = Math.floor((sampleRate * speechMs) / 1000);
  const silenceSamples = Math.floor((sampleRate * silenceMs) / 1000);
  const total = speechSamples + silenceSamples;

  const data = new Float32Array(total);
  for (let i = 0; i < speechSamples; i++) {
    data[i] = SPEECH_AMPLITUDE * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  // silence: data[speechSamples..total] stays 0

  return new AudioChunk({
    data,
    sampleRate,
    channels: 1,
    timestamp: Date.now(),
    durationMs: speechMs + silenceMs,
  });
}

/**
 * 创建纯静音音频块
 */
export function createSilenceAudio(durationMs: number, sampleRate = SAMPLE_RATE): AudioChunk {
  const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const data = new Float32Array(sampleCount);
  return new AudioChunk({
    data,
    sampleRate,
    channels: 1,
    timestamp: Date.now(),
    durationMs,
  });
}
