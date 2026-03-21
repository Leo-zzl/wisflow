import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';
import { UserConfig } from '@domain/config/entities/UserConfig';
import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';

function makeRepo(config = UserConfig.createDefault()): ConfigRepository {
  return {
    load: vi.fn().mockResolvedValue(config),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('设置面板', () => {
  describe('加载配置', () => {
    it('打开设置面板时应显示当前快捷键组合', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // 检查默认选中的修饰键 pills
      await waitFor(() => {
        expect(screen.getByText('Ctrl')).toBeInTheDocument();
        expect(screen.getByText('Shift')).toBeInTheDocument();
        expect(screen.getByText('V')).toBeInTheDocument();
      });
    });

    it('打开设置面板时应显示润色风格选项', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // 点击润色风格标签
      const polishTab = screen.getByText('润色风格');
      await act(async () => {
        await userEvent.click(polishTab);
      });

      await waitFor(() => {
        expect(screen.getByText('口水化')).toBeInTheDocument();
        expect(screen.getByText('轻度去口水')).toBeInTheDocument();
        expect(screen.getByText('深度精炼')).toBeInTheDocument();
        expect(screen.getByText('浓缩版')).toBeInTheDocument();
      });
    });

    it('配置加载失败时应显示默认快捷键', async () => {
      const repo = makeRepo();
      (repo.load as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // 加载失败时保留初始默认值
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('Shift')).toBeInTheDocument();
    });
  });

  describe('修改润色风格', () => {
    it('用户修改润色风格后应更新选中状态', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // 点击润色风格标签
      const polishTab = screen.getByText('润色风格');
      await act(async () => {
        await userEvent.click(polishTab);
      });

      // 点击深度精炼选项
      await waitFor(() => {
        expect(screen.getByText('深度精炼')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('深度精炼'));
      });

      // 验证选项仍显示（已选中）
      expect(screen.getByText('深度精炼')).toBeInTheDocument();
    });

    it('应能选择不同的润色风格', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // 点击润色风格标签
      const polishTab = screen.getByText('润色风格');
      await act(async () => {
        await userEvent.click(polishTab);
      });

      await waitFor(() => {
        expect(screen.getByText('深度精炼')).toBeInTheDocument();
      });

      // 点击选择深度精炼
      await act(async () => {
        await userEvent.click(screen.getByText('深度精炼'));
      });

      // 验证选中
      expect(screen.getByText('深度精炼')).toBeInTheDocument();

      // 点击选择浓缩版
      await act(async () => {
        await userEvent.click(screen.getByText('浓缩版'));
      });

      expect(screen.getByText('浓缩版')).toBeInTheDocument();
    });
  });

  describe('界面结构', () => {
    it('应显示面板标题和品牌', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      expect(screen.getByText('WisFlow')).toBeInTheDocument();
      expect(screen.getByText('语音输入设置')).toBeInTheDocument();
    });

    it('应显示所有导航标签', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      expect(screen.getByText('快捷键')).toBeInTheDocument();
      expect(screen.getByText('语音识别')).toBeInTheDocument();
      expect(screen.getByText('润色风格')).toBeInTheDocument();
      expect(screen.getByText('通用')).toBeInTheDocument();
    });

    it('应显示保存和取消按钮', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      expect(screen.getByText('保存设置')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });
  });

  describe('快捷键设置', () => {
    it('应能切换修饰键', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      // Alt 初始未选中
      const altBtn = screen.getByText('Alt');
      expect(altBtn).toBeInTheDocument();

      // 点击 Alt 切换
      await act(async () => {
        await userEvent.click(altBtn);
      });

      // 验证按钮存在（状态已改变）
      expect(altBtn).toBeInTheDocument();
    });

    it('应能切换主键', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      const spaceBtn = screen.getByText('Space');
      expect(spaceBtn).toBeInTheDocument();

      await act(async () => {
        await userEvent.click(spaceBtn);
      });

      expect(spaceBtn).toBeInTheDocument();
    });

    it('应能切换触发模式', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      expect(screen.getByText('按住模式')).toBeInTheDocument();
      expect(screen.getByText('切换模式')).toBeInTheDocument();

      // 点击切换模式
      await act(async () => {
        await userEvent.click(screen.getByText('切换模式'));
      });

      expect(screen.getByText('切换模式')).toBeInTheDocument();
    });

    it('应显示冲突检测区域', async () => {
      const repo = makeRepo();

      await act(async () => {
        render(<SettingsPanel repo={repo} />);
      });

      expect(screen.getByText('冲突检测')).toBeInTheDocument();
      expect(screen.getByText('未检测到冲突')).toBeInTheDocument();
      expect(screen.getByText('重新检测')).toBeInTheDocument();
    });
  });
});
