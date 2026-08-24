# NOA//OS — persoonlijk dashboard

> Deze repo is openbaar zodat je hem kan forken naar je eigen GitHub-account
> en van daaruit online zetten. De code bevat geen persoonlijke gegevens:
> alles wat je invult staat in je eigen Supabase-database of in je browser.

Eén donker sci-fi dashboard voor school, sport, gezondheid, business en boeken.
Gebouwd in fases; **fase 1 staat er en is bruikbaar**.

## Wat de app doet

| Tab | Waarvoor |
|---|---|
| **Dashboard** | Je takenlijst vooraan, sessies van vandaag, 75 Hard afvinken, dagscore en de cijfers die je altijd wil zien |
| **75 Hard** | Afvinken, streak, het grid van 75 dagen, en welke regel je laat vallen |
| **Training** | Sessielogboek, de negen Hyrox-stations, PR's, weekvolume en blessurerisico |
| **Business** | Inventaris, aan- en verkopen, beursrapporten, en een analysetab met maandcijfers, kanalen, marges en verkoopsnelheid |
| **School** | Documenten per vak, projecten en eindwerk, en de presentatiemaker die een echte pptx exporteert |
| **Boeken** | Boekenplank, samenvattingen en citaten, jaardoel en leestempo |
| **Planning** | Vandaag, week, maand, doelen op drie niveaus, en je lesrooster |

Alle grafieken en cijfers rekenen vanaf **24 augustus 2026**; wat daarvoor ligt
telt niet mee.

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
