# Ads-funnel: Meta Ads naar strategiegesprek

Alle bouwstenen voor de funnel uit het strategiedocument "Elite Fit – Ads naar Strategiegesprek: Complete Funnel".

| Map / bestand | Wat |
| --- | --- |
| `landing/index.html` | Landingspagina met VSL, aanpak, resultaten, FAQ en plek voor het GHL-formulier. Zelfstandig HTML, te plakken in een GHL Custom Code-element. |
| `landing/bedankt.html` | Bedankpagina na boeking (hier vuurt het Meta-event `Schedule`). |
| `ads/creatives.html` | Bron van alle ad-visuals in Elite Fit-huisstijl. |
| `ads/png/` | Gerenderde visuals: statics (4:5 en 9:16), carousel (7 slides), retargeting en transparante hook-titels voor de video-ads. |
| `ads/render.mjs` | Rendert `creatives.html` opnieuw naar PNG. |
| `fonts/` | Barlow Condensed en Lato (SIL Open Font License), lokaal voor het renderen. |
| `GHL-BOUWHANDLEIDING.md` | Klik-voor-klik opbouw in GoHighLevel: velden, pipeline, kalender, survey, funnel, 9 workflows, pixel en testchecklist. |

## Foto's toevoegen en opnieuw renderen

1. Zet foto's in `ads/img/`: `voor.jpg`, `na.jpg` (klant −10 kg) en `sven.jpg`.
   Voor de landingspagina in `landing/img/`: `frits.jpg`, `mart.jpg`, `jarne.jpg`, `klant.jpg`, `sven.jpg`.
2. Pas zo nodig teksten aan in `ads/creatives.html` (bijvoorbeeld het aantal plekken en de maand in retargeting R3).
3. Render opnieuw:

   ```bash
   npm i -D playwright && npx playwright install chromium   # eenmalig
   node marketing/ads-funnel/ads/render.mjs
   ```

Vraag altijd toestemming aan klanten voordat je hun naam, foto of resultaat in een ad gebruikt.
