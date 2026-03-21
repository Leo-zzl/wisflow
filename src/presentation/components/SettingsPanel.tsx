import { useState, useEffect, useCallback } from 'react';
import { UserConfig, PolishStyle } from '@domain/config/entities/UserConfig';
import type { ModifierKey } from '@domain/config/value-objects/ShortcutConfig';
import { ShortcutConfig } from '@domain/config/value-objects/ShortcutConfig';
import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import { TauriStoreConfigRepository } from '@infrastructure/persistence/TauriStoreConfigRepository';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  repo?: ConfigRepository;
}

const POLISH_STYLE_LABELS: Record<PolishStyle, string> = {
  colloquial: '口水化（保留口语特征）',
  light: '轻度去口水',
  deep: '深度精炼',
  condensed: '浓缩版',
  custom: '自定义',
};

const MODIFIER_DISPLAY: Record<string, string> = {
  Control: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Win',
};

const DISPLAY_TO_MODIFIER: Record<string, ModifierKey> = {
  Ctrl: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Win: 'Meta',
};

type CheckStatus = 'idle' | 'checking' | 'ok' | 'conflict';

const defaultRepo = new TauriStoreConfigRepository();

// 从环境变量读取防抖时间，测试时可覆盖
const DEBOUNCE_MS = Number(import.meta.env.VITE_SHORTCUT_DEBOUNCE_MS ?? 1000);

function parseShortcutString(s: string, mode: 'hold' | 'toggle'): ShortcutConfig {
  const parts = s.split('+');
  const triggerKey = parts.at(-1) ?? 'V';
  const modifiers = parts
    .slice(0, -1)
    .map((m): ModifierKey | undefined => DISPLAY_TO_MODIFIER[m])
    .filter((m): m is ModifierKey => m !== undefined);
  return new ShortcutConfig({ triggerKey, modifiers, mode });
}

export function SettingsPanel({ repo = defaultRepo }: Props): React.ReactElement {
  const [config, setConfig] = useState<UserConfig>(UserConfig.createDefault());
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');

  useEffect((): void => {
    void repo.load().then(loaded => {
      if (loaded) setConfig(loaded);
    });
  }, [repo]);

  // 计算显示的快捷键标签
  const shortcutLabel = [
    ...config.shortcut.modifiers.map(m => MODIFIER_DISPLAY[m] ?? m),
    config.shortcut.triggerKey,
  ].join('+');

  // 防抖处理快捷键注册
  useEffect(() => {
    if (!pendingShortcut || pendingShortcut === shortcutLabel) return;

    setCheckStatus('checking');

    const timer = setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await invoke('update_shortcut', { newShortcut: pendingShortcut });

          // 注册成功：更新配置并保存
          const newShortcutConfig = parseShortcutString(pendingShortcut, config.shortcut.mode);
          const updated = config.updateShortcut(newShortcutConfig);
          setConfig(updated);
          void repo.save(updated);
          setCheckStatus('ok');
        } catch {
          setCheckStatus('conflict');
        }
      })();
    }, DEBOUNCE_MS);

    return (): void => clearTimeout(timer);
  }, [pendingShortcut, shortcutLabel, config, repo]);

  const handleShortcutCapture = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    e.preventDefault();

    const mods: string[] = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.shiftKey) mods.push('Shift');
    if (e.altKey) mods.push('Alt');

    const key = e.key.toUpperCase();

    // 忽略纯修饰键
    if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return;

    setPendingShortcut([...mods, key].join('+'));
    setCheckStatus('idle');
  }, []);

  const handlePolishStyleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const style = e.target.value as PolishStyle;
    const updated = config.updatePolishStyle(style);
    setConfig(updated);
    void repo.save(updated);
  };

  const displayShortcut = pendingShortcut ?? shortcutLabel;

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">WisFlow 设置</h1>

      {/* 快捷键 */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">快捷键</h2>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">触发录音</span>
            <div
              data-testid="shortcut-capture-area"
              tabIndex={0}
              onKeyDown={handleShortcutCapture}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-rust-500"
              role="button"
              aria-label="点击并按下新快捷键以修改"
            >
              <kbd className="text-sm font-mono text-rust-400">{displayShortcut}</kbd>
              {checkStatus === 'checking' && (
                <span data-testid="shortcut-checking" className="text-slate-400 text-xs">
                  …
                </span>
              )}
              {checkStatus === 'conflict' && (
                <span data-testid="shortcut-conflict" className="text-amber-400" title="快捷键冲突">
                  ⚠️
                </span>
              )}
              {checkStatus === 'ok' && (
                <span data-testid="shortcut-ok" className="text-green-400" title="已生效">
                  ✓
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">点击上方区域，按下新快捷键组合</p>
        </div>
      </section>

      {/* 润色风格 */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">
          润色设置
        </h2>
        <div className="bg-slate-800 rounded-lg p-4">
          <label className="flex items-center justify-between" htmlFor="polish-style">
            <span className="text-slate-300">润色风格</span>
            <select
              id="polish-style"
              aria-label="润色风格"
              value={config.polish.style}
              onChange={handlePolishStyleChange}
              className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-rust-500 focus:outline-none"
            >
              {(Object.keys(POLISH_STYLE_LABELS) as PolishStyle[]).map(style => (
                <option key={style} value={style}>
                  {POLISH_STYLE_LABELS[style]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
