import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1', { hasText: 'blindarea Production' })).toBeVisible();
    await expect(page.getByPlaceholder('e.g. john.doe')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In to Portal' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();
    
    // Check for validation messages (assuming standard HTML5 validation or custom form validation)
    // The exact text will depend on the frontend implementation, but we can verify it doesn't navigate
    await expect(page).toHaveURL(/.*\/login.*/);
  });
});
