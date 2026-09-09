import { expect, test } from '@playwright/test'

test('carrega o app e mostra o nome do produto', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('HMB Fluxo')).toBeVisible()
})
