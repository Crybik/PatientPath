import { expect, test } from '@playwright/test'

const runtimeReady = Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET)

test.skip(!runtimeReady, 'DATABASE_URL and SESSION_SECRET are required for app smoke tests.')

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('public support, about, and reset pages render', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { name: 'PatientPath' })).toBeVisible()

  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Contact Support' })).toBeVisible()

  await page.goto('/reset-password')
  await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
})

test('doctor can search patient profile and open referral search', async ({ page }) => {
  await login(page, 'fayez', '1234')
  await page.getByRole('link', { name: /Forward Note/ }).click()
  await page.getByPlaceholder(/University ID/).fill('0233949')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Saleh Ahmad')).toBeVisible()

  await page.getByRole('link', { name: /My Referrals/ }).click()
  await expect(page.getByPlaceholder(/Search by student/)).toBeVisible()
})

test('specialist queue exposes missing referral actions', async ({ page }) => {
  await login(page, 'hospital', '1234')
  await page.getByRole('link', { name: /Referral Queue/ }).click()
  await expect(page.getByPlaceholder(/Search by student/)).toBeVisible()
  await expect(page.getByText('Update Status')).toBeVisible()
  await expect(page.getByText('Request More Info')).toBeVisible()
})

test('admin reports and support queues render', async ({ page }) => {
  await login(page, 'admin', 'admin')
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByText('Completion Rate')).toBeVisible()

  await page.getByRole('link', { name: 'Support' }).click()
  await expect(page.getByRole('heading', { name: 'Support Requests' })).toBeVisible()
})
