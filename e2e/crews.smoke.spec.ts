import { test, expect } from '@playwright/test';

test.describe('leaderboard crews (smoke)', () => {
  test('crews hub explains charters', async ({ page }) => {
    await page.goto('/crews');

    await expect(
      page.getByRole('heading', { name: 'Friend-group ladders' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discover crews' })).toBeVisible();
    await expect(page.getByText('Sign in to browse listed crews')).toBeVisible();
  });

  test('global official route renders crew detail shell', async ({ page }) => {
    await page.goto('/crews/global-official');

    await expect(page.getByTestId('crew-detail-page')).toBeVisible();
    await expect(page.getByRole('link', { name: '← All crews' })).toBeVisible();
    // Eyebrow is part of the static shell (not gated on Firebase success).
    await expect(page.getByText('Crew charter')).toBeVisible();
  });

  test('standings hub links to the Warp board', async ({ page }) => {
    await page.goto('/leaderboard');

    await expect(
      page.getByRole('heading', { name: 'Federation Standings' })
    ).toBeVisible();
  });

  test('warp board exposes Global Official board tab', async ({ page }) => {
    await page.goto('/leaderboard/warp');

    await expect(page.getByRole('heading', { name: 'Warp 12 TEI' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Global Official/ })).toBeVisible();
  });

  test('primary nav reaches crews and profile', async ({ page }) => {
    await page.goto('/');

    // Warp routes live behind the product menu; Federation Profile is top level.
    await page.getByRole('button', { name: /Warp/ }).click();
    await page.getByRole('menuitem', { name: 'Crews' }).click();
    await expect(page).toHaveURL(/\/crews$/);

    await page.getByRole('link', { name: 'Federation Profile' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: /Federation Profile/ })).toBeVisible();
  });
});
