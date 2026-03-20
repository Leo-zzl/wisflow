import { describe, it, expect, beforeEach } from 'vitest';
import { RecordingSession } from '../RecordingSession';
import { AudioChunk } from '../../value-objects/AudioChunk';

const makeSamples = (length: number): Float32Array =>
  new Float32Array(Array.from({ length }, (_, i) => Math.sin(i * 0.1)));

const makeChunk = (sampleCount = 1600, sampleRate = 16000, timestamp = 0): AudioChunk =>
  AudioChunk.create(makeSamples(sampleCount), sampleRate, timestamp);

describe('RecordingSession', () => {
  let session: RecordingSession;

  beforeEach(() => {
    session = RecordingSession.create('test-session-1');
  });

  describe('创建会话', () => {
    it('应该以 idle 状态创建会话', () => {
      expect(session.state).toBe('idle');
    });

    it('应该使用指定的 id', () => {
      expect(session.id).toBe('test-session-1');
    });

    it('应该自动生成 id（未指定时）', () => {
      const auto = RecordingSession.create();
      expect(auto.id).toBeTruthy();
      expect(auto.id).toMatch(/^session-\d+-/);
    });

    it('初始状态下没有块和时间信息', () => {
      expect(session.getChunks()).toHaveLength(0);
      expect(session.startTime).toBeNull();
      expect(session.endTime).toBeNull();
    });
  });

  describe('状态转换', () => {
    it('应该从 idle 启动录音', () => {
      session.start();
      expect(session.state).toBe('recording');
      expect(session.startTime).not.toBeNull();
    });

    it('应该从 recording 暂停', () => {
      session.start();
      session.pause();
      expect(session.state).toBe('paused');
    });

    it('应该从 paused 恢复录音', () => {
      session.start();
      session.pause();
      session.resume();
      expect(session.state).toBe('recording');
    });

    it('应该从 recording 停止', () => {
      session.start();
      session.stop();
      expect(session.state).toBe('stopped');
      expect(session.endTime).not.toBeNull();
    });

    it('应该从 paused 停止', () => {
      session.start();
      session.pause();
      session.stop();
      expect(session.state).toBe('stopped');
    });

    it('不能从 idle 直接暂停', () => {
      expect(() => session.pause()).toThrow('无效的状态转换');
    });

    it('不能从 idle 直接停止', () => {
      expect(() => session.stop()).toThrow('无效的状态转换');
    });

    it('不能从 stopped 重新启动', () => {
      session.start();
      session.stop();
      expect(() => session.start()).toThrow('无效的状态转换');
    });
  });

  describe('音频块管理', () => {
    it('应该在 recording 状态下添加音频块', () => {
      session.start();
      session.addChunk(makeChunk());
      expect(session.chunkCount).toBe(1);
    });

    it('应该按顺序累积多个音频块', () => {
      session.start();
      session.addChunk(makeChunk(1600, 16000, 0));
      session.addChunk(makeChunk(1600, 16000, 100));
      session.addChunk(makeChunk(1600, 16000, 200));
      expect(session.chunkCount).toBe(3);
    });

    it('不能在 idle 状态下添加音频块', () => {
      expect(() => session.addChunk(makeChunk())).toThrow('只能在录音状态下添加音频块');
    });

    it('不能在 paused 状态下添加音频块', () => {
      session.start();
      session.pause();
      expect(() => session.addChunk(makeChunk())).toThrow('只能在录音状态下添加音频块');
    });

    it('不能在 stopped 状态下添加音频块', () => {
      session.start();
      session.stop();
      expect(() => session.addChunk(makeChunk())).toThrow('只能在录音状态下添加音频块');
    });
  });

  describe('时长计算', () => {
    it('未启动时时长为0', () => {
      expect(session.getDurationMs()).toBe(0);
    });

    it('应该计算累积的音频时长', () => {
      session.start();
      session.addChunk(makeChunk(1600, 16000, 0));   // 100ms
      session.addChunk(makeChunk(1600, 16000, 100));  // 100ms
      expect(session.getTotalAudioDurationMs()).toBeCloseTo(200);
    });
  });

  describe('合并音频', () => {
    it('无音频块时返回 null', () => {
      expect(session.getMergedAudio()).toBeNull();
    });

    it('应该合并所有音频块', () => {
      session.start();
      session.addChunk(makeChunk(1600));
      session.addChunk(makeChunk(800));
      const merged = session.getMergedAudio();
      expect(merged).not.toBeNull();
      expect(merged!.length).toBe(2400);
    });

    it('应该按顺序合并音频数据', () => {
      session.start();
      const chunk1 = AudioChunk.create(new Float32Array([0.1, 0.2]), 16000, 0);
      const chunk2 = AudioChunk.create(new Float32Array([0.3, 0.4]), 16000, 1);
      session.addChunk(chunk1);
      session.addChunk(chunk2);

      const merged = session.getMergedAudio();
      expect(merged![0]).toBeCloseTo(0.1);
      expect(merged![1]).toBeCloseTo(0.2);
      expect(merged![2]).toBeCloseTo(0.3);
      expect(merged![3]).toBeCloseTo(0.4);
    });
  });

  describe('活跃状态', () => {
    it('idle 状态下 isActive 为 false', () => {
      expect(session.isActive()).toBe(false);
    });

    it('recording 状态下 isActive 为 true', () => {
      session.start();
      expect(session.isActive()).toBe(true);
    });

    it('paused 状态下 isActive 为 true', () => {
      session.start();
      session.pause();
      expect(session.isActive()).toBe(true);
    });

    it('stopped 状态下 isActive 为 false', () => {
      session.start();
      session.stop();
      expect(session.isActive()).toBe(false);
    });
  });

  describe('采样率', () => {
    it('无音频块时 getSampleRate 返回 null', () => {
      expect(session.getSampleRate()).toBeNull();
    });

    it('应该返回第一个音频块的采样率', () => {
      session.start();
      session.addChunk(makeChunk(1600, 16000));
      expect(session.getSampleRate()).toBe(16000);
    });
  });
});
