import { test, expect } from '@playwright/test'

test.describe('Global Search', () => {
  test('should render search input', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="搜索"]')
    await expect(searchInput).toBeVisible()
  })
})
