# NOA//OS — persoonlijk dashboard

> Deze repo is openbaar zodat je hem kan forken naar je eigen GitHub-account
> en van daaruit online zetten. De code bevat geen persoonlijke gegevens:
> alles wat je invult staat in je eigen Supabase-database of in je browser.

Eén donker sci-fi dashboard voor school, sport, gezondheid, business en boeken.
Gebouwd in fases; **fase 1 staat er en is bruikbaar**.

## Wat er nu werkt (fase 1)

| Onderdeel | Status |
|---|---|
| Sci-fi HUD-dashboard met bovenbalk (wedstrijden, 75 Hard, vermogen, sessies) | ✅ |
| 75 Hard: afvinken, streak, 75-daggrid, gemiste regels, herstart | ✅ |
| Vaste weekschema van 9 sessies, met één tik af te vinken | ✅ |
| Dagscore (0–100) + trend over 14 dagen | ✅ |
| Dagelijkse taken per categorie | ✅ |
| Avondreflectie (3 vragen) | ✅ |
| Regelgebaseerde ochtendbriefing en avondwaarschuwingen | ✅ |
| Vermogen (cash + voorraad) over tijd | ✅ |
| Export/import van al je data als JSON | ✅ |
| Cloudsync met login (Supabase) | ✅ optioneel |

## Wat er nu werkt (fase 2 — training)

| Onderdeel | Status |
|---|---|
| Sessielogboek: duur, afstand, RPE, oefeningen met sets en gewicht | ✅ |
| Zeven sjablonen die de hele sessie in één tik invullen | ✅ |
| Readiness-score naar de eerstvolgende Hyrox, met opsplitsing | ✅ |
| De 9 Hyrox-stations met eigen doeltijden en een radar | ✅ |
| Zwakste station automatisch aangewezen | ✅ |
| PR-muur: stations, tempo's, afstanden en zwaarste sets | ✅ |
| Kilometers, getild gewicht en belasting per week | ✅ |
| Acute/chronische belasting met blessurewaarschuwing | ✅ |

## Wat er nu werkt (fase 3 — business)

| Onderdeel | Status |
|---|---|
| Inventaris per item: sealed, singles, slabs, accessoires | ✅ |
| Marktwaarde per item bijwerken, met datum van bijwerken | ✅ |
| Verkopen vanuit de inventaris, met marge per verkoop | ✅ |
| Losse aan- en verkopen per kanaal (beurs, Cardmarket, online, direct) | ✅ |
| Live cash: laatste meting plus alles wat er sindsdien in en uit ging | ✅ |
| Beursrapport: omzet, kosten, netto winst, marge, winst per uur, best verkocht | ✅ |
| Vermogen over tijd en netto winst per beurs | ✅ |
| Signalen: verouderde waardes, stilliggend kapitaal, omzet laatste 30 dagen | ✅ |

## Wat er nu werkt (fase 4 — school)

| Onderdeel | Status |
|---|---|
| Vakken met eigen kleur, doorheen de hele module gebruikt | ✅ |
| Samenvattingen typen of plakken, doorzoekbaar, link naar het origineel | ✅ |
| Overhoren met spaced repetition (vereenvoudigde SM-2) | ✅ |
| Woordenlijst in één keer inladen (`term = betekenis`) | ✅ |
| Herhalingen-vooruitblik over 14 dagen | ✅ |
| Projecten en eindwerk/GIP met fases, deadlines en achterstandssignaal | ✅ |
| Bronnenlijst met APA-vermelding en kopieerknop | ✅ |
| Logboek per werksessie | ✅ |
| Presentatiemaker met export naar een echt `.pptx`-bestand | ✅ |

## Wat er nu werkt (fase 5 — boeken en planning)

| Onderdeel | Status |
|---|---|
| Boekenplank met eigen rug per boek en voortgangsbalk | ✅ |
| Kernidee, volledige samenvatting en citaten met paginanummer | ✅ |
| Jaardoel met tempo-inschatting en pagina's per jaar | ✅ |
| Leessessie loggen; vanaf 10 minuten vinkt de 75 Hard-leesregel af | ✅ |
| Doelen op jaar-, maand- en weekniveau, aan elkaar te koppelen | ✅ |
| Taken die aan een weekdoel hangen, met herhaling | ✅ |
| Weekoverzicht met dagscore, sessies en taken per dag | ✅ |
| Weekreview met gemiddelde score, sessies en 75 Hard | ✅ |
| Jaargrid: 365 vakjes gekleurd op je dagscore | ✅ |
| Vast lesrooster per weekdag | ✅ |

**Alle vijf de fases staan er.**

## Online zetten (laptop + gsm)

Volg **[SETUP.md](./SETUP.md)** — dat gaat volledig via je browser, zonder terminal.
Kort: Supabase-project aanmaken, `supabase/schema.sql` uitvoeren, in Vercel deze
repo importeren met twee omgevingsvariabelen, account aanmaken, en op je gsm op
je beginscherm zetten.

## Lokaal draaien (voor ontwikkeling)

```bash
npm install
npm run dev
```

Zonder `.env.local` bewaart de app alles lokaal in je browser — handig om te testen.

## Sneltoetsen

- `r` — rustige modus aan/uit (zet animaties en gloed uit)
- klik of toets tijdens de opstartsequentie — overslaan

## Structuur

```
src/
  lib/       types, opslag, datums, weekschema, afgeleide cijfers, briefing, palet
  components/ HUD-bouwstenen, grafieken, navigatie
  pages/     Dashboard, 75 Hard, Instellingen, placeholders per fase
supabase/schema.sql  tabel + beveiligingsregels voor cloudsync
```

De grafiekkleuren in `src/lib/palette.ts` zijn gevalideerd op contrast en
kleurenblindheid tegen de donkere achtergrond. Pas ze niet aan zonder opnieuw te valideren.
