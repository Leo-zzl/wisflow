import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { UserConfig } from '@domain/config/entities/UserConfig';
import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import { invoke } from '@tauri-apps/api/core';

// 模拟 Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

function makeRepo(config = UserConfig.createDefault()): ConfigRepository {
  return {
    load: vi.fn().mockResolvedValue(config),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('快捷键设置', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  describe('快捷键捕获', () => {
    it('用户点击快捷键区域时区域应获得焦点并显示当前快捷键', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');
      expect(shortcutArea).toHaveAttribute('tabIndex', '0');
      expect(shortcutArea).toHaveTextContent('Ctrl+Shift+V');
    });

    it('用户在快捷键区域按下组合键后应显示新快捷键', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      // 模拟按下 Ctrl+Alt+V
      fireEvent.keyDown(shortcutArea, {
        key: 'v',
        ctrlKey: true,
        altKey: true,
      });

      expect(shortcutArea).toHaveTextContent('Ctrl+Alt+V');
    });

    it('快捷键区域按下纯修饰键时不应触发快捷键捕获', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      // 单独按下 Ctrl
      fireEvent.keyDown(shortcutArea, {
        key: 'Control',
        ctrlKey: true,
      });

      // 应仍显示原快捷键
      expect(shortcutArea).toHaveTextContent('Ctrl+Shift+V');
    });

    it('快捷键区域按下 Shift 修饰键时不应触发快捷键捕获', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'Shift',
        shiftKey: true,
      });

      expect(shortcutArea).toHaveTextContent('Ctrl+Shift+V');
    });
  });

  describe('冲突检测', () => {
    it('用户输入新快捷键后应显示"检测中"状态', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'F12',
        ctrlKey: true,
      });

      // 立即检查应显示检测中（因为防抖时间内会显示checking）
      expect(screen.getByTestId('shortcut-checking')).toBeInTheDocument();
    });

    it('新快捷键与其他应用冲突时应显示警告图标', async () => {
      mockInvoke.mockRejectedValue(new Error('快捷键已被占用'));

      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'F1',
        ctrlKey: true,
        shiftKey: true,
      });

      // 等待防抖时间 + 异步操作完成
      await waitFor(
        () => {
          expect(screen.getByTestId('shortcut-conflict')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    }, 10000);

    it('新快捷键无冲突时应显示成功图标', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'X',
        ctrlKey: true,
        altKey: true,
      });

      // 等待防抖时间 + 异步操作完成
      await waitFor(
        () => {
          expect(screen.getByTestId('shortcut-ok')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    }, 10000);
  });

  describe('自动保存', () => {
    it('快捷键注册成功时应自动保存到配置存储', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'M',
        ctrlKey: true,
        shiftKey: true,
      });

      // 等待防抖时间 + 异步操作完成
      await waitFor(
        () => {
          expect(repo.save).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // 验证保存的配置包含新快捷键
      const savedConfig = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as UserConfig;
      expect(savedConfig.shortcut.triggerKey).toBe('M');
      expect(savedConfig.shortcut.modifiers).toContain('Control');
      expect(savedConfig.shortcut.modifiers).toContain('Shift');
    }, 10000);

    it('快捷键注册失败时不应保存配置', async () => {
      mockInvoke.mockRejectedValue(new Error('冲突'));

      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'F1',
        ctrlKey: true,
      });

      // 等待足够长时间确保防抖已触发
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(repo.save).not.toHaveBeenCalled();
    }, 10000);
  });

  describe('调用 Tauri 命令', () => {
    it('检测到新快捷键时应调用 update_shortcut 命令', async () => {
      const repo = makeRepo();

      render(<SettingsPanel repo={repo} />);

      const shortcutArea = screen.getByTestId('shortcut-capture-area');

      fireEvent.keyDown(shortcutArea, {
        key: 'Z',
        ctrlKey: true,
        altKey: true,
      });

      // 等待防抖时间
      await waitFor(
        () => {
          expect(mockInvoke).toHaveBeenCalledWith('update_shortcut', {
            newShortcut: 'Ctrl+Alt+Z',
          });
        },
        { timeout: 3000 }
      );
    }, 10000);
  });
});
