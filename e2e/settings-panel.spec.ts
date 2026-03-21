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
      await expect(page.locator('h1')).toHaveText('WisFlow 设置');
    });

    test('用户打开设置面板时应看到快捷键区域', async ({ page }) => {
      await expect(page.getByTestId('shortcut-capture-area')).toBeVisible();
      await expect(page.locator('kbd')).toContainText('Ctrl+Shift+V');
    });

    test('用户打开设置面板时应看到润色风格选择器', async ({ page }) => {
      const select = page.locator('select#polish-style');
      await expect(select).toBeVisible();
      // 默认选项应为 'light'（UserConfig.createDefault 的默认值）
      await expect(select).toHaveValue('light');
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
      // kbd 应立即显示新快捷键（无防抖）
      await expect(page.locator('kbd')).toContainText('Ctrl+Alt+X');
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
      const select = page.locator('select#polish-style');
      await select.selectOption('deep');
      await expect(select).toHaveValue('deep');
    });

    test('润色风格选择器应包含所有预期选项', async ({ page }) => {
      const select = page.locator('select#polish-style');
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('口水化（保留口语特征）');
      expect(options).toContain('轻度去口水');
      expect(options).toContain('深度精炼');
      expect(options).toContain('浓缩版');
      expect(options).toContain('自定义');
    });
  });
});
