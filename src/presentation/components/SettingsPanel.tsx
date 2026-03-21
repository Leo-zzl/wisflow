import { useState, useEffect } from 'react';
import { UserConfig, PolishStyle } from '@domain/config/entities/UserConfig';
import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import { TauriStoreConfigRepository } from '@infrastructure/persistence/TauriStoreConfigRepository';

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

const defaultRepo = new TauriStoreConfigRepository();

export function SettingsPanel({ repo = defaultRepo }: Props): React.ReactElement {
  const [config, setConfig] = useState<UserConfig>(UserConfig.createDefault());

  useEffect((): void => {
    void repo.load().then(loaded => {
      if (loaded) setConfig(loaded);
    });
  }, [repo]);

  const MODIFIER_DISPLAY: Record<string, string> = {
    Control: 'Ctrl',
    Shift: 'Shift',
    Alt: 'Alt',
    Meta: 'Win',
  };
  const shortcutLabel = [
    ...config.shortcut.modifiers.map(m => MODIFIER_DISPLAY[m] ?? m),
    config.shortcut.triggerKey,
  ].join('+');

  const handlePolishStyleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const style = e.target.value as PolishStyle;
    const updated = config.updatePolishStyle(style);
    setConfig(updated);
    void repo.save(updated);
  };

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">WisFlow 设置</h1>

      {/* 快捷键 */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">快捷键</h2>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">触发录音</span>
            <kbd className="px-3 py-1 bg-slate-700 rounded text-sm font-mono text-rust-400">
              {shortcutLabel}
            </kbd>
          </div>
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
