export interface AudioChunkProps {
  data: Float32Array;
  sampleRate: number;
  channels?: number;
}

export class AudioChunk {
  readonly data: Float32Array;
  readonly sampleRate: number;
  readonly channels: number;

  constructor(props: AudioChunkProps) {
    if (props.data.length === 0) throw new Error('音频数据不能为空');
    if (props.sampleRate <= 0) throw new Error('采样率必须大于0');

    this.data = props.data;
    this.sampleRate = props.sampleRate;
    this.channels = props.channels ?? 1;
  }

  /** 音频时长（毫秒） */
  get durationMs(): number {
    return (this.data.length / this.channels / this.sampleRate) * 1000;
  }

  /** 将 PCM Float32 数据编码为 WAV 格式 */
  toWav(): Uint8Array {
    const pcm = this.float32ToInt16(this.data);
    const header = this.createWavHeader(pcm.length, this.sampleRate, this.channels);
    const wav = new Uint8Array(header.length + pcm.buffer.byteLength);
    wav.set(header);
    wav.set(new Uint8Array(pcm.buffer), header.length);
    return wav;
  }

  private float32ToInt16(data: Float32Array): Int16Array {
    const result = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }

  private createWavHeader(pcmLength: number, sampleRate: number, channels: number): Uint8Array {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;
    const dataLength = pcmLength * 2;

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16-bit
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return new Uint8Array(buffer);
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
