import { AudioChunk } from '../value-objects/AudioChunk';
import { VADFrame } from '../value-objects/VADFrame';

export interface VADService {
  /**
   * 分析音频块，返回 VAD 结果帧
   */
  analyze(chunk: AudioChunk): Promise<VADFrame>;

  /**
   * 是否已就绪（模型已加载）
   */
  isReady(): boolean;

  /**
   * 初始化 VAD（加载模型）
   */
  initialize(): Promise<void>;

  /**
   * 释放资源
   */
  destroy(): void;
}
