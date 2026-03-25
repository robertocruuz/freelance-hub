import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    console.log("Navigating...");
    await page.goto('http://localhost:54391/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    console.log("BODY HTML snippets:", html.substring(0, 1000));

    const buttons = await page.$$eval('button', bs => bs.map(b => b.textContent));
    console.log("BUTTONS FOUND:", buttons);

  } catch (err) {
    console.error("FAILED:", err);
  } finally {
    await browser.close();
  }
})();
