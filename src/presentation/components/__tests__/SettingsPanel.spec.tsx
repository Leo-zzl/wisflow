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

      // waitFor：等待 useEffect 中的异步加载完成（默认配置与加载结果相同）
      await waitFor(() => {
        expect(screen.getByText('Ctrl+Shift+V')).toBeInTheDocument();
      });
    });

    it('打开设置面板时应显示当前润色风格选择器', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /润色风格/i })).toBeInTheDocument();
      });
    });

    it('润色风格选择器初始值应与配置一致', () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      // 初始渲染即使用默认配置，select.value 立即可读
      expect(screen.getByRole('combobox', { name: /润色风格/i })).toHaveValue('light');
    });

    it('配置加载失败时应显示默认快捷键', () => {
      const repo = makeRepo();
      (repo.load as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      render(<SettingsPanel repo={repo} />);

      // 加载失败时 useEffect 不调用 setConfig，保留初始默认值
      expect(screen.getByText('Ctrl+Shift+V')).toBeInTheDocument();
    });
  });

  describe('修改润色风格', () => {
    it('用户修改润色风格后应自动保存到持久化存储', async () => {
      const user = userEvent.setup();
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /润色风格/i }), 'deep');

      await waitFor(() => {
        expect(repo.save).toHaveBeenCalledTimes(1);
        const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as UserConfig;
        expect(saved.polish.style).toBe('deep');
      });
    });

    it('选择深度精炼风格后选择器应显示新选择', async () => {
      const user = userEvent.setup();
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /润色风格/i }), 'deep');

      expect(screen.getByRole('combobox', { name: /润色风格/i })).toHaveValue('deep');
    });
  });

  describe('界面结构', () => {
    it('应显示面板标题', () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      expect(screen.getByRole('heading', { name: /WisFlow 设置/i })).toBeInTheDocument();
    });
  });
});
