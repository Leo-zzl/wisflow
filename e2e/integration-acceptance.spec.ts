import { test, expect } from '@playwright/test';

/**
 * E2E 集成测试验收：端到端业务流程验证
 *
 * 测试范围：从用户操作到配置持久化的完整业务流
 * 目标：验证用户场景下的系统行为符合业务预期
 */

test.describe('端到端集成测试验收', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
  });

  test.describe('场景1：用户首次配置完整流程', () => {
    test('用户打开设置面板，修改快捷键、切换模式、选择润色风格，保存后配置应持久化', async ({
      page,
    }) => {
      // Arrange：验证初始状态
      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]').first();
      await expect(shortcutDisplay).toHaveText('Ctrl+Shift+V');

      // Act：修改快捷键为 Ctrl+Alt+X
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await captureArea.press('Control+Alt+x');
      await expect(shortcutDisplay).toContainText('Ctrl+Alt+X');

      // Act：切换为 toggle 模式
      const toggleModeBtn = page.getByRole('button', { name: /切换模式/ });
      await toggleModeBtn.click();

      // Act：选择润色风格为深度精炼
      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();
      const deepStyleOption = page.locator('button').filter({ hasText: /深度精炼/ });
      await deepStyleOption.click();

      // Act：点击保存
      const saveBtn = page.getByRole('button', { name: /保存设置/ });
      await saveBtn.click();

      // Assert：刷新页面后配置应持久化
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(shortcutDisplay).toContainText('Ctrl+Alt+X');

      // 验证润色风格保持
      await polishTab.click();
      const selectedStyle = page.locator('[data-testid="polish-style-selected"]').first();
      await expect(selectedStyle).toContainText('深度精炼');
    });
  });

  test.describe('场景2：快捷键冲突检测完整流程', () => {
    test('用户设置冲突快捷键时，系统应显示冲突警告，修改为不冲突快捷键后警告消失', async ({
      page,
    }) => {
      // Arrange：打开快捷键区域
      const captureArea = page.getByTestId('shortcut-capture-area');

      // Act：设置一个常用快捷键（可能与系统冲突）
      await captureArea.click();
      await captureArea.press('Control+c'); // Ctrl+C 是复制，很可能冲突

      // Assert：应显示冲突状态
      const conflictIndicator = page.getByTestId('shortcut-conflict');
      await expect(conflictIndicator).toBeVisible();
      await expect(conflictIndicator).toHaveText(/冲突/);

      // Act：修改为不太常用的组合
      await captureArea.click();
      await captureArea.press('Control+Shift+Alt+w');

      // Assert：冲突警告应消失，显示正常状态
      const okIndicator = page.getByTestId('shortcut-ok');
      await expect(okIndicator).toBeVisible();
      await expect(okIndicator).toHaveText(/未检测到冲突/);
    });

    test('用户点击重新检测按钮时，应触发新的冲突检测', async ({ page }) => {
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await captureArea.press('Control+Shift+v');

      // Act：点击重新检测
      const recheckBtn = page.getByRole('button', { name: /重新检测/ });
      await recheckBtn.click();

      // Assert：应显示检测中状态
      const checkingIndicator = page.getByTestId('shortcut-checking');
      await expect(checkingIndicator).toBeVisible();
      await expect(checkingIndicator).toHaveText(/检测中/);
    });
  });

  test.describe('场景3：多Tab配置完整流程', () => {
    test('用户在不同Tab间切换，修改的配置应在保存时全部持久化', async ({ page }) => {
      // Step1：在快捷键Tab修改
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await captureArea.press('Control+Shift+m');

      // Step2：切换到润色风格Tab修改
      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();
      const condensedStyle = page.locator('button').filter({ hasText: /浓缩版/ });
      await condensedStyle.click();

      // Step3：保存
      const saveBtn = page.getByRole('button', { name: /保存设置/ });
      await saveBtn.click();

      // Assert：刷新后两个配置都应保持
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 验证快捷键
      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]').first();
      await expect(shortcutDisplay).toContainText('Ctrl+Shift+M');

      // 验证润色风格
      await polishTab.click();
      const selectedStyle = page.locator('[data-testid="polish-style-selected"]').first();
      await expect(selectedStyle).toContainText('浓缩版');
    });
  });

  test.describe('场景4：取消操作不应保存配置', () => {
    test('用户修改配置后点击取消，刷新页面后应保持原配置', async ({ page }) => {
      // Arrange：记录原始配置
      const originalShortcut = await page
        .locator('[data-testid="shortcut-display"]')
        .first()
        .textContent();

      // Act：修改但不保存
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await captureArea.press('Control+Shift+9');

      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();
      const colloquialStyle = page.locator('button').filter({ hasText: /口水化/ });
      await colloquialStyle.click();

      // Act：点击取消
      const cancelBtn = page.getByRole('button', { name: /取消/ });
      await cancelBtn.click();

      // Assert：刷新后配置应恢复
      await page.reload();
      await page.waitForLoadState('networkidle');

      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]').first();
      await expect(shortcutDisplay).toHaveText(originalShortcut ?? 'Ctrl+Shift+V');
    });
  });

  test.describe('场景5：快捷键输入验证', () => {
    test('用户只按单个修饰键时不应触发快捷键更新', async ({ page }) => {
      const captureArea = page.getByTestId('shortcut-capture-area');
      const originalShortcut = await page
        .locator('[data-testid="shortcut-display"]')
        .first()
        .textContent();

      // Act：只按修饰键
      await captureArea.click();
      await captureArea.press('Control');
      await captureArea.press('Shift');
      await captureArea.press('Alt');

      // Assert：快捷键应保持不变
      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]').first();
      await expect(shortcutDisplay).toHaveText(originalShortcut ?? 'Ctrl+Shift+V');
    });

    test('用户按下带功能键的快捷键时应正确识别', async ({ page }) => {
      const captureArea = page.getByTestId('shortcut-capture-area');

      // Act：按下 Ctrl+Shift+F1
      await captureArea.click();
      await captureArea.press('Control+Shift+F1');

      // Assert：应显示正确格式
      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]').first();
      await expect(shortcutDisplay).toContainText('F1');
    });
  });
});
