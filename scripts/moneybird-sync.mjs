#!/usr/bin/env node
/**
 * Haalt omzet, nieuwe klanten en kosten uit Moneybird en print het resultaat
 * als JSON. De geplande Cowork-taak schrijft die cijfers daarna via de
 * Supabase-koppeling naar de database.
 *
 * Het Moneybird-token staat in ~/.elite-fit/moneybird-token (rechten 600) en
 * komt nooit in de app of in de database terecht.
 *
 * Gebruik: node scripts/moneybird-sync.mjs
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TOKEN = readFileSync(
  join(homedir(), ".elite-fit", "moneybird-token"),
  "utf8",
).trim();
const ADMIN_ID = "397670946875377571";
const API = `https://moneybird.com/api/v2/${ADMIN_ID}`;

/** Alle pagina's van een Moneybird-endpoint ophalen. */
async function fetchAll(path, filter) {
  const results = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${API}/${path}?page=${page}&per_page=100${
      filter ? `&filter=${encodeURIComponent(filter)}` : ""
    }`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`Moneybird ${path}: ${res.status}`);
    const batch = await res.json();
    results.push(...batch);
    if (batch.length < 100) break;
  }
  return results;
}

/** Nederlandse datum van vandaag (YYYY-MM-DD). */
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Bedrag in euro's. Moneybird geeft bij vreemde valuta het bedrag in de
 * oorspronkelijke munt; `_base` is altijd omgerekend naar euro.
 */
function euro(doc) {
  const base = doc.total_price_incl_tax_base;
  if (base !== undefined && base !== null) return Number(base);
  return Number(doc.total_price_incl_tax || 0);
}

const day = today();
const month = day.slice(0, 7);
const year = day.slice(0, 4);

// --- Omzet: facturen die de deur uit zijn (betaald, open of te laat) ---
const invoices = await fetchAll(
  "sales_invoices.json",
  "period:this_year,state:paid|open|late",
);
const dated = invoices.filter((i) => i.invoice_date);

const sumFor = (prefix) =>
  dated
    .filter((i) => i.invoice_date.startsWith(prefix))
    .reduce((sum, i) => sum + euro(i), 0);

// Alleen daadwerkelijk betaald — dit is wat er echt binnenkwam.
const paidFor = (prefix) =>
  dated
    .filter((i) => i.invoice_date.startsWith(prefix) && i.state === "paid")
    .reduce((sum, i) => sum + euro(i), 0);

// --- Nieuwe klanten deze maand: contacten met hun eerste factuur ooit ---
const allInvoices = await fetchAll("sales_invoices.json");
const firstByContact = new Map();
for (const inv of allInvoices) {
  if (!inv.invoice_date || !inv.contact_id) continue;
  const prev = firstByContact.get(inv.contact_id);
  if (!prev || inv.invoice_date < prev) {
    firstByContact.set(inv.contact_id, inv.invoice_date);
  }
}
const newClientsMonth = [...firstByContact.values()].filter((d) =>
  d.startsWith(month),
).length;

// --- Kosten: inkoopfacturen ---
const purchases = await fetchAll(
  "documents/purchase_invoices.json",
  "period:this_year",
);
const costFor = (prefix) =>
  purchases
    .filter((p) => p.date?.startsWith(prefix))
    .reduce((sum, p) => sum + euro(p), 0);

// --- Grootste kostenposten deze maand, voor de coach ---
const topCosts = purchases
  .filter((p) => p.date?.startsWith(month))
  .map((p) => ({
    leverancier: p.contact?.company_name ?? p.contact?.firstname ?? "onbekend",
    bedrag: euro(p),
    datum: p.date,
  }))
  .sort((a, b) => b.bedrag - a.bedrag)
  .slice(0, 8);

console.log(
  JSON.stringify(
    {
      datum: day,
      maand: month,
      jaar: year,
      omzet_maand_gefactureerd: Number(sumFor(month).toFixed(2)),
      omzet_maand_betaald: Number(paidFor(month).toFixed(2)),
      omzet_jaar_gefactureerd: Number(sumFor(year).toFixed(2)),
      omzet_jaar_betaald: Number(paidFor(year).toFixed(2)),
      nieuwe_klanten_maand: newClientsMonth,
      kosten_maand: Number(costFor(month).toFixed(2)),
      kosten_jaar: Number(costFor(year).toFixed(2)),
      grootste_kostenposten_maand: topCosts,
      aantal_facturen: dated.length,
      aantal_inkoopfacturen: purchases.length,
    },
    null,
    2,
  ),
);
