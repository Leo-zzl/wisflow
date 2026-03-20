import { describe, it, expect, vi } from 'vitest';
import { ModelRegistry } from '../ModelRegistry';
import { STTStrategy } from '../../ports/STTStrategy';
import { AudioChunk } from '../../value-objects/AudioChunk';
import { TranscriptionResult } from '../../value-objects/TranscriptionResult';

function makeStrategy(type: 'cloud' | 'local', available = true): STTStrategy {
  return {
    strategyType: type,
    transcribe: vi.fn().mockResolvedValue(new TranscriptionResult({ text: `${type}结果`, durationMs: 500 })),
    isAvailable: vi.fn().mockResolvedValue(available),
  };
}

function makeSamples(count = 16000): Float32Array {
  return new Float32Array(count).fill(0.1);
}

describe('ModelRegistry', () => {
  describe('registerSTT / hasSTT', () => {
    it('注册后应能查询到策略', () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud'));
      expect(registry.hasSTT('cloud')).toBe(true);
      expect(registry.hasSTT('local')).toBe(false);
    });
  });

  describe('resolveSTT', () => {
    it("'cloud' 策略应返回云端实例", async () => {
      const registry = new ModelRegistry();
      const cloud = makeStrategy('cloud');
      registry.registerSTT(cloud);
      const resolved = await registry.resolveSTT('cloud');
      expect(resolved.strategyType).toBe('cloud');
    });

    it("'local' 策略应返回本地实例", async () => {
      const registry = new ModelRegistry();
      const local = makeStrategy('local');
      registry.registerSTT(local);
      const resolved = await registry.resolveSTT('local');
      expect(resolved.strategyType).toBe('local');
    });

    it("未注册时请求 'cloud' 应抛出错误", async () => {
      const registry = new ModelRegistry();
      await expect(registry.resolveSTT('cloud')).rejects.toThrow('未注册的STT策略: cloud');
    });

    it("'auto' 在云端可用时应返回云端策略", async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud', true));
      registry.registerSTT(makeStrategy('local', true));
      const resolved = await registry.resolveSTT('auto');
      expect(resolved.strategyType).toBe('cloud');
    });

    it("'auto' 在云端不可用时应回退到本地策略", async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud', false));
      registry.registerSTT(makeStrategy('local', true));
      const resolved = await registry.resolveSTT('auto');
      expect(resolved.strategyType).toBe('local');
    });

    it("'auto' 仅有本地时应返回本地策略", async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('local', true));
      const resolved = await registry.resolveSTT('auto');
      expect(resolved.strategyType).toBe('local');
    });

    it("'hybrid' 应返回具备回退能力的复合策略", async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud'));
      registry.registerSTT(makeStrategy('local'));
      const resolved = await registry.resolveSTT('hybrid');
      // 复合策略能正常转录
      const chunk = new AudioChunk({ data: makeSamples(), sampleRate: 16000 });
      const result = await resolved.transcribe(chunk);
      expect(result.text).toContain('cloud结果'); // 优先用云端
    });
  });

  describe('FallbackSTTStrategy（通过 hybrid 获取）', () => {
    it('主策略失败时应使用后备策略', async () => {
      const registry = new ModelRegistry();
      const failingCloud: STTStrategy = {
        strategyType: 'cloud',
        transcribe: vi.fn().mockRejectedValue(new Error('网络错误')),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const local = makeStrategy('local');
      registry.registerSTT(failingCloud);
      registry.registerSTT(local);

      const hybrid = await registry.resolveSTT('hybrid');
      const chunk = new AudioChunk({ data: makeSamples(), sampleRate: 16000 });
      const result = await hybrid.transcribe(chunk);
      expect(result.text).toBe('local结果');
    });

    it('复合策略 isAvailable：任一可用即为 true', async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud', false));
      registry.registerSTT(makeStrategy('local', true));
      const hybrid = await registry.resolveSTT('hybrid');
      expect(await hybrid.isAvailable()).toBe(true);
    });

    it('复合策略 isAvailable：全不可用时为 false', async () => {
      const registry = new ModelRegistry();
      registry.registerSTT(makeStrategy('cloud', false));
      registry.registerSTT(makeStrategy('local', false));
      const hybrid = await registry.resolveSTT('hybrid');
      expect(await hybrid.isAvailable()).toBe(false);
    });
  });
});
