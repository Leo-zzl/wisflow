# WisFlow 项目工作方案

## 1. 技术选型与框架版本

### 核心框架
| 技术 | 版本 | 说明 |
|------|------|------|
| Electron | ^28.x | 桌面应用框架 |
| React | ^18.x | UI框架 |
| TypeScript | ^5.x | 类型系统（严格模式） |
| Vite | ^5.x | 构建工具（electron-vite） |

### 测试与质量
| 技术 | 版本 | 说明 |
|------|------|------|
| Vitest | ^1.x | 单元/集成测试框架 |
| Playwright | ^1.x | E2E测试框架 |
| @testing-library/react | ^14.x | React组件测试 |
| ESLint | ^8.x | 代码检查 |
| Prettier | ^3.x | 代码格式化 |

### 状态与样式
| 技术 | 版本 | 说明 |
|------|------|------|
| Zustand | ^4.x | 状态管理 |
| Tailwind CSS | ^3.x | CSS框架 |
| electron-store | ^8.x | 配置持久化 |

### 语音与AI
| 技术 | 版本 | 说明 |
|------|------|------|
| @ricky0123/vad | latest | Silero VAD (浏览器) |
| faster-whisper | (Python) | 本地STT |

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
  await expect(page.locator('[data-testid="recording-panel"]'))
    .toBeVisible();

  // 模拟语音输入（通过测试API）
  await page.evaluate(() => {
    window.__TEST_API__.injectAudio('test-audio.wav');
  });

  // 松开快捷键
  await page.keyboard.up('V');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');

  // 验证文本被粘贴
  await expect(page.locator('#editor'))
    .toHaveText(/今天天气/);
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
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
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
| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug修复 |
| test | 测试相关 |
| refactor | 重构（非功能变更）|
| docs | 文档 |
| chore | 构建/工具/依赖 |

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
- [ ] Task 1.1: electron-vite 项目初始化 + Git提交
- [ ] Task 1.2: ESLint + Prettier + TypeScript严格模式配置 + 提交
- [ ] Task 1.3: Vitest 测试框架配置 + 提交
- [ ] Task 1.4: Tailwind CSS + Zustand 配置 + 提交
- [ ] Task 1.5: DDD目录结构创建 + 提交
- [ ] Task 1.6: Husky + lint-staged 配置 + 提交

### Phase 2: 配置领域 (2-3天)
- [ ] Task 2.1: 测试 - UserConfig实体默认创建 + 红测试 + 提交
- [ ] Task 2.2: 实现 - UserConfig实体默认创建 + 绿测试 + 提交
- [ ] Task 2.3: 测试 - ShortcutConfig值对象验证 + 提交
- [ ] Task 2.4: 实现 - ShortcutConfig值对象 + 提交
- [ ] Task 2.5: 测试 - ConfigService持久化 + 提交
- [ ] Task 2.6: 实现 - electron-store适配器 + 提交

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
- [ ] Task 5.1: 测试 - ModelRegistry接口 + 提交
- [ ] Task 5.2: 实现 - ModelRegistry + 提交
- [ ] Task 5.3: 测试 - CloudSTT策略 + 提交
- [ ] Task 5.4: 实现 - OpenAI兼容接口适配器 + 提交
- [ ] Task 5.5: 测试 - LocalWhisper策略 + 提交
- [ ] Task 5.6: 实现 - faster-whisper集成 + 提交

### Phase 6: 执行领域 - 剪贴板 (2-3天)
- [ ] Task 6.1: 测试 - ClipboardService接口 + 提交
- [ ] Task 6.2: 实现 - Windows剪贴板适配器 + 提交
- [ ] Task 6.3: 测试 - PasterService增量粘贴 + 提交
- [ ] Task 6.4: 实现 - PasterService + 提交
- [ ] Task 6.5: 测试 - 剪贴板临时保存/恢复 + 提交

### Phase 7: 内容领域 - 润色 (2-3天)
- [ ] Task 7.1: 测试 - PolishStyle枚举 + 提交
- [ ] Task 7.2: 测试 - ContentSession聚合根 + 提交
- [ ] Task 7.3: 实现 - ContentSession + 提交
- [ ] Task 7.4: 测试 - PolishService多风格润色 + 提交
- [ ] Task 7.5: 实现 - LLM调用集成 + 提交

### Phase 8: 应用层编排 (2-3天)
- [ ] Task 8.1: 测试 - VoiceInputOrchestrator按住模式 + 提交
- [ ] Task 8.2: 实现 - VoiceInputOrchestrator + 提交
- [ ] Task 8.3: 测试 - VoiceInputOrchestrator切换模式 + 提交
- [ ] Task 8.4: 集成测试 - 完整流程 + 提交

### Phase 9: UI层与集成 (3-4天)
- [ ] Task 9.1: 设置面板UI + 提交
- [ ] Task 9.2: 录音浮动框UI + 提交
- [ ] Task 9.3: 系统托盘集成 + 提交
- [ ] Task 9.4: 全局快捷键集成 + 提交
- [ ] Task 9.5: E2E测试 + 提交

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
│   │   ├── audio/
│   │   ├── stt/
│   │   ├── llm/
│   │   ├── platform/
│   │   └── persistence/
│   │
│   └── presentation/              # 用户界面层
│       ├── components/
│       ├── hooks/
│       └── stores/
│
├── tests/                         # 测试
│   ├── unit/                     # 单元测试 (与src镜像)
│   ├── integration/              # 集成测试
│   └── e2e/                      # E2E测试 (Playwright)
│
├── electron/                      # Electron主进程
│   ├── main/
│   └── preload/
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

| 风险 | 应对策略 |
|------|----------|
| Silero VAD 浏览器兼容 | 准备 fallback VAD 方案 |
| faster-whisper 性能 | 初期用云端API，后期优化 |
| Windows API 权限 | 提供管理员权限安装选项 |
| 剪贴板冲突 | 实现临时保存/恢复机制 |
| 快捷键冲突 | 配置界面检测并提示 |

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

*文档版本: 1.0*
*创建时间: 2026-03-20*
*更新周期: 每周回顾更新*
