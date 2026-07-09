import asyncio
import os
from playwright.async_api import async_playwright

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        print("Opening login page...")
        await page.goto("http://localhost:3000/login")
        await page.wait_for_load_state("networkidle")

        print("Entering credentials...")
        await page.fill('input[type="email"]', "testuser@example.com")
        await page.fill('input[type="password"]', "strongpassword123")

        print("Clicking submit...")
        await page.click('button[type="submit"]')

        print("Waiting for redirection...")
        await page.wait_for_url("**/dashboard", timeout=10000)
        await page.wait_for_load_state("networkidle")

        print("Waiting for charts animations...")
        await asyncio.sleep(3.0)

        dest_dir = "/Users/akilan/.gemini/antigravity-ide/brain/daae4c0d-193c-49bd-b2a4-0154a0557057"
        os.makedirs(dest_dir, exist_ok=True)
        dashboard_path = f"{dest_dir}/dashboard_chart_preview.png"
        expenses_path = f"{dest_dir}/expenses_ocr_preview.png"

        print(f"Capturing dashboard to {dashboard_path}...")
        await page.screenshot(path=dashboard_path)

        print("Navigating to expenses page...")
        await page.goto("http://localhost:3000/expenses")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1.5)

        print(f"Capturing expenses to {expenses_path}...")
        await page.screenshot(path=expenses_path)

        await browser.close()
        print("Done! Screenshots saved successfully.")

if __name__ == "__main__":
    asyncio.run(capture())
