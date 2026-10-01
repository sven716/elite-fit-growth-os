# GoHighLevel bouwhandleiding: Ads naar strategiegesprek

Deze handleiding bouwt de funnel uit het strategiedocument klik voor klik na in GoHighLevel (GHL). Alle teksten van berichten staan in het strategiedocument (secties 5 tot en met 9). Hier staat **waar** ze komen en **wanneer** ze verstuurd worden.

> GHL laat workflows, funnels en surveys alleen via de editor aanmaken, niet via de API. Deze stappen doe je dus zelf. Reken op 3 tot 4 uur in totaal.

Bouwvolgorde: **1. Velden en tags → 2. Pipeline → 3. Kalender → 4. Survey → 5. Funnel → 6. Workflows → 7. Pixel → 8. Testen.**

---

## 1. Custom fields en tags

**Settings → Custom Fields → Add Field** (map: `Ads funnel`)

| Veldnaam | Type | Opties |
| --- | --- | --- |
| Doel 6 maanden | Single option | Afvallen / Strakker en sterker worden / Spiermassa opbouwen / Fitter en minder klachten |
| Al geprobeerd | Multi-line text | – |
| Werksituatie | Single option | Loondienst / Ondernemer / Ploegendienst / Werkzoekend / Student / Anders |
| Urgentie (1-10) | Number | – |
| Investering past | Single option | Ja, als het de juiste match is / Ik wil eerst meer weten / Nee, dat past nu niet |
| Beslissing met | Single option | Alleen / Met partner |
| Lost-reden | Single option | Prijs / Timing / Partner / Geen match / No-show |
| Leadbron | Single option | Ads aanvraag / Ads DM / Retargeting / Organisch |

**Settings → Tags → Add Tag:**
`ads_aanvraag`, `ads_dm`, `gekwalificeerd`, `nurture`, `geboekt`, `bevestigd`, `no_show`, `follow_up`, `klant_accelerator`, `klant_light`, `lost`

---

## 2. Pipeline: gebruik je bestaande PAID ADS-pipeline

Je hebt al een pipeline **PAID ADS** met de stages die de funnel nodig heeft. Pas hem aan via **Opportunities → Pipelines → PAID ADS → Edit**:

| Stage in de funnel | Bestaande stage | Actie |
| --- | --- | --- |
| Nieuwe aanvraag | NEW LEAD | Laten staan |
| Niet gekwalificeerd | – | **Toevoegen:** `NURTURE` (na NEW LEAD) |
| Gekwalificeerd, nog niet geboekt | QUALIFIED CONVERSATION | Laten staan |
| Geboekt | CALL BOOKED | Laten staan |
| Bevestigd (JA ontvangen) | – | **Toevoegen:** `CALL CONFIRMED` (na CALL BOOKED) |
| No-show | NO SHOW | Laten staan |
| Gesprek gehad, twijfel | – | **Toevoegen:** `FOLLOW-UP` (na NO SHOW) |
| Klant | WON | Laten staan |
| Nee | LOST | Laten staan |

De stages `METABOLISM ASSESSMENT COMPLETED`, `CALL, GG.`, `MESSAGE 1 SENT`, `POSITIVE RESPONSE` en `CALL OFFERED` gebruikt deze funnel niet. Laat ze staan als er nog oude leads in zitten, anders kun je ze verwijderen.

---

## 3. Kalender: "Strategiegesprek"

**Calendars → Calendar Settings → Create Calendar → Personal booking (of Event)**

| Instelling | Waarde |
| --- | --- |
| Naam | Strategiegesprek Elite Fit |
| Duur (Meeting duration) | 45 minuten |
| Buffer erna | 15 minuten |
| Slot interval | 30 minuten |
| Minimum scheduling notice | 2 uur |
| Date range (Allow booking for) | 3 dagen |
| Max bookings per day | 3 |
| Beschikbaarheid | Ma–vr 12:00, 16:00, 19:30 (en wat jij wilt) |
| Meeting location | Google Meet (koppel je Google-agenda) |
| Form | Alleen voornaam, e-mail, telefoon (de rest komt uit de survey) |
| Confirmation | Redirect naar de **bedankpagina** van de funnel |
| Notifications | Standaardherinneringen van de kalender **uitzetten**, de workflow doet dit |

---

## 4. Survey: "Aanvraag strategiegesprek"

**Sites → Surveys → Add Survey**. Eén vraag per slide. Koppel elke vraag aan het custom field uit stap 1.

| Slide | Vraag | Veld |
| --- | --- | --- |
| 1 | Voornaam, e-mail, telefoon | Standaardvelden (verplicht) |
| 2 | Wat is je belangrijkste doel voor de komende 6 maanden? | Doel 6 maanden |
| 3 | Wat heb je al geprobeerd, en waarom werkte het niet? | Al geprobeerd |
| 4 | Wat is je situatie qua werk? | Werksituatie |
| 5 | Hoe belangrijk is het voor je om hier NU mee aan de slag te gaan? (1-10) | Urgentie (1-10) |
| 6 | Mijn begeleiding is persoonlijk en een serieuze investering (vanaf €300 per maand). Past dat bij waar je nu staat? | Investering past |
| 7 | Neem je deze beslissing alleen, of wil je een partner betrekken? | Beslissing met |

**Diskwalificatie (per slide: ⚙ → Logic / Disqualify):**

- Slide 4: "Werkzoekend" of "Student" → **Disqualify immediately**
- Slide 6: "Nee, dat past nu niet" → **Disqualify immediately**
- Bij diskwalificatie: **Redirect** naar de gidspagina van de funnel (stap 5).

Urgentie onder 7 diskwalificeert niet in de survey zelf. Dat vangt workflow 1 op, omdat een getal-vergelijking in survey-logica niet in alle GHL-versies werkt.

**Survey Settings:** After submit → redirect naar de **kalenderpagina** van de funnel.

---

## 5. Funnel: "Ads – Strategiegesprek"

**Sites → Funnels → New Funnel → From blank.** Domein: bijvoorbeeld `gesprek.elite-fit.nl`.

| Stap | Pad | Inhoud |
| --- | --- | --- |
| 1. Landingspagina | `/` | **Custom Code**-element op een lege sectie. Plak de volledige inhoud van `landing/index.html`. Vervang in `#vsl` de video en in `#aanvraag` de embedcode van de survey (Surveys → Integrate → Embed). |
| 2. Kalender | `/kalender` | Kop "Kies een moment dat jou uitkomt" + **Calendar**-element (Strategiegesprek). |
| 3. Bedankt | `/bedankt` | **Custom Code**-element met `landing/bedankt.html`. Tracking code (body): `<script>fbq('track','Schedule');</script>` |
| 4. Gids | `/gids` | Voor gediskwalificeerde aanvragen. Kop "Dank je! Hier is je gratis gids", knop naar [GIDS], tekst: "Ik stuur je de komende weken tips via e-mail." |

**Funnel Settings → Tracking code (head):** je Meta-pixel basecode. Op stap 1 extra: `fbq('track','ViewContent')`.

**Tip:** wil je de landingspagina liever in GHL's eigen builder? Gebruik dan de teksten uit sectie 3 van het strategiedocument en `landing/index.html` als voorbeeld voor kleuren (#1a1e2e, #b06662, #f7f7fa) en fonts (Barlow Condensed + Lato).

---

## 6. Workflows

**Automation → Workflows → Create Workflow → Start from scratch.** Maak een map `Ads funnel`. Zet elke workflow pas op **Publish** na de test in stap 8.

Overal waar "WhatsApp" staat: gebruik de **WhatsApp**-actie als je WhatsApp in GHL hebt gekoppeld, anders **SMS**, of een webhook naar Wati.

### WF1: Nieuwe aanvraag

- **Trigger:** Survey Submitted → Aanvraag strategiegesprek
- **Acties:**
  1. Add Tag → `ads_aanvraag`
  2. Update Contact Field → Leadbron = Ads aanvraag
  3. Create/Update Opportunity → pipeline PAID ADS, stage NEW LEAD, waarde €3.499
  4. **If/Else:** Disqualified = true **of** Urgentie (1-10) kleiner dan 7
     - **Ja (niet gekwalificeerd):** Add Tag `nurture` → Opportunity stage `NURTURE` → (WF8 start via de tag)
     - **Nee (gekwalificeerd):** Add Tag `gekwalificeerd` → Opportunity stage QUALIFIED CONVERSATION → **Wait 1 uur** → If/Else: heeft tag `geboekt`? Nee → WhatsApp: *"Hé {{contact.first_name}}, ik zag dat je je aanvraag hebt ingevuld maar nog geen moment hebt gekozen. Zal ik je een paar tijden sturen? Of kies er zelf een: [LINK KALENDER]"* → Internal Notification aan jou: "Gekwalificeerde aanvraag zonder boeking: bel {{contact.first_name}}"
- **Goal:** Appointment booked (Strategiegesprek), daarna stopt de workflow.

### WF2: Afspraak geboekt (show-up-reeks)

- **Trigger:** Customer Booked Appointment → kalender Strategiegesprek
- **Acties:**
  1. Add Tag → `geboekt`; Remove Tag → `nurture`
  2. Opportunity stage → CALL BOOKED
  3. WhatsApp → **W1** (strategiedocument sectie 7)
  4. Email → **E1**, onderwerp "Je gesprek staat erin (+ 1 ding om te doen)"
  5. Webhook → `https://<jouw-dashboard>/api/ghl/webhook?token=<GHL_WEBHOOK_SECRET>` (zodat je dashboard "geboekt" telt)
  6. **Wait** → Event/Appointment time: **1 dag vóór** de afspraak (alleen als de afspraak verder dan 24 uur weg is)
  7. WhatsApp → **W2** + Email → **E2**
  8. **Wait** → 4 uur → If/Else: heeft tag `bevestigd`? Nee → Internal Notification: "Geen JA van {{contact.first_name}}: bel of stuur spraakbericht"
  9. **Wait** → Appointment time: **1 uur vóór** de afspraak
  10. WhatsApp → **W3**
- **Stopcondities (Workflow settings → Stop on response uit; gebruik Goal):** Appointment status = cancelled of rescheduled → workflow verlaten. Rescheduled start de workflow opnieuw via de trigger.

### WF3: Bevestiging ontvangen

- **Trigger:** Customer Replied → kanaal WhatsApp/SMS. Filter: bericht bevat "ja" of "👍", en contact heeft tag `geboekt`
- **Acties:** Add Tag `bevestigd` → Opportunity stage `CALL CONFIRMED`

### WF4: No-show

- **Trigger:** Appointment Status → **No Show** (zet je zelf in de kalender, of automatisch na 10 min)
- **Acties:**
  1. Opportunity stage → NO SHOW; Add Tag `no_show`
  2. WhatsApp → **W4** ("Ik zit klaar, ik wacht nog 10 minuten")
  3. Webhook → dashboard (telt no-show)
  4. **Wait** → 1 dag
  5. WhatsApp → **W5** (nieuw moment kiezen + kalenderlink)
  6. **Wait** → 3 dagen → If/Else: nieuwe afspraak geboekt? Nee → Lost-reden = No-show → Add Tag `nurture`
- **Goal:** Appointment booked → stop

### WF5: Follow-up na het gesprek

- **Trigger:** Pipeline Stage Changed → PAID ADS → `FOLLOW-UP` (zet jij na een gesprek met twijfel)
- **Acties** (berichten uit sectie 9 van het strategiedocument):
  1. **Wait** 1 uur → WhatsApp: samenvatting van het gesprek (vul [doel], [obstakel] en de 3 regels in als custom value of stuur dit handmatig)
  2. **Wait** 1 dag → Internal Notification + Task "Bel {{contact.first_name}} op het afgesproken moment"
  3. **Wait** 1 dag → WhatsApp dag 2 (Mart-case)
  4. **Wait** 2 dagen → WhatsApp dag 4 (aantal plekken)
  5. **Wait** 3 dagen → WhatsApp dag 7 (afsluiten) → Opportunity status Lost → Add Tag `nurture`
- **Goal:** Opportunity stage = WON of LOST → stop

### WF6: Nieuwe klant

- **Trigger:** Pipeline Stage Changed → WON (of Payment Received / Invoice Paid als je via GHL factureert)
- **Acties:**
  1. Add Tag `klant_accelerator` of `klant_light` (If/Else op opportunity-waarde: €3.499 of €1.800)
  2. WhatsApp → welkomstbericht + betaallink + intakeformulier
  3. Webhook → dashboard (telt won + omzet)
  4. Remove from workflows WF5, WF7, WF8
  5. **Wait** 7 dagen → WhatsApp: vraag om referentie

### WF7: Lost

- **Trigger:** Opportunity Status Changed → Lost (pipeline PAID ADS)
- **Acties:** Add Tag `lost` + `nurture` → Internal Notification "Vul de Lost-reden in" → **Wait** 60 dagen → WhatsApp: *"Hé {{contact.first_name}}, hoe gaat het met je doel? Ik ben benieuwd hoe het je vergaat."*

### WF8: E-mailnurture (16 mails)

- **Trigger:** Contact Tag Added → `nurture`
- **Acties:** 16 e-mails over 4 weken (ma/wo/vr/zo, 08:00). Laat de mails schrijven met de skill *e-mailreeks-schrijver*. Elke mail eindigt met de kalenderlink of "antwoord op deze mail".
- **Goal:** Appointment booked → stop

### WF9: ManyChat-leads naar GHL (route B)

- **Trigger:** Inbound Webhook (premium trigger). Kopieer de URL.
- **In ManyChat:** in de flow na het opslaan van het e-mailadres een actie **External Request** (POST) naar die URL met `email`, `first_name`, `phone`, `ig_username`.
- **Acties:** Create/Update Contact → Add Tag `ads_dm` → Leadbron = Ads DM → Opportunity PAID ADS, stage NEW LEAD. Boekt iemand via de kalenderlink uit de DM, dan neemt WF2 het over.

---

## 7. Meta-pixel en Conversions API

1. **Settings → Integrations → Facebook** koppelen; **Marketing → Ad Manager** (of Funnel Settings) Conversions API aanzetten met je pixel-ID en access token.
2. Events:
   - `ViewContent` → landingspagina
   - `Lead` → survey verzonden (survey-instelling "Facebook Pixel Event" of tracking code op `/kalender`)
   - `Schedule` → bedankpagina (`/bedankt`)
   - `Purchase` → WF6 (actie "Facebook Conversion API", waarde = opportunity-waarde)
3. Kalender: vul de pixel-ID in bij de kalenderinstellingen (veld *Facebook Pixel ID*).
4. Test met **Events Manager → Test events** voordat de ads live gaan.

---

## 8. Testen (checklist)

- [ ] Survey invullen als gekwalificeerde lead → kom je op de kalender? Tag `gekwalificeerd`, stage QUALIFIED CONVERSATION?
- [ ] Survey invullen met "Nee, dat past nu niet" → kom je op `/gids`? Tag `nurture`, stage NURTURE, eerste nurture-mail ontvangen?
- [ ] Afspraak boeken over 2 dagen → W1 + E1 direct ontvangen? Stage CALL BOOKED? Dashboard telt +1?
- [ ] "JA" terugsturen → tag `bevestigd`, stage CALL CONFIRMED?
- [ ] Afspraak op No Show zetten → W4 direct?
- [ ] Stage op FOLLOW-UP → eerste bericht na 1 uur?
- [ ] Stage op WON → welkomstbericht, andere workflows gestopt?
- [ ] Pixel: `ViewContent`, `Lead` en `Schedule` zichtbaar in Test events?
- [ ] ManyChat: PLAN sturen vanaf een testaccount → contact in GHL met tag `ads_dm`?

Verwijder je testcontacten na afloop, zodat je dashboardcijfers kloppen.
