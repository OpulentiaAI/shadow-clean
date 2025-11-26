import { test, expect } from '@playwright/test';

test.describe('RichTextEditor Components', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3000');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the Opulent Code header with logo', async ({ page }) => {
    // Check for the new branding
    const header = page.locator('text=Opulent Code');
    await expect(header).toBeVisible();
    
    // Check for the logo
    const logo = page.locator('img[alt="Opulent Logo"]');
    await expect(logo).toBeVisible();
  });

  test('should display the RichTextEditor with placeholder', async ({ page }) => {
    // Check for the editor placeholder
    const placeholder = page.locator('text=Build features, fix bugs, and understand codebases...');
    await expect(placeholder).toBeVisible();
  });

  test('should open Model Selector popover', async ({ page }) => {
    // Click on the model selector button
    const modelButton = page.locator('button:has-text("No Model Selected")');
    await expect(modelButton).toBeVisible();
    await modelButton.click();
    
    // Wait for popover to appear
    await page.waitForTimeout(500);
    
    // Check for the "Manage API Keys" link in the popover
    const manageKeysButton = page.locator('text=Manage API Keys');
    await expect(manageKeysButton).toBeVisible();
  });

  test('should open Local Repo selector popover', async ({ page }) => {
    // Click on the local repo button
    const localRepoButton = page.locator('button:has-text("Local Repo")');
    await expect(localRepoButton).toBeVisible();
    await localRepoButton.click();
    
    // Wait for popover to appear
    await page.waitForTimeout(500);
    
    // Check for the input field
    const pathInput = page.locator('input[placeholder="/path/to/your/repo"]');
    await expect(pathInput).toBeVisible();
    
    // Check for the "Select Repository" button
    const selectButton = page.locator('button:has-text("Select Repository")');
    await expect(selectButton).toBeVisible();
  });

  test('should enter local repo path and select', async ({ page }) => {
    // Click on the local repo button
    const localRepoButton = page.locator('button:has-text("Local Repo")');
    await localRepoButton.click();
    
    // Wait for popover
    await page.waitForTimeout(500);
    
    // Enter a path
    const pathInput = page.locator('input[placeholder="/path/to/your/repo"]');
    await pathInput.fill('/Users/jeremyalston/shadow-clean');
    
    // Click select
    const selectButton = page.locator('button:has-text("Select Repository")');
    await selectButton.click();
    
    // Wait for selection to complete
    await page.waitForTimeout(1000);
    
    // Check that the button now shows the repo name
    const selectedRepo = page.locator('button:has-text("shadow-clean")');
    await expect(selectedRepo).toBeVisible();
  });

  test('should type in the editor', async ({ page }) => {
    // Find the contenteditable div
    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toBeVisible();
    
    // Click to focus
    await editor.click();
    
    // Type a message
    await page.keyboard.type('Test message for the editor');
    
    // Check the placeholder is gone
    const placeholder = page.locator('text=Build features, fix bugs, and understand codebases...');
    await expect(placeholder).not.toBeVisible();
  });

  test('should have submit button disabled without repo/model', async ({ page }) => {
    // The submit button should be disabled initially
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should use keyboard shortcut to open model selector', async ({ page }) => {
    // Press Cmd+. to open model selector
    await page.keyboard.press('Meta+.');
    
    // Wait for popover
    await page.waitForTimeout(500);
    
    // Check that model selector popover is open
    const manageKeysButton = page.locator('text=Manage API Keys');
    await expect(manageKeysButton).toBeVisible();
  });
});
