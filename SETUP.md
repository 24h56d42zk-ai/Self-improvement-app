# Online zetten — laptop en gsm

**Je hoeft hiervoor geen terminal te openen en niets te installeren.**
Alles gebeurt in je browser. Reken op zo'n 20 minuten, één keer.

Aan het eind heb je een adres zoals `noa-os.vercel.app` dat je op je laptop én
je gsm opent, met dezelfde data op allebei.

---

## Stap 1 — Supabase: je database en je login (10 min)

Supabase bewaart je data online, zodat je gsm en je laptop hetzelfde zien.
Gratis, en ruim voldoende voor dit dashboard.

1. Ga naar **https://supabase.com** → **Start your project** → aanmelden met GitHub.
2. Klik **New project**.
   - **Name:** `noa-os`
   - **Database Password:** klik **Generate a password** en **bewaar hem ergens** (bv. in je notities). Je hebt hem later misschien nodig.
   - **Region:** `Central EU (Frankfurt)` — dat is het dichtst bij België.
3. Klik **Create new project** en wacht ~2 minuten tot hij klaar is.
4. Klik links op **SQL Editor** → **New query**.
5. Open in dit project het bestand **`supabase/schema.sql`**, kopieer alles, plak het in de editor en klik **Run**.
   Je moet onderaan `Success. No rows returned` zien.
6. Klik links op **Settings** (tandwiel) → **API**. Laat dit tabblad openstaan, je hebt zo twee waarden nodig:
   - **Project URL** — iets als `https://abcdefgh.supabase.co`
   - **anon public** key — een hele lange tekst die begint met `eyJ...`

> De `anon` key mag publiek zijn, dat is normaal. Je data is beveiligd door de
> regels uit `schema.sql`: alleen wie ingelogd is met jouw account kan bij jouw rij.

---

## Stap 2 — Vercel: de app online zetten (5 min)

1. Ga naar **https://vercel.com** → **Sign Up** → **Continue with GitHub**.
2. Klik **Add New…** → **Project**.
3. Zoek de repository **`Dashboard-`** en klik **Import**.
   Vercel herkent zelf dat het een Vite-project is — je hoeft aan Framework,
   Build Command en Output Directory niets te veranderen.
4. Klap **Environment Variables** open en voeg twee regels toe:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | je Project URL uit stap 1.6 |
   | `VITE_SUPABASE_ANON_KEY` | je anon public key uit stap 1.6 |

   Let op: geen spaties ervoor of erna, en de volledige key plakken.
5. Klik **Deploy** en wacht ~1 minuut.
6. Je krijgt een adres zoals `dashboard-xyz.vercel.app`. Klik erop.

**Wil je een kortere naam?** Vercel → je project → **Settings** → **Domains** →
verander de naam naar bv. `noa-os`. Je adres wordt dan `noa-os.vercel.app`.

---

## Stap 3 — Je account aanmaken (1 min)

Open je nieuwe adres. Je krijgt een aanmeldscherm.

1. Klik **Nog geen account? Aanmaken**.
2. Vul je e-mail in en een wachtwoord van **minstens 8 tekens**.
3. Klik **Account aanmaken**. Krijg je een mail ter bevestiging, klik de link erin.
4. Meld je daarna aan met dezelfde gegevens.

Dit doe je **één keer**. Op je gsm meld je je met exact dezelfde gegevens aan,
en dan staat al je data er meteen.

---

## Stap 4 — Op je gsm zetten (1 min)

Open je adres in de browser van je gsm en zet hem op je beginscherm. Dan opent
hij zonder browserbalk, met een eigen icoon — als een echte app.

**iPhone (Safari):** deelknop onderaan (vierkantje met pijltje) → naar beneden
scrollen → **Zet op beginscherm** → **Voeg toe**.

**Android (Chrome):** de drie puntjes rechtsboven → **Toevoegen aan startscherm**
→ **Installeren**.

> Doe dit in **Safari** op iPhone, niet in Chrome — alleen Safari kan daar apps
> op je beginscherm zetten.

---

## Vanaf nu

- **Alles wat je invult synchroniseert automatisch** tussen laptop en gsm.
- Als ik nieuwe fases bouw en die op `main` zet, zet Vercel de nieuwe versie
  **binnen een minuut vanzelf online**. Je hoeft niets te doen; ververs de pagina.
- Maak af en toe een backup: **Instellingen → Opslag en backup → Exporteer alles**.
  Bewaar dat bestand ergens veilig.

---

## Als er iets misgaat

| Wat je ziet | Wat het is |
|---|---|
| Aanmeldscherm blijft komen na inloggen | De twee variabelen in Vercel kloppen niet. Vercel → Settings → Environment Variables nakijken, daarna **Deployments → … → Redeploy**. |
| "Invalid API key" | De anon key is niet volledig geplakt. Opnieuw kopiëren uit Supabase → Settings → API. |
| Data staat op je laptop maar niet op je gsm | Je bent op je gsm met een ander e-mailadres aangemeld, of nog niet aangemeld. |
| Witte pagina na deploy | Vercel → je deployment → **Build Logs** openen en de foutmelding hier doorsturen. |
| Alles werkt, maar zonder login | Dan draait hij nog lokaal: de twee variabelen ontbreken. Zie stap 2.4. |

---

## Zonder Supabase, alleen even proberen?

Sla stap 1 over en laat de twee variabelen weg. De app werkt dan volledig,
maar bewaart alles **alleen in de browser waarin je hem opent** — geen login,
geen sync tussen laptop en gsm. Prima om te testen, niet om je hele leven in te zetten.

## Wat er niet in zit

Er zit **geen AI-chat in de app** — dat vraagt een betaalde API-sleutel.
De ochtendbriefing, de avondwaarschuwingen en de signalen bij je business zijn
regelgebaseerd: ze rekenen met je eigen cijfers en hebben geen sleutel nodig.
Voor presentaties, samenvattingen en wiskundehulp werk je in Claude Code, en zet
je het resultaat in het dashboard.

---

# Shopify koppelen (optioneel)

Hiermee haalt de app je producten en bestellingen uit Shopify. Bestellingen
worden geboekt als verkoop, met voorraad eraf en marge erbij.

## Waarom dit een serverfunctie nodig heeft

Je Shopify-token geeft toegang tot je hele winkel. Alles wat in de webapp zelf
staat is leesbaar voor iedereen die je adres opent — een token daarin zetten
betekent dat een vreemde je store kan leegmaken. Daarom staat het token bij
Vercel op de server, en praat de app met een functie die het resultaat
teruggeeft zonder het token te tonen.

## 1. Een leestoken maken in Shopify

1. Shopify admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. **Create an app**, naam bijvoorbeeld `Noa dashboard`
3. **Configure Admin API scopes** en vink alleen deze aan:
   - `read_products`
   - `read_inventory`
   - `read_orders`
4. **Save** → **Install app** → kopieer de **Admin API access token** (begint met `shpat_`)

> Alleen leesrechten. De app schrijft niets terug naar Shopify.
> Dit token verschijnt maar één keer — bewaar het meteen.

## 2. In Vercel zetten

Vercel → je project → **Settings** → **Environment Variables**. Drie regels:

| Name | Value |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | `primecollectiblestcg.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | je `shpat_...` token |
| `SYNC_SECRET` | een zelfgekozen wachtwoord, minstens 12 tekens |

Daarna **Deployments** → bovenste → **Redeploy**, zodat de functie de waarden krijgt.

`SYNC_SECRET` beschermt de functie zelf: zonder dat wachtwoord kan iemand die
je adres kent je verkoopcijfers opvragen. Je vult het één keer in de app in.

## 3. In de app

Ga naar **Voorraad → Shopify**:

- **Producten ophalen** → **Overnemen in je inventaris**. Bestaande items worden
  bijgewerkt (aantal en prijs), nieuwe komen erbij.
- **Bestellingen ophalen** → **Boeken als verkoop**. Alleen bestellingen die er
  nog niet in staan; je kan dus zo vaak synchroniseren als je wil.

## Kostprijs

Vul in Shopify per artikel je **kostprijs** in (product → Voorraad → *Kostprijs
per artikel*). Die wordt overgenomen, en dan klopt je marge zonder handwerk.
Staat er geen, dan komt het item op nul binnen en pas je het hier aan.
