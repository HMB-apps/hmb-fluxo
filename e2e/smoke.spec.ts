import { expect, test } from '@playwright/test'

test('carrega o app e mostra o nome do produto', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('HMB Fluxo')).toBeVisible()
})

test('usuário não autenticado é redirecionado para o login', async ({ page }) => {
  await page.goto('/quadro')
  await expect(page).toHaveURL(/\/login$/)
})

test('tela de login tem os campos essenciais', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('login com credenciais inválidas mostra erro claro', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('inexistente@example.com')
  await page.getByLabel('Senha').fill('senha-errada-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/e-mail ou senha incorretos|não foi possível entrar/i)).toBeVisible()
})

test('manifest do PWA é servido e aponta para o app correto', async ({ page }) => {
  const response = await page.goto('/manifest.webmanifest')
  expect(response?.ok()).toBe(true)
  const manifest = await response?.json()
  expect(manifest.name).toBe('HMB Fluxo')
  expect(manifest.start_url).toBe('/')
})
