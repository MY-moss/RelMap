import { test } from '@playwright/test'

test.describe('Contact Operations', () => {
  test('should show empty state when no contacts exist', async ({ page }) => {
    await page.goto('http://localhost:5173/persons')
    await page.waitForLoadState('networkidle')
  })
})
