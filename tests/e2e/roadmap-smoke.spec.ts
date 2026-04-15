import { test, expect } from '@playwright/test';

test.skip('roadmap page smoke', async ({ page }) => {
  await page.goto('/roadmap');
  await expect(page.getByText('Lộ trình học cá nhân hóa')).toBeVisible();
});
