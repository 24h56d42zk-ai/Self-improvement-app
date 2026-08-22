/* ── Vakken ─────────────────────────────────────────────────────────────── */

export interface Subject {
  id: string
  name: string
  color: string
  teacher: string
}

/** Startset voor Latijn-Wiskunde 6. Aanpasbaar in de app. */
export const DEFAULT_SUBJECTS: Omit<Subject, 'id'>[] = [
  { name: 'Latijn',        color: '#d55181', teacher: '' },
  { name: 'Wiskunde',      color: '#3987e5', teacher: '' },
  { name: 'Nederlands',    color: '#199e70', teacher: '' },
  { name: 'Engels',        color: '#9085e9', teacher: '' },
  { name: 'Frans',         color: '#d95926', teacher: '' },
  { name: 'Geschiedenis',  color: '#c98500', teacher: '' },
  { name: 'Aardrijkskunde', color: '#199e70', teacher: '' },
  { name: 'Fysica',        color: '#3987e5', teacher: '' },
  { name: 'Biologie',      color: '#199e70', teacher: '' },
  { name: 'Chemie',        color: '#9085e9', teacher: '' },
  { name: 'Godsdienst',    color: '#6b8299', teacher: '' },
]

/* ── Samenvattingen ─────────────────────────────────────────────────────── */

export interface Note {
  id: string
  subjectId: string | null
  title: string
  chapter: string
  /** De samenvatting zelf. Platte tekst; regels die met - beginnen worden opsommingen. */
  content: string
  /** Link naar het originele bestand (Drive, OneDrive, …) */
  link: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/* ── Overhoren met spaced repetition ────────────────────────────────────── */

export interface CardDeck {
  id: string
  subjectId: string | null
  name: string
  createdAt: string
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  /** Hoe makkelijk de kaart voor jou is; start op 2.5 en beweegt met je antwoorden. */
  ease: number
  /** Aantal dagen tot de volgende herhaling */
  interval: number
  /** Datum waarop de kaart weer aan de beurt is */
  due: string
  reps: number
  lapses: number
  lastReview: string | null
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export const GRADES: { id: Grade; label: string; hint: string }[] = [
  { id: 'again', label: 'Opnieuw', hint: 'wist ik niet' },
  { id: 'hard',  label: 'Moeilijk', hint: 'met moeite' },
  { id: 'good',  label: 'Goed',     hint: 'wist ik' },
  { id: 'easy',  label: 'Makkelijk', hint: 'meteen' },
]

/**
 * Leest geplakte tekst uit als kaarten. Ondersteunt "term = betekenis",
 * "term - betekenis" en "term<TAB>betekenis", één per regel.
 * Zo kan je een woordenlijst Latijn in één keer inladen.
 */
export function parseCards(raw: string): { front: string; back: string }[] {
  const out: { front: string; back: string }[] = []
  for (const line of raw.split('\n')) {
    const text = line.trim()
    if (!text) continue
    const match = text.match(/^(.+?)\s*(?:\t|=|—|–| - |:)\s*(.+)$/)
    if (!match) continue
    const front = match[1].trim()
    const back = match[2].trim()
    if (front && back) out.push({ front, back })
  }
  return out
}

/* ── Projecten en eindwerk ──────────────────────────────────────────────── */

export interface Phase {
  id: string
  name: string
  due: string | null
  done: boolean
}

export interface Source {
  id: string
  kind: 'boek' | 'website' | 'artikel' | 'video' | 'interview'
  author: string
  title: string
  year: string
  publisher: string
  url: string
  accessed: string
  note: string
}

export interface LogEntry {
  id: string
  date: string
  minutes: number
  what: string
}

export interface Project {
  id: string
  name: string
  subjectId: string | null
  kind: 'project' | 'eindwerk'
  deadline: string | null
  description: string
  phases: Phase[]
  sources: Source[]
  log: LogEntry[]
  createdAt: string
}

/** Standaardfases voor een eindwerk/GIP — aanpasbaar per project. */
export const GIP_PHASES = [
  'Onderwerp vastleggen',
  'Onderzoeksvraag formuleren',
  'Bronnen zoeken en lezen',
  'Opzet en structuur',
  'Eerste versie schrijven',
  'Praktisch deel uitwerken',
  'Nalezen en bijsturen',
  'Eindversie afwerken',
  'Presentatie voorbereiden',
]

export const SOURCE_KINDS: Source['kind'][] = ['boek', 'website', 'artikel', 'video', 'interview']

/** Bronvermelding in APA-stijl. Genoeg voor een GIP-bronnenlijst. */
export function citation(s: Source): string {
  const author = s.author.trim() || 'Onbekende auteur'
  const year = s.year.trim() ? `(${s.year.trim()})` : '(z.d.)'
  const title = s.title.trim() || 'Zonder titel'
  const parts = [`${author} ${year}.`, `${title}.`]
  if (s.publisher.trim()) parts.push(`${s.publisher.trim()}.`)
  if (s.url.trim()) {
    parts.push(s.accessed ? `Geraadpleegd op ${s.accessed}, van ${s.url.trim()}` : s.url.trim())
  }
  return parts.join(' ')
}

/* ── Presentaties ───────────────────────────────────────────────────────── */

export type SlideLayout = 'titel' | 'opsomming' | 'sectie' | 'citaat'

export interface Slide {
  id: string
  layout: SlideLayout
  heading: string
  subheading: string
  bullets: string[]
  notes: string
}

export interface Presentation {
  id: string
  title: string
  subtitle: string
  subjectId: string | null
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

export const LAYOUTS: { id: SlideLayout; label: string; hint: string }[] = [
  { id: 'titel',      label: 'Titel',      hint: 'openingsslide' },
  { id: 'sectie',     label: 'Sectie',     hint: 'tussentitel' },
  { id: 'opsomming',  label: 'Opsomming',  hint: 'titel met punten' },
  { id: 'citaat',     label: 'Citaat',     hint: 'één uitspraak groot' },
]

export function emptySlide(layout: SlideLayout = 'opsomming'): Slide {
  return { id: crypto.randomUUID(), layout, heading: '', subheading: '', bullets: [''], notes: '' }
}
