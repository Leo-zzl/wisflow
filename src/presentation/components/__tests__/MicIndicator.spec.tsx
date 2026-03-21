import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MicIndicator } from '../MicIndicator';

describe('麦克风浮标', () => {
  describe('可见性', () => {
    it('空闲状态下浮标不可见', () => {
      render(<MicIndicator status="idle" />);

      expect(screen.getByTestId('mic-indicator')).not.toBeVisible();
    });

    it('录音中状态下浮标可见', () => {
      render(<MicIndicator status="recording" />);

      expect(screen.getByTestId('mic-indicator')).toBeVisible();
    });

    it('处理中状态下浮标可见', () => {
      render(<MicIndicator status="processing" />);

      expect(screen.getByTestId('mic-indicator')).toBeVisible();
    });
  });

  describe('呼吸动画', () => {
    it('录音中状态下麦克风圆圈显示呼吸动画', () => {
      render(<MicIndicator status="recording" />);

      expect(screen.getByTestId('mic-circle')).toHaveClass('animate-mic-pulse');
    });

    it('处理中状态下麦克风圆圈不显示呼吸动画', () => {
      render(<MicIndicator status="processing" />);

      expect(screen.getByTestId('mic-circle')).not.toHaveClass('animate-mic-pulse');
    });

    it('空闲状态下麦克风圆圈不显示呼吸动画', () => {
      render(<MicIndicator status="idle" />);

      expect(screen.getByTestId('mic-circle')).not.toHaveClass('animate-mic-pulse');
    });
  });

  describe('品牌配色', () => {
    it('麦克风圆圈使用锈铁红品牌色', () => {
      render(<MicIndicator status="recording" />);

      // 验证圆圈使用了锈铁红色（Tailwind rust-600 = #B7410E）
      expect(screen.getByTestId('mic-circle')).toHaveClass('bg-rust-600');
    });
  });

  describe('无障碍', () => {
    it('录音中状态下应有录音中的语义标注', () => {
      render(<MicIndicator status="recording" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
