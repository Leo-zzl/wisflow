import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

      render(<SettingsPanel repo={repo} />);

      await waitFor(() => {
        expect(screen.getByText(/Ctrl\+Shift\+V/i)).toBeInTheDocument();
      });
    });

    it('打开设置面板时应显示当前润色风格', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      await waitFor(() => {
        // 默认为 light（轻度去口水）
        expect(screen.getByDisplayValue('light')).toBeInTheDocument();
      });
    });

    it('配置加载失败时应显示默认配置', async () => {
      const repo = makeRepo();
      (repo.load as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      render(<SettingsPanel repo={repo} />);

      await waitFor(() => {
        expect(screen.getByText(/Ctrl\+Shift\+V/i)).toBeInTheDocument();
      });
    });
  });

  describe('修改润色风格', () => {
    it('用户修改润色风格后应自动保存到持久化存储', async () => {
      const user = userEvent.setup();
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);
      await waitFor(() => screen.getByDisplayValue('light'));

      await user.selectOptions(screen.getByRole('combobox', { name: /润色风格/i }), 'deep');

      await waitFor(() => {
        expect(repo.save).toHaveBeenCalledTimes(1);
        const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as UserConfig;
        expect(saved.polish.style).toBe('deep');
      });
    });

    it('选择深度精炼风格后下拉框应显示新选择', async () => {
      const user = userEvent.setup();
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);
      await waitFor(() => screen.getByDisplayValue('light'));

      await user.selectOptions(screen.getByRole('combobox', { name: /润色风格/i }), 'deep');

      expect(screen.getByDisplayValue('deep')).toBeInTheDocument();
    });
  });

  describe('界面结构', () => {
    it('应显示面板标题', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /WisFlow 设置/i })).toBeInTheDocument();
      });
    });
  });
});
