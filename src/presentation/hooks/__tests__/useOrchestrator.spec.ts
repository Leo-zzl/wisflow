import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrchestrator, OrchestratorFacade, ListenFn } from '../useOrchestrator';
import { useRecordingStore } from '../../stores/recordingStore';

type EventHandler = () => Promise<void> | void;

function makeOrchestrator(): OrchestratorFacade {
  return {
    onShortcutPressed: vi.fn().mockResolvedValue(undefined),
    onShortcutReleased: vi.fn().mockResolvedValue(undefined),
  };
}

function makeListen(): { listenFn: ListenFn; trigger: (event: string) => Promise<void> } {
  const handlers = new Map<string, EventHandler>();
  const listenFn = vi.fn().mockImplementation(async (event: string, handler: EventHandler) => {
    handlers.set(event, handler);
    return vi.fn(); // unlisten
  }) as unknown as ListenFn;

  return {
    listenFn,
    trigger: async (event: string) => {
      const handler = handlers.get(event);
      if (handler) await handler();
    },
  };
}

describe('useOrchestrator - 快捷键事件处理', () => {
  beforeEach(() => {
    useRecordingStore.setState({ status: 'idle' });
  });

  describe('快捷键按下', () => {
    it('用户按下快捷键时录音状态应立即变为录音中', async () => {
      const orchestrator = makeOrchestrator();
      const { listenFn, trigger } = makeListen();

      renderHook(() => useOrchestrator(orchestrator, listenFn));

      await act(async () => {
        await trigger('shortcut-pressed');
      });

      expect(useRecordingStore.getState().status).toBe('recording');
    });

    it('用户按下快捷键时应启动编排器开始录音', async () => {
      const orchestrator = makeOrchestrator();
      const { listenFn, trigger } = makeListen();

      renderHook(() => useOrchestrator(orchestrator, listenFn));

      await act(async () => {
        await trigger('shortcut-pressed');
      });

      expect(orchestrator.onShortcutPressed).toHaveBeenCalledTimes(1);
    });
  });

  describe('快捷键松开', () => {
    it('用户松开快捷键后录音状态应进入处理中', async () => {
      const orchestrator = makeOrchestrator();
      const { listenFn, trigger } = makeListen();

      renderHook(() => useOrchestrator(orchestrator, listenFn));

      await act(async () => {
        await trigger('shortcut-pressed');
        await trigger('shortcut-released');
      });

      // processing 完成后应恢复 idle（因为 onShortcutReleased mock 立刻 resolve）
      expect(useRecordingStore.getState().status).toBe('idle');
    });

    it('用户松开快捷键时应通知编排器停止录音', async () => {
      const orchestrator = makeOrchestrator();
      const { listenFn, trigger } = makeListen();

      renderHook(() => useOrchestrator(orchestrator, listenFn));

      await act(async () => {
        await trigger('shortcut-released');
      });

      expect(orchestrator.onShortcutReleased).toHaveBeenCalledTimes(1);
    });
  });

  describe('事件监听生命周期', () => {
    it('钩子挂载时应订阅快捷键按下和松开两个事件', () => {
      const orchestrator = makeOrchestrator();
      const { listenFn } = makeListen();

      renderHook(() => useOrchestrator(orchestrator, listenFn));

      expect(listenFn).toHaveBeenCalledWith('shortcut-pressed', expect.any(Function));
      expect(listenFn).toHaveBeenCalledWith('shortcut-released', expect.any(Function));
    });

    it('钩子卸载时应取消所有快捷键事件监听', async () => {
      const orchestrator = makeOrchestrator();
      const unlistenPressed = vi.fn();
      const unlistenReleased = vi.fn();
      let callCount = 0;
      const listenFn = vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? unlistenPressed : unlistenReleased;
      }) as unknown as ListenFn;

      const { unmount } = renderHook(() => useOrchestrator(orchestrator, listenFn));

      unmount();
      // allow microtask queue to flush
      await act(async () => {});

      expect(unlistenPressed).toHaveBeenCalledTimes(1);
      expect(unlistenReleased).toHaveBeenCalledTimes(1);
    });
  });
});
