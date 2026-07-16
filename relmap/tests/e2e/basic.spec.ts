import { test, expect } from '@playwright/test'

test.describe('RelMap Basic Tests', () => {
  test('should load the app and show the dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForSelector('text=RelMap', { timeout: 10000 })
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=首页').first()).toBeVisible()
    await expect(page.locator('text=联系人').first()).toBeVisible()
    await expect(page.locator('text=关系图谱').first()).toBeVisible()
  })

  test('should navigate to persons page', async ({ page }) => {
    await page.goto('http://localhost:5173/persons')
    await page.waitForSelector('text=联系人', { timeout: 5000 })
    await expect(page.locator('text=新建').first()).toBeVisible()
  })

  test('should navigate to graph page', async ({ page }) => {
    await page.goto('http://localhost:5173/graph')
    await page.waitForSelector('text=关系图谱', { timeout: 5000 })
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('http://localhost:5173/settings')
    await page.waitForSelector('text=设置', { timeout: 5000 })
  })

  test('should navigate to help page', async ({ page }) => {
    await page.goto('http://localhost:5173/help')
    await page.waitForSelector('text=帮助', { timeout: 5000 })
  })

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics')
    await page.waitForSelector('text=数据分析', { timeout: 5000 })
  })

  test('should navigate to wrapped page', async ({ page }) => {
    await page.goto('http://localhost:5173/wrapped')
    await page.waitForSelector('text=年度', { timeout: 5000 })
  })
})
