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

        print("Navigating to chat page...")
        await page.goto("http://localhost:3000/chat")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2.0)

        print("Clicking suggested action...")
        await page.click('button:has-text("Show recent expenses")')

        print("Waiting for streaming response...")
        await asyncio.sleep(4.5)

        dest_dir = "/Users/akilan/.gemini/antigravity-ide/brain/daae4c0d-193c-49bd-b2a4-0154a0557057"
        chat_path = f"{dest_dir}/chat_assistant_preview.png"

        print(f"Capturing chat console to {chat_path}...")
        await page.screenshot(path=chat_path)

        await browser.close()
        print("Done! Chat screenshot saved successfully.")

if __name__ == "__main__":
    asyncio.run(capture())
