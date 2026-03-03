import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Navigate to home and then passwords (simulating dashboard)
        await page.goto("http://localhost:8080/dashboard/passwords")
        await asyncio.sleep(2) # Wait for animations
        await page.screenshot(path="passwords_check.png", full_page=True)
        await browser.close()

asyncio.run(run())
