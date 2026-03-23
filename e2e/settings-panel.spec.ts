import { test, expect } from '@playwright/test';

/**
 * E2E 测试：设置面板关键用户流程
 */

test.describe('设置面板', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
  });

  test.describe('页面加载', () => {
    test('用户打开设置面板时应看到页面标题', async ({ page }) => {
      // 标题栏应包含 WisFlow 和语音输入设置
      await expect(page.locator('text=WisFlow')).toBeVisible();
      await expect(page.locator('text=语音输入设置')).toBeVisible();
    });

    test('用户打开设置面板时应看到快捷键区域', async ({ page }) => {
      await expect(page.getByTestId('shortcut-capture-area')).toBeVisible();
      await expect(page.locator('[data-testid="shortcut-display"]')).toContainText(/Ctrl/);
    });

    test('用户打开设置面板时应看到润色风格选择器', async ({ page }) => {
      // 点击润色风格Tab
      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();

      // 应看到润色风格选项
      await expect(page.locator('text=口水化')).toBeVisible();
      await expect(page.locator('text=轻度去口水')).toBeVisible();
      await expect(page.locator('text=深度精炼')).toBeVisible();
    });
  });

  test.describe('快捷键修改', () => {
    test('用户点击快捷键区域后应能获得焦点', async ({ page }) => {
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await expect(captureArea).toBeFocused();
    });

    test('用户按下新快捷键后界面应立即更新显示新快捷键', async ({ page }) => {
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      // 按下 Ctrl+Alt+X
      await captureArea.press('Control+Alt+x');
      // 快捷键显示应更新
      const shortcutDisplay = page.locator('[data-testid="shortcut-display"]');
      const text = await shortcutDisplay.textContent();
      expect(text).toMatch(/Ctrl.*X|X.*Ctrl/i);
    });

    test('用户按下快捷键后应显示检测中状态', async ({ page }) => {
      // 使用极长防抖，让 checking 状态可见
      const captureArea = page.getByTestId('shortcut-capture-area');
      await captureArea.click();
      await captureArea.press('Control+Alt+x');
      // 检测中指示符应在防抖期间可见
      await expect(page.getByTestId('shortcut-checking')).toBeVisible();
    });
  });

  test.describe('润色风格选择', () => {
    test('用户选择不同润色风格后界面应更新选中值', async ({ page }) => {
      // 切换到润色风格Tab
      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();

      // 选择深度精炼
      const deepStyleOption = page.locator('button').filter({ hasText: /深度精炼/ });
      await deepStyleOption.click();

      // 应显示选中状态
      const selectedStyle = page.locator('[data-testid="polish-style-selected"]');
      await expect(selectedStyle).toBeVisible();
      await expect(selectedStyle).toContainText('深度精炼');
    });

    test('润色风格选择器应包含所有预期选项', async ({ page }) => {
      const polishTab = page.getByRole('button', { name: /润色风格/ });
      await polishTab.click();

      // 应包含所有选项
      await expect(page.locator('button').filter({ hasText: /口水化/ })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /轻度去口水/ })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /深度精炼/ })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /浓缩版/ })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /自定义/ })).toBeVisible();
    });
  });
});
