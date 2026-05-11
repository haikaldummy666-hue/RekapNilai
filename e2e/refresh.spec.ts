import { test, expect } from "@playwright/test";

async function ensureOneStudent(page: any, name: string) {
  await page.goto("/identitas");
  await page.getByRole("button", { name: "+ Siswa Baru" }).click();
  await page.getByPlaceholder("Nama Lengkap").fill(name);
}

test("refresh keeps last visited route", async ({ page }) => {
  await ensureOneStudent(page, "Siswa E2E");
  await page.reload();
  await expect(page).toHaveURL(/\/identitas/);
});

test("identitas draft persists across refresh", async ({ page }) => {
  await ensureOneStudent(page, "Nama Draft E2E");
  const input = page.getByPlaceholder("Nama Lengkap");
  await input.fill("Nama Draft E2E");
  await page.reload();
  await expect(page.getByPlaceholder("Nama Lengkap")).toHaveValue("Nama Draft E2E");
});

test("siswa URL state (filter + modal) persists across refresh", async ({ page }) => {
  await ensureOneStudent(page, "Siswa E2E");
  await page.goto("/siswa");
  await page.getByPlaceholder("Cari nama / NISN / No Ujian…").fill("Siswa");
  await page.getByText("Siswa E2E").first().click();
  await expect(page).toHaveURL(/selectedId=/);
  await page.reload();
  await expect(page).toHaveURL(/selectedId=/);
  await expect(page.getByText("Jadikan Aktif")).toBeVisible();
});

test("scanning modal state persists across refresh", async ({ page }) => {
  await page.goto("/scanning?upload=1");
  await expect(page.getByText("Pindai Dokumen Nilai")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Pindai Dokumen Nilai")).toBeVisible();
});
