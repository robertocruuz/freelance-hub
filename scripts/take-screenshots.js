import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Switching to register...");
    await page.click('p.mt-6 button');

    await new Promise(r => setTimeout(r, 1000));

    console.log("Filling form...");
    await page.waitForSelector('input[placeholder="Seu nome"]', { timeout: 4000 });
    
    const email = `test-${Date.now()}@freelancehub.local`;
    const pass = `pWd123!!${Date.now()}`;
    await page.type('input[placeholder="Seu nome"]', 'Screenshot User');
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', pass);

    console.log("Submitting...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    console.log("Waiting for dashboard...");
    await page.waitForFunction(() => window.location.pathname.includes('dashboard'), { timeout: 15000 }).catch(() => {});
    
    // Sleep a bit for charts to load
    await new Promise(r => setTimeout(r, 5000));

    console.log("Taking screenshots...");
    // Home Dashboard screenshot -> home.png
    await page.screenshot({ path: 'public/home.png' });
    console.log("Saved home.png");

    const routes = [
      { url: '/dashboard/clients', file: 'src/assets/feature-clients.jpg' },
      { url: '/dashboard/kanban', file: 'src/assets/feature-kanban.jpg' },
      { url: '/dashboard/time', file: 'src/assets/feature-timetracking.jpg' },
      { url: '/dashboard/budgets', file: 'src/assets/feature-budgets.jpg' },
      { url: '/dashboard/finance', file: 'src/assets/feature-invoices.jpg' },
      { url: '/dashboard/settings', file: 'src/assets/feature-vault.jpg' }
    ];

    for (const route of routes) {
      console.log(`Navigating to ${route.url}...`);
      await page.goto(`http://localhost:5174${route.url}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000)); 
      await page.screenshot({ path: route.file });
    }

    console.log("SUCCESS!");
  } catch (err) {
    console.error("FAILED:", err);
  } finally {
    await browser.close();
  }
})();
