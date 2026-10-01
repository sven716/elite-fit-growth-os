// Rendert elke .frame uit creatives.html naar een PNG in ./png/
// Gebruik: node marketing/ads-funnel/ads/render.mjs
// Vereist Playwright (npx playwright install chromium als je het lokaal draait).
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Lokaal geïnstalleerd of globaal (NODE_PATH) werkt allebei.
const { chromium } = await import("playwright").catch(() =>
  createRequire(import.meta.url)("playwright"),
);

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "png");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
await page.goto(pathToFileURL(join(here, "creatives.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
// Body-achtergrond weg, zodat de hook-titels echt transparant zijn.
await page.evaluate(() => { document.body.style.background = "transparent"; });

const ids = await page.$$eval(".frame", (els) => els.map((el) => el.id));
for (const id of ids) {
  const transparent = id.startsWith("hook-");
  await page.locator(`#${id}`).screenshot({
    path: join(outDir, `${id}.png`),
    omitBackground: transparent,
  });
  console.log(`✓ ${id}.png`);
}
await browser.close();
