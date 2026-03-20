import { ModelPolicyType } from '@domain/config/entities/UserConfig';
import { STTStrategy, STTStrategyType } from '../ports/STTStrategy';
import { AudioChunk } from '../value-objects/AudioChunk';
import { TranscriptionResult } from '../value-objects/TranscriptionResult';

class FallbackSTTStrategy implements STTStrategy {
  readonly strategyType: STTStrategyType;

  constructor(
    private readonly primary: STTStrategy,
    private readonly fallback: STTStrategy
  ) {
    this.strategyType = primary.strategyType;
  }

  async transcribe(chunk: AudioChunk): Promise<TranscriptionResult> {
    try {
      return await this.primary.transcribe(chunk);
    } catch {
      return await this.fallback.transcribe(chunk);
    }
  }

  async isAvailable(): Promise<boolean> {
    return (await this.primary.isAvailable()) || (await this.fallback.isAvailable());
  }
}

export class ModelRegistry {
  private readonly sttStrategies = new Map<STTStrategyType, STTStrategy>();

  registerSTT(strategy: STTStrategy): void {
    this.sttStrategies.set(strategy.strategyType, strategy);
  }

  hasSTT(type: STTStrategyType): boolean {
    return this.sttStrategies.has(type);
  }

  async resolveSTT(policy: ModelPolicyType): Promise<STTStrategy> {
    switch (policy) {
      case 'cloud':
        return this.requireSTT('cloud');

      case 'local':
        return this.requireSTT('local');

      case 'auto': {
        const cloud = this.sttStrategies.get('cloud');
        if (cloud && (await cloud.isAvailable())) return cloud;
        return this.requireSTT('local');
      }

      case 'hybrid': {
        const primary = this.requireSTT('cloud');
        const fallback = this.requireSTT('local');
        return new FallbackSTTStrategy(primary, fallback);
      }
    }
  }

  private requireSTT(type: STTStrategyType): STTStrategy {
    const strategy = this.sttStrategies.get(type);
    if (!strategy) throw new Error(`未注册的STT策略: ${type}`);
    return strategy;
  }
}
