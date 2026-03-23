import { useState, useEffect } from 'react';
import { UserConfig } from '@domain/config/entities/UserConfig';
import type { PolishStyle } from '@domain/config/entities/UserConfig';
import type { ModifierKey } from '@domain/config/value-objects/ShortcutConfig';
import { ShortcutConfig } from '@domain/config/value-objects/ShortcutConfig';
import type { ConfigRepository } from '@domain/config/repositories/ConfigRepository';
import { TauriStoreConfigRepository } from '@infrastructure/persistence/TauriStoreConfigRepository';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface Props {
  repo?: ConfigRepository;
}

type TabKey = 'shortcut' | 'voice' | 'polish' | 'general';
type CheckStatus = 'idle' | 'checking' | 'ok' | 'conflict';
type TriggerMode = 'hold' | 'toggle';

const POLISH_STYLE_LABELS: Record<PolishStyle, { title: string; desc: string }> = {
  colloquial: { title: '口水化', desc: '保留口语特征，更自然' },
  light: { title: '轻度去口水', desc: '去除冗余词，保持口语感' },
  deep: { title: '深度精炼', desc: '去除所有口语痕迹，正式书面' },
  condensed: { title: '浓缩版', desc: '极度精简，信息密度最高' },
  custom: { title: '自定义', desc: '自定义润色规则' },
};

const MODIFIER_DISPLAY: Record<ModifierKey, string> = {
  Control: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Win',
};

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'shortcut', label: '快捷键', icon: 'keyboard' },
  { key: 'voice', label: '语音识别', icon: 'mic' },
  { key: 'polish', label: '润色风格', icon: 'sparkles' },
  { key: 'general', label: '通用', icon: 'settings' },
];

const defaultRepo = new TauriStoreConfigRepository();

// 从环境变量读取防抖时间，测试时可覆盖
const DEBOUNCE_MS = Number(import.meta.env.VITE_SHORTCUT_DEBOUNCE_MS ?? 1000);

function parseShortcutString(s: string, mode: TriggerMode): ShortcutConfig {
  const parts = s.split('+');
  const triggerKey = parts.at(-1) ?? 'V';
  const modifiers = parts
    .slice(0, -1)
    .map((m): ModifierKey | undefined => {
      const map: Record<string, ModifierKey> = {
        Ctrl: 'Control',
        Shift: 'Shift',
        Alt: 'Alt',
        Win: 'Meta',
      };
      return map[m];
    })
    .filter((m): m is ModifierKey => m !== undefined);
  return new ShortcutConfig({ triggerKey, modifiers, mode });
}

// 关闭窗口辅助函数
function closeWindow(): void {
  try {
    // 尝试使用 Tauri API 关闭窗口
    const win = getCurrentWindow();
    void win.close();
  } catch {
    // 如果不是 Tauri 环境（如浏览器开发），尝试关闭浏览器窗口
    window.close();
  }
}

export function SettingsPanel({ repo = defaultRepo }: Props): React.ReactElement {
  const [config, setConfig] = useState<UserConfig>(UserConfig.createDefault());
  const [activeTab, setActiveTab] = useState<TabKey>('shortcut');
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');

  useEffect((): void => {
    void repo.load().then(loaded => {
      if (loaded) setConfig(loaded);
    });
  }, [repo]);

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

  const handleSave = async (): Promise<void> => {
    await repo.save(config);
  };

  const handleModifierToggle = (modifier: ModifierKey): void => {
    const currentModifiers = config.shortcut.modifiers;
    const newModifiers = currentModifiers.includes(modifier)
      ? currentModifiers.filter(m => m !== modifier)
      : [...currentModifiers, modifier];
    const newShortcut = new ShortcutConfig({
      triggerKey: config.shortcut.triggerKey,
      modifiers: newModifiers,
      mode: config.shortcut.mode,
    });
    const updated = config.updateShortcut(newShortcut);
    setConfig(updated);
    setPendingShortcut(
      [...newModifiers.map(m => MODIFIER_DISPLAY[m]), config.shortcut.triggerKey].join('+')
    );
    setCheckStatus('idle');
  };

  const handleTriggerKeyChange = (key: string): void => {
    const newShortcut = new ShortcutConfig({
      triggerKey: key,
      modifiers: config.shortcut.modifiers,
      mode: config.shortcut.mode,
    });
    const updated = config.updateShortcut(newShortcut);
    setConfig(updated);
    setPendingShortcut([...config.shortcut.modifiers.map(m => MODIFIER_DISPLAY[m]), key].join('+'));
    setCheckStatus('idle');
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta'];
    if (MODIFIER_KEYS.includes(e.key)) return;

    const modifiers: ModifierKey[] = [];
    if (e.ctrlKey) modifiers.push('Control');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Meta');

    const keyLabel = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const newShortcutStr = [...modifiers.map(m => MODIFIER_DISPLAY[m]), keyLabel].join('+');

    const newShortcut = new ShortcutConfig({
      triggerKey: keyLabel,
      modifiers,
      mode: config.shortcut.mode,
    });
    const updated = config.updateShortcut(newShortcut);
    setConfig(updated);
    setPendingShortcut(newShortcutStr);
    setCheckStatus('idle');
  };

  const handleModeChange = (mode: TriggerMode): void => {
    const newShortcut = new ShortcutConfig({
      triggerKey: config.shortcut.triggerKey,
      modifiers: config.shortcut.modifiers,
      mode,
    });
    const updated = config.updateShortcut(newShortcut);
    setConfig(updated);
  };

  const handlePolishStyleChange = (style: PolishStyle): void => {
    const updated = config.updatePolishStyle(style);
    setConfig(updated);
  };

  const handleCheckConflict = (): void => {
    setCheckStatus('checking');
    setTimeout(() => setCheckStatus('ok'), 800);
  };

  const isActive = (m: ModifierKey): boolean => config.shortcut.modifiers.includes(m);

  // Lucide icons as SVG components
  const Icon = ({ name, className }: { name: string; className?: string }): React.ReactElement => {
    const icons: Record<string, React.ReactNode> = {
      keyboard: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
      ),
      mic: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      ),
      sparkles: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
      ),
      settings: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      'mic-2': (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
          <circle cx="17" cy="7" r="5" />
        </svg>
      ),
      x: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      ),
      info: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      ),
      'refresh-cw': (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      ),
      check: (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ),
    };
    return <>{icons[name] ?? null}</>;
  };

  return (
    <div className="w-[860px] h-[680px] bg-white overflow-hidden flex flex-col font-sans">
      {/* Title Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Icon name="mic-2" className="w-5 h-5 text-[#B7410E]" />
          <span className="text-[15px] font-semibold text-gray-900">WisFlow</span>
          <span className="text-gray-300">·</span>
          <span className="text-[13px] text-gray-500">语音输入设置</span>
        </div>
        <button
          onClick={() => void closeWindow()}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <Icon name="x" className="w-[18px] h-[18px] text-gray-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[196px] bg-[#FAFAFA] border-r border-gray-200 py-3 px-4 flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-gray-400 px-3 mb-2">设置</span>
          {TABS.map(tab => {
            const isActiveTab = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-lg transition-colors ${
                  isActiveTab ? 'bg-[#FEF2EE]' : 'hover:bg-gray-100'
                }`}
              >
                <Icon
                  name={tab.icon}
                  className={`w-[18px] h-[18px] ${
                    isActiveTab ? 'text-[#B7410E]' : 'text-gray-500'
                  }`}
                />
                <span
                  className={`text-[13px] ${
                    isActiveTab ? 'text-[#B7410E] font-medium' : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-5">
            {activeTab === 'shortcut' && (
              <>
                {/* Shortcut Card */}
                <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2.5">
                    <Icon name="keyboard" className="w-[18px] h-[18px] text-[#B7410E]" />
                    <span className="text-sm font-semibold text-gray-900">触发快捷键</span>
                  </div>

                  {/* Modifiers Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600">触发键组合</span>
                    <div className="flex gap-2">
                      {(['Control', 'Shift', 'Alt'] as ModifierKey[]).map(mod => {
                        const active = isActive(mod);
                        return (
                          <button
                            key={mod}
                            onClick={() => handleModifierToggle(mod)}
                            className={`w-14 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                              active
                                ? 'bg-[#FEF2EE] border border-[#B7410E] text-[#B7410E]'
                                : 'bg-white border border-gray-300 text-gray-400'
                            }`}
                          >
                            {MODIFIER_DISPLAY[mod]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Key Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600">主键</span>
                    <div className="flex gap-2">
                      {(['V', 'Space', 'Custom'] as const).map(key => {
                        const isSelected =
                          key === 'V'
                            ? config.shortcut.triggerKey === 'V'
                            : key === 'Space'
                              ? config.shortcut.triggerKey === 'Space'
                              : !['V', 'Space'].includes(config.shortcut.triggerKey);
                        const displayText =
                          key === 'V' ? 'V' : key === 'Space' ? 'Space' : '自定义';
                        return (
                          <button
                            key={key}
                            onClick={() =>
                              handleTriggerKeyChange(
                                key === 'V' ? 'V' : key === 'Space' ? 'Space' : 'F1'
                              )
                            }
                            className={`w-14 h-8 rounded-md flex items-center justify-center text-[13px] transition-colors ${
                              isSelected
                                ? 'bg-[#B7410E] text-white font-semibold'
                                : 'bg-white border border-gray-300 text-gray-600'
                            }`}
                          >
                            {displayText}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mode Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600">触发模式</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-md">
                      <button
                        onClick={() => handleModeChange('hold')}
                        className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          config.shortcut.mode === 'hold'
                            ? 'bg-[#B7410E] text-white'
                            : 'text-gray-600'
                        }`}
                      >
                        按住模式
                      </button>
                      <button
                        onClick={() => handleModeChange('toggle')}
                        className={`px-3.5 py-1.5 rounded text-xs transition-colors ${
                          config.shortcut.mode === 'toggle'
                            ? 'bg-[#B7410E] text-white font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        切换模式
                      </button>
                    </div>
                  </div>
                </div>

                {/* Shortcut Capture Area */}
                <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-3">
                  <span className="text-[13px] text-gray-600">或者直接按下快捷键</span>
                  <div
                    data-testid="shortcut-capture-area"
                    tabIndex={0}
                    onKeyDown={handleShortcutKeyDown}
                    className="flex items-center justify-center h-10 rounded-md border border-dashed border-gray-300 focus:border-[#B7410E] focus:outline-none text-sm font-mono text-gray-700 cursor-pointer"
                  >
                    <span data-testid="shortcut-display">{shortcutLabel}</span>
                  </div>
                </div>

                {/* Conflict Card */}
                <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2.5">
                    <Icon name="info" className="w-[18px] h-[18px] text-[#B7410E]" />
                    <span className="text-sm font-semibold text-gray-900">冲突检测</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {checkStatus === 'checking' && (
                      <span
                        data-testid="shortcut-checking"
                        className="text-[13px] font-medium text-gray-500"
                      >
                        检测中...
                      </span>
                    )}
                    {checkStatus === 'conflict' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span
                          data-testid="shortcut-conflict"
                          className="text-[13px] font-medium text-amber-700"
                        >
                          检测到冲突
                        </span>
                      </>
                    )}
                    {(checkStatus === 'ok' || checkStatus === 'idle') && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span
                          data-testid="shortcut-ok"
                          className="text-[13px] font-medium text-green-700"
                        >
                          未检测到冲突
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {checkStatus === 'conflict'
                        ? '当前快捷键组合与其他应用冲突'
                        : '当前快捷键组合未与其他应用冲突'}
                    </span>
                    <button
                      onClick={handleCheckConflict}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#B7410E] text-[#B7410E] text-xs font-medium hover:bg-[#FEF2EE] transition-colors"
                    >
                      <Icon name="refresh-cw" className="w-3.5 h-3.5" />
                      重新检测
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'voice' && (
              <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <Icon name="mic" className="w-[18px] h-[18px] text-[#B7410E]" />
                  <span className="text-sm font-semibold text-gray-900">语音识别引擎</span>
                </div>
                <p className="text-sm text-gray-500">语音识别设置将在后续版本中添加</p>
              </div>
            )}

            {activeTab === 'polish' && (
              <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <Icon name="sparkles" className="w-[18px] h-[18px] text-[#B7410E]" />
                  <span className="text-sm font-semibold text-gray-900">润色风格</span>
                </div>
                <div className="flex flex-col gap-2">
                  {(Object.keys(POLISH_STYLE_LABELS) as PolishStyle[]).map(style => {
                    const isSelected = config.polish.style === style;
                    const { title, desc } = POLISH_STYLE_LABELS[style];
                    return (
                      <button
                        key={style}
                        data-testid={isSelected ? 'polish-style-selected' : undefined}
                        onClick={() => handlePolishStyleChange(style)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-[#FEF2EE] border-[#B7410E]'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#B7410E]' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <span className="w-2 h-2 rounded-full bg-[#B7410E]" />}
                          </span>
                          <div>
                            <span
                              className={`text-sm font-medium ${
                                isSelected ? 'text-[#B7410E]' : 'text-gray-900'
                              }`}
                            >
                              {title}
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="bg-[#FAFAFA] rounded-[10px] p-5 border border-gray-200 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <Icon name="settings" className="w-[18px] h-[18px] text-[#B7410E]" />
                  <span className="text-sm font-semibold text-gray-900">通用设置</span>
                </div>
                <p className="text-sm text-gray-500">通用设置将在后续版本中添加</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="h-16 px-7 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              onClick={() => void closeWindow()}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => void handleSave()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#B7410E] text-white text-sm font-semibold shadow-md shadow-[#B7410E]/25 hover:bg-[#a33a0d] transition-colors"
            >
              <Icon name="check" className="w-3.5 h-3.5" />
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
