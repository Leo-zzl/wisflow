# WisFlow 项目工作方案

## 0. 产品概述

### 一句话描述

一个 Windows 下的快捷键触发的智能语音输入法，支持实时转写、多风格润色、本地/云端模型切换，最终通过剪贴板自动粘贴到任意输入框。

### 核心功能

#### 快捷键触发模式

| 模式         | 操作方式                 | 适用场景     |
| ------------ | ------------------------ | ------------ |
| **按住模式** | 按住快捷键说话，松开结束 | 短句快速输入 |
| **切换模式** | 按一下开始，再按一下结束 | 长文连续输入 |

支持全局快捷键（如 `Ctrl+Shift+V` 或自定义组合），支持自定义快捷键。

#### 实时语音转写

- **输出单位**：按"语义团"输出，非逐字蹦出（类似微信电脑版语音输入）
- **实时预览**：在浮动框实时显示识别结果
- **自动标点**：语音转文字时自动添加标点符号

#### 多风格润色（核心卖点）

松开快捷键后，对整段文字进行润色，力度可调：

| 风格           | 说明                   | 示例                            |
| -------------- | ---------------------- | ------------------------------- |
| **口水化**     | 保留口语特征，更自然   | "那个...我觉得吧...这个事情..." |
| **轻度去口水** | 去除冗余词，保持口语感 | "我觉得这个事情..."             |
| **深度精炼**   | 去除所有口语痕迹       | "我认为此事..."                 |
| **浓缩版**     | 极度精简，信息密度最高 | "此事..."                       |

风格可扩展：正式、casual、商务、技术、幽默等。

### 差异化卖点

- ✅ 全局快捷键，不依赖特定应用
- ✅ 一键润色，多种风格可选
- ✅ 本地/云端模型智能切换
- ✅ 剪贴板自动粘贴，零操作成本

### 竞品对比

| 产品             | 特点               | 不足               |
| ---------------- | ------------------ | ------------------ |
| 微信 PC 语音输入 | 实时显示、操作简单 | 无法跨应用、无润色 |
| 讯飞输入法       | 准确率高、功能全   | 输入法形式，需切换 |
| Windows 自带语音 | 系统集成           | 准确率低、无润色   |
| Otter.ai         | 专业转写           | 需手动复制粘贴     |

### 语音识别方案选型

| 方案                  | 优点               | 缺点                 | 适用场景           |
| --------------------- | ------------------ | -------------------- | ------------------ |
| **本地 Whisper**      | 隐私好、离线可用   | 占用资源、准确率略低 | 敏感环境、离线场景 |
| **Kimi / OpenAI API** | 准确率高、支持润色 | 需联网、有费用       | 日常办公           |
| **Azure Speech**      | 稳定、支持中文     | 微软生态绑定         | 企业环境           |
| **讯飞 API**          | 中文强、实时性好   | 国产绑定             | 中文用户           |

### 待解决问题

1. **剪贴板冲突**：如何优雅处理用户原有剪贴板内容（临时保存/恢复）？
2. **权限申请**：如何申请麦克风权限不弹窗吓人？
3. **延迟优化**：云端模型调用的延迟如何降低到可接受范围？
4. **快捷键冲突**：与其他全局快捷键冲突时如何检测并提示用户？

---

## 1. 技术选型与框架版本

> **注意**：项目已于 Phase A-E（2026-03-21）完成 Electron → Tauri v2 迁移。

### 核心框架

| 技术       | 版本  | 说明                                 |
| ---------- | ----- | ------------------------------------ |
| Tauri      | ^2.x  | 桌面应用框架（Rust + WebView2）      |
| React      | ^18.x | UI框架                               |
| TypeScript | ^5.x  | 类型系统（严格模式）                 |
| Vite       | ^5.x  | 前端构建工具                         |
| Rust       | 1.75+ | Tauri 后端：快捷键、剪贴板、音频采集 |

### 测试与质量

| 技术                   | 版本  | 说明              |
| ---------------------- | ----- | ----------------- |
| Vitest                 | ^2.x  | 单元/集成测试框架 |
| Playwright             | ^1.x  | E2E测试框架       |
| @testing-library/react | ^14.x | React组件测试     |
| ESLint                 | ^9.x  | 代码检查          |
| Prettier               | ^3.x  | 代码格式化        |

### 状态与样式

| 技术                                 | 版本 | 说明                              |
| ------------------------------------ | ---- | --------------------------------- |
| Zustand                              | ^4.x | 状态管理                          |
| Tailwind CSS                         | ^3.x | CSS框架                           |
| @tauri-apps/plugin-store             | ^2.x | 配置持久化（替代 electron-store） |
| @tauri-apps/plugin-clipboard-manager | ^2.x | 剪贴板读写                        |
| @tauri-apps/plugin-global-shortcut   | ^2.x | 全局快捷键监听                    |

### 语音与AI

| 技术           | 版本     | 说明                |
| -------------- | -------- | ------------------- |
| @ricky0123/vad | latest   | Silero VAD (浏览器) |
| faster-whisper | (Python) | 本地STT             |

---

## 2. TDD 开发流程规范

### 开发循环

```
1. 写测试 → 2. 运行测试(红) → 3. 写实现 → 4. 运行测试(绿) → 5. 重构 → 6. 提交
```

### 测试金字塔

```
     /\
    /  \  E2E测试 (Playwright) - 关键用户流程
   /----\     占比: 10%
  /      \
 / 集成测试 \  跨领域协作测试
/------------\  占比: 30%
/              \
/   单元测试    \  领域对象、服务
/________________\  占比: 60%
```

### 测试文件命名

```
领域文件: src/domain/config/entities/UserConfig.ts
测试文件: src/domain/config/entities/__tests__/UserConfig.spec.ts

领域文件: src/domain/voice/services/VADService.ts
测试文件: src/domain/voice/services/__tests__/VADService.spec.ts
```

### 测试原则

1. **FIRST原则**: Fast(快), Independent(独立), Repeatable(可重复), Self-validating(自验证), Timely(及时)
2. **一个测试一个概念**: 每个测试只验证一个行为
3. **AAA模式**: Arrange(准备) → Act(执行) → Assert(断言)

---

## 3. 模块拆分与依赖关系

### 模块依赖图

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation (UI层)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ TrayIcon │ │ Recording│ │ Settings │ │  Global  │          │
│  │          │ │  Panel   │ │  Panel   │ │ Shortcut │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        └────────────┴────────────┴────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Application (应用层)                         │
│              VoiceInputOrchestrator                             │
│         (协调各领域的编排器，无业务逻辑，只负责流程)               │
└─────────────────────────────────────────────────────────────────┘
        ↓           ↓           ↓           ↓
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  Config   │ │   Voice   │ │   Model   │ │  Action   │
│  Domain   │ │  Domain   │ │  Domain   │ │  Domain   │
│  (配置)   │ │  (语音)   │ │  (模型)   │ │  (执行)   │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      └─────────────┴─────────────┴─────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Infrastructure (基础设施层)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Electron  │ │ WebAudio │ │  faster- │ │ Windows  │          │
│  │  Store   │ │  Adapter │ │ whisper  │ │   API    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 领域间依赖规则

1. **同层不依赖**: 各 Domain 之间不直接依赖，通过 Application 编排
2. **上层依赖下层**: Application → Domain → Infrastructure
3. **依赖抽象**: 上层依赖接口，下层实现接口
4. **禁止循环依赖**: 任何两个模块不能相互依赖

---

## 4. 测试策略

### 单元测试 (Vitest)

#### 领域对象测试

```typescript
// UserConfig.spec.ts
describe('UserConfig', () => {
  describe('创建配置', () => {
    it('应该使用默认值创建配置', () => {
      const config = UserConfig.createDefault();
      expect(config.shortcut.triggerKey).toBe('V');
      expect(config.shortcut.modifiers).toContain('Control');
    });

    it('应该验证快捷键不重复', () => {
      const invalidConfig = { ... };
      expect(() => UserConfig.create(invalidConfig))
        .toThrow('快捷键冲突');
    });
  });

  describe('更新配置', () => {
    it('应该更新润色风格', () => {
      const config = UserConfig.createDefault();
      const updated = config.updatePolishStyle('deep');
      expect(updated.polish.style).toBe('deep');
      expect(config.polish.style).toBe('light'); // 原对象不变
    });
  });
});
```

#### 领域服务测试

```typescript
// SemanticChunkDetector.spec.ts
describe('SemanticChunkDetector', () => {
  it('应该在累积约10字时触发语义团', async () => {
    const detector = new SemanticChunkDetector({ threshold: 10 });
    const chunks: SemanticChunk[] = [];

    // 模拟2秒音频（约9字）
    const audio9Chars = createMockAudio(2000);
    const result1 = await detector.process(audio9Chars);
    expect(result1).toBeNull();

    // 再加1秒（约4.5字，总计约13.5字）
    const audio4Chars = createMockAudio(1000);
    const result2 = await detector.process(audio4Chars);
    expect(result2).not.toBeNull();
    expect(result2?.estimatedLength).toBeGreaterThanOrEqual(10);
  });

  it('应该在检测到停顿时触发语义团', async () => {
    const detector = new SemanticChunkDetector();
    const audioWithPause = createMockAudioWithPause(500, 500);

    const result = await detector.process(audioWithPause);
    expect(result).not.toBeNull();
  });
});
```

### 集成测试 (Vitest)

```typescript
// VoiceInputOrchestrator.integration.spec.ts
describe('语音输入流程', () => {
  it('应该完成按住模式完整流程', async () => {
    // Arrange
    const orchestrator = createTestOrchestrator();
    const mockPaster = vi.fn();

    // Act - 模拟按住快捷键
    await orchestrator.onShortcutPressed('hold');

    // 模拟生成两个语义团
    await orchestrator.simulateSemanticChunk('今天天气');
    await orchestrator.simulateSemanticChunk('真不错');

    // 模拟松开快捷键
    const result = await orchestrator.onShortcutReleased();

    // Assert
    expect(result.rawText).toBe('今天天气真不错');
    expect(mockPaster).toHaveBeenCalledTimes(2); // 两次实时上屏
  });
});
```

### E2E测试 (Playwright)

```typescript
// voice-input.spec.ts
test('按住快捷键语音输入并自动粘贴', async ({ page }) => {
  // 打开记事本
  await page.goto('notepad-test.html');

  // 按住快捷键
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.down('V');

  // 等待录音界面出现
  await expect(page.locator('[data-testid="recording-panel"]')).toBeVisible();

  // 模拟语音输入（通过测试API）
  await page.evaluate(() => {
    window.__TEST_API__.injectAudio('test-audio.wav');
  });

  // 松开快捷键
  await page.keyboard.up('V');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');

  // 验证文本被粘贴
  await expect(page.locator('#editor')).toHaveText(/今天天气/);
});
```

---

## 5. 质量检查配置

### ESLint 规则

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-readonly": "error"
  }
}
```

### TypeScript 严格模式

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 预提交检查 (Husky + lint-staged)

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "vitest related --run"]
  }
}
```

---

## 6. Git 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (Type)

| 类型     | 说明               |
| -------- | ------------------ |
| feat     | 新功能             |
| fix      | Bug修复            |
| test     | 测试相关           |
| refactor | 重构（非功能变更） |
| docs     | 文档               |
| chore    | 构建/工具/依赖     |

### 范围 (Scope)

- config: 配置领域
- voice: 语音领域
- model: 模型领域
- action: 执行领域
- ui: 界面层
- infra: 基础设施

### 示例

```
feat(config): 实现用户配置聚合根

- UserConfig实体，支持默认值和验证
- ShortcutConfig值对象
- ConfigService持久化服务

test(config): 添加用户配置单元测试

- 测试默认配置创建
- 测试快捷键冲突验证
- 测试配置更新不可变性

refactor(voice): 优化语义切分算法

- 将阈值从固定10字改为自适应
- 根据语速动态调整
```

---

## 7. 开发阶段任务清单

### Phase 1: 项目初始化 (2-3天)

- [x] Task 1.1: electron-vite 项目初始化 + Git提交（已迁移至 Tauri v2，见 Phase A-E）
- [x] Task 1.2: ESLint + Prettier + TypeScript严格模式配置 + 提交
- [x] Task 1.3: Vitest 测试框架配置 + 提交
- [x] Task 1.4: Tailwind CSS + Zustand 配置 + 提交
- [x] Task 1.5: DDD目录结构创建 + 提交
- [x] Task 1.6: Husky + lint-staged 配置 + 提交

### Phase 2: 配置领域 (2-3天)

- [x] Task 2.1: 测试 - UserConfig实体默认创建 + 红测试 + 提交
- [x] Task 2.2: 实现 - UserConfig实体默认创建 + 绿测试 + 提交
- [x] Task 2.3: 测试 - ShortcutConfig值对象验证 + 提交
- [x] Task 2.4: 实现 - ShortcutConfig值对象 + 提交
- [x] Task 2.5: 测试 - ConfigService持久化 + 提交
- [x] Task 2.6: 实现 - electron-store适配器 + 提交（已替换为 TauriStoreConfigRepository）

### Phase 3: 语音领域 - 音频采集 (2-3天)

- [x] Task 3.1: 测试 - AudioCaptureService接口 + 提交
- [x] Task 3.2: 实现 - WebAudio适配器 + 提交
- [x] Task 3.3: 测试 - RecordingSession聚合根 + 提交
- [x] Task 3.4: 实现 - RecordingSession + 提交

### Phase 4: 语音领域 - VAD与语义切分 (3-4天)

- [x] Task 4.1: 测试 - VADService语义边界检测 + 提交
- [x] Task 4.2: 实现 - Silero VAD集成 + 提交
- [x] Task 4.3: 测试 - SemanticChunkDetector(10字阈值) + 提交
- [x] Task 4.4: 实现 - SemanticChunkDetector + 提交
- [x] Task 4.5: 集成测试 - 录音+切分流程 + 提交

### Phase 5: 模型领域 - STT抽象 (3-4天)

- [x] Task 5.1: 测试 - ModelRegistry接口 + 提交
- [x] Task 5.2: 实现 - ModelRegistry + 提交
- [x] Task 5.3: 测试 - CloudSTT策略 + 提交
- [x] Task 5.4: 实现 - OpenAI兼容接口适配器 + 提交
- [x] Task 5.5: 测试 - LocalWhisper策略 + 提交
- [x] Task 5.6: 实现 - faster-whisper集成 + 提交

### Phase 6: 执行领域 - 剪贴板 (2-3天)

- [x] Task 6.1: 测试 - ClipboardService接口 + 提交
- [x] Task 6.2: 实现 - Windows剪贴板适配器 + 提交
- [x] Task 6.3: 测试 - PasterService增量粘贴 + 提交
- [x] Task 6.4: 实现 - PasterService + 提交
- [x] Task 6.5: 测试 - 剪贴板临时保存/恢复 + 提交

### Phase 7: 内容领域 - 润色 (2-3天)

- [x] Task 7.1: 测试 - PolishStyle枚举 + 提交
- [x] Task 7.2: 测试 - ContentSession聚合根 + 提交
- [x] Task 7.3: 实现 - ContentSession + 提交
- [x] Task 7.4: 测试 - PolishService多风格润色 + 提交
- [x] Task 7.5: 实现 - LLM调用集成 + 提交

### Phase 8: 应用层编排 (2-3天)

- [x] Task 8.1: 测试 - VoiceInputOrchestrator按住模式 + 提交
- [x] Task 8.2: 实现 - VoiceInputOrchestrator + 提交
- [x] Task 8.3: 测试 - VoiceInputOrchestrator切换模式 + 提交
- [x] Task 8.4: 集成测试 - 完整流程 + 提交

### Phase A-E: Electron → Tauri v2 迁移 ✅ 已完成（2026-03-21）

> 在 Phase 9 UI 开发前完成迁移，避免 UI 开发后的二次改造成本。

- [x] Phase A: 初始化 src-tauri/ 项目结构，更新 package.json / vite.config.ts，删除 electron/ 目录
- [x] Phase B: Rust 后端实现
  - `src-tauri/src/lib.rs`：全局快捷键 `Ctrl+Shift+V`（emit `shortcut-pressed/released`）、系统托盘、`simulate_paste` 命令（enigo）
  - `src-tauri/src/audio.rs`：cpal 麦克风采集，`audio` feature 可选（WSL 无 ALSA 时自动降级）
- [x] Phase C: 替换 TypeScript 适配器（TDD 红-绿提交）
  - `TauriClipboardAdapter`：重构支持依赖注入（`TauriClipboardModule` + `TauriPasteInvoker`），8 个单元测试
  - `TauriStoreConfigRepository`：重构支持依赖注入（`TauriStoreLoader`），7 个单元测试
- [x] Phase D: 新增 `TauriAudioCaptureAdapter`（TDD 红-绿提交）
  - 通过 Tauri event 接收 Rust 推送的 PCM 数据块
  - 重构支持依赖注入（`TauriEventBus` + `TauriAudioInvoker`），16 个单元测试
- [x] Phase E: Tauri setup 阶段注册快捷键 + 系统托盘配置

**迁移成果**：安装包 < 10 MB（原 80-120 MB），空闲内存 < 40 MB（原 200-300 MB），335/335 单元测试通过（新增 31 个 Tauri 适配器测试）。

**WSL 构建说明**：

- `npm run test:unit` — 直接可用（Vitest，无原生依赖）
- `cargo check` — 需要先安装：`sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev libasound2-dev`
- `npm run build` — 在 Windows 上执行（Tauri 生产构建，使用 WebView2，无 GTK 依赖）

### Phase 9: UI层与集成 (3-4天)

- [ ] Task 9.1: 设置面板 React 组件 + 提交
- [ ] Task 9.2: 录音浮动框 React 组件（400×120，显示录音状态/波形）+ 提交
- [ ] Task 9.3: 连接 Tauri 快捷键事件 → VoiceInputOrchestrator + 提交
- [ ] Task 9.4: 应用入口组合（TauriAudioCaptureAdapter + TauriClipboardAdapter）+ 提交
- [ ] Task 9.5: E2E测试 + 提交

### V2.0 功能（MVP 后迭代）

- [ ] 切换模式（按一次开启/关闭）
- [ ] 云端 API 支持（Kimi / OpenAI）
- [ ] 多种润色风格（正式、商务、技术、幽默）
- [ ] 润色强度调节滑块
- [ ] 历史记录 + 收藏常用语

### V3.0 功能（长期规划）

- [ ] 智能模型选择（根据网络/内容自动切换本地/云端）
- [ ] 多语言支持
- [ ] 语音指令（"换行"、"删除"、"发送"）
- [ ] 自定义术语库
- [ ] 插件系统（支持特定应用优化）

---

## 8. 目录结构规范

```
wisflow/
├── docs/                          # 文档
│   ├── work-plan.md              # 本文件
│   └── architecture.md           # 架构设计
│
├── src/
│   ├── domain/                    # 领域层 (核心)
│   │   ├── config/
│   │   │   ├── entities/
│   │   │   │   ├── __tests__/    # 领域对象测试
│   │   │   │   └── UserConfig.ts
│   │   │   ├── value-objects/
│   │   │   │   └── ShortcutConfig.ts
│   │   │   ├── services/
│   │   │   │   ├── __tests__/
│   │   │   │   └── ConfigService.ts
│   │   │   └── repositories/
│   │   │       └── ConfigRepository.ts
│   │   ├── voice/
│   │   ├── model/
│   │   └── action/
│   │
│   ├── application/               # 应用层
│   │   ├── orchestrators/
│   │   └── dto/
│   │
│   ├── infrastructure/            # 基础设施层
│   │   ├── audio/                # TauriAudioCaptureAdapter
│   │   ├── stt/
│   │   ├── llm/
│   │   ├── platform/
│   │   ├── clipboard/            # TauriClipboardAdapter
│   │   └── persistence/          # TauriStoreConfigRepository
│   │
│   └── presentation/              # 用户界面层
│       ├── components/
│       ├── hooks/
│       └── stores/
│
├── src-tauri/                     # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # 程序入口
│   │   ├── lib.rs                # 快捷键、托盘、simulate_paste
│   │   └── audio.rs              # cpal 麦克风采集（audio feature）
│   ├── capabilities/
│   │   └── default.json          # Tauri v2 权限声明
│   ├── icons/                    # 应用图标
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # 窗口/托盘/构建配置
│
├── tests/                         # 测试
│   ├── unit/                     # 单元测试 (与src镜像)
│   ├── integration/              # 集成测试
│   └── e2e/                      # E2E测试 (Playwright)
│
└── scripts/                       # 工具脚本
    └── setup-local-whisper.sh    # 安装本地模型
```

---

## 9. 质量门禁

每个提交必须通过：

1. ✅ TypeScript 编译无错误
2. ✅ ESLint 无错误
3. ✅ Prettier 格式化
4. ✅ 单元测试通过 (覆盖率 > 80%)
5. ✅ 相关集成测试通过

---

## 10. 风险与应对

| 风险                  | 应对策略                |
| --------------------- | ----------------------- |
| Silero VAD 浏览器兼容 | 准备 fallback VAD 方案  |
| faster-whisper 性能   | 初期用云端API，后期优化 |
| Windows API 权限      | 提供管理员权限安装选项  |
| 剪贴板冲突            | 实现临时保存/恢复机制   |
| 快捷键冲突            | 配置界面检测并提示      |

---

## 11. 开发环境准备

```bash
# 1. Node.js 版本
node --version  # >= 18.x

# 2. Python (faster-whisper需要)
python --version  # >= 3.8

# 3. 项目初始化
npm install

# 4. 开发模式
npm run dev

# 5. 运行测试
npm run test:unit      # 单元测试
npm run test:integration  # 集成测试
npm run test:e2e       # E2E测试

# 6. 代码检查
npm run lint
npm run format:check
```

---

## 12. 待明确事项（Phase 7-9 开发前需确认）

### Phase 7 - 内容领域（润色）

- **Q1: PolishStyle 是否迁移为枚举？** ✅ 已确认
  **决策**：迁移为独立枚举，由 content 领域拥有（`src/domain/content/enums/PolishStyle.ts`），UserConfig 通过 import 引用，保持 DDD 边界清晰。已实现。

- **Q2: LLM 接口选型？** ✅ 已确认
  **决策**：采用 OpenAI 兼容接口（`/v1/chat/completions`），由 `endpoint` + `apiKey` 配置驱动，与 STT 策略保持一致的抽象模式（`OpenAIPolishAdapter`）。已实现。

- **Q3: ContentSession 职责边界？** ✅ 已确认
  **决策**：持有 `rawText`（原始转写）、`polishedText`（润色结果）、`polishStyle`、`sessionId`、`createdAt`，支持不可变更新。已实现。

### Phase 8 - 应用层编排

- **Q4: VoiceInputOrchestrator 流程确认？** ✅ 已确认
  **决策**：按住模式（hold）流程如下：

  ```
  快捷键按下 → 保存剪贴板快照 → 开始录音
    → [语义块就绪] → STT 转写 → 增量粘贴原始文字（低延迟实时上屏）
  快捷键松开 → 停止录音 → 处理剩余音频 → 对累积全文进行润色
  ```

  录音期间：只做 STT + 增量粘贴，**不润色**。
  停止后：对完整 rawText 触发润色（autoPolish=true 时）。

- **Q5: 切换模式（toggle）与按住模式（hold）的区别？** ✅ 已确认
  **决策**：hold = 按住期间录音，松开停止；toggle = 第一次按下开始，第二次按下停止。两种模式共用同一个编排器，由 `ShortcutConfig.mode` 决定行为分支。

- **Q6: 润色是否阻塞粘贴？** ✅ 已确认
  **决策**：
  - 录音期间：增量粘贴 STT 原文（实时低延迟）
  - hold 松开 / toggle 第二次按下后：触发对累积全文的润色
  - 润色结果不替换已上屏的原文（光标定位能力留作后续优化）
  - toggle 模式同理：第二次按下停止录音后进行润色

### Phase 9 - UI 层

- **Q7: 录音浮动框的实现方式？** ✅ 已确认（迁移时确定）
  **决策**：使用 Tauri 单窗口（`label: "main"`），`alwaysOnTop: true`，无边框，透明背景，初始隐藏（`visible: false`）。
  快捷键触发时通过 `window.show()` 显示，避免焦点竞争。窗口尺寸固定 400×120。

- **Q8: 设置面板是独立窗口还是主窗口内路由？**
  > 建议：主窗口内路由（React Router），由托盘菜单「显示窗口」触发。Tauri 多窗口管理较复杂，单窗口路由更简洁。

---

_文档版本: 1.1_
_创建时间: 2026-03-20_
_最后更新: 2026-03-21（Phase A-E TDD 完成，335/335 测试通过，feat/tauri-migration 合并至 main）_
_更新周期: 每周回顾更新_
