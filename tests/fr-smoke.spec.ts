import 'dotenv/config'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '../app/generated/prisma'

const runtimeReady = Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET)
const prisma = new PrismaClient()
const createdUsernames = new Set<string>()

test.skip(!runtimeReady, 'DATABASE_URL and SESSION_SECRET are required for app smoke tests.')

test.afterEach(async () => {
  const usernames = Array.from(createdUsernames)
  createdUsernames.clear()
  if (usernames.length === 0) return

  await prisma.user.deleteMany({
    where: {
      username: { in: usernames },
    },
  })
})

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
}

test('public support, about, and reset pages render', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { name: 'PatientPath' })).toBeVisible()

  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Contact Support' })).toBeVisible()

  await page.goto('/reset-password')
  await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
})

test('public registration is closed', async ({ page }) => {
  await page.goto('/register')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByRole('link', { name: /create/i })).toHaveCount(0)
})

test('doctor can search patient profile and open referral search', async ({ page }) => {
  await login(page, 'fayez', '1234')
  await page.goto('/dashboard/forward')
  await page.getByPlaceholder(/University ID/).fill('0233949')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('heading', { name: 'Saleh Ahmad', level: 4 })).toBeVisible({ timeout: 15_000 })

  await page.goto('/dashboard/referrals')
  await expect(page.getByPlaceholder(/Search by student/)).toBeVisible()
})

test('specialist queue exposes missing referral actions', async ({ page }) => {
  await login(page, 'hospital', '1234')
  await page.goto('/dashboard/queue')
  await expect(page.getByPlaceholder(/Search by student/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update Status' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request Info' }).first()).toBeVisible()
})

test('non-admin users cannot open user management', async ({ page }) => {
  await login(page, 'fayez', '1234')
  await page.goto('/dashboard/users')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'User Management' })).toHaveCount(0)
})

test('admin reports and support queues render', async ({ page }) => {
  await login(page, 'admin', 'admin')
  await page.goto('/dashboard/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByText('Completion Rate')).toBeVisible()

  await page.goto('/dashboard/support')
  await expect(page.getByRole('heading', { name: 'Support Requests' })).toBeVisible()
})

test('admin can create a patient user', async ({ page }) => {
  const suffix = Date.now().toString(36)
  const username = `e2epatient${suffix}`
  const password = `Pass${suffix}`
  const email = `${username}@example.test`
  const uniId = `e2e-${suffix}`
  createdUsernames.add(username)

  await login(page, 'admin', 'admin')
  await page.goto('/dashboard/users')
  await page.getByRole('button', { name: 'Create User' }).click()
  await expect(page.getByTestId('create-user-modal')).toBeVisible()

  await page.getByLabel(/Username/).fill(username)
  await page.getByLabel(/Email/).fill(email)
  await page.getByLabel(/Password/).fill(password)
  await page.getByLabel(/Full name/).fill('E2E Patient')
  await page.getByLabel(/University ID/).fill(uniId)
  await page.getByLabel(/Gender/).selectOption('MALE')
  await page.getByLabel(/Date of birth/).fill('2001-05-12')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByTestId('create-user-modal')).toBeHidden({ timeout: 20_000 })
  await expect(page.getByPlaceholder(/Search by username/)).toHaveValue(username)
  await expect(page.getByText(username, { exact: true })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText(password)).toBeVisible()
})

test('admin create user validates specialist essentials', async ({ page }) => {
  const suffix = Date.now().toString(36)

  await login(page, 'admin', 'admin')
  await page.goto('/dashboard/users')
  await page.getByRole('button', { name: 'Create User' }).click()
  await page.getByLabel(/Role/).selectOption('SPECIALIST')
  await page.getByLabel(/Username/).fill(`e2especialist${suffix}`)
  await page.getByLabel(/Email/).fill(`e2especialist${suffix}@example.test`)
  await page.getByLabel(/Password/).fill(`Pass${suffix}`)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Full name is required.')).toBeVisible()
  await expect(page.getByText('Title is required.')).toBeVisible()
  await expect(page.getByText('Choose a hospital for the specialist.')).toBeVisible()
})
