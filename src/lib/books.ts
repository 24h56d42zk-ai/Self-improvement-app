export type BookStatus = 'wil-lezen' | 'bezig' | 'gelezen' | 'gestopt'

export const STATUSES: { id: BookStatus; label: string }[] = [
  { id: 'bezig',     label: 'Aan het lezen' },
  { id: 'gelezen',   label: 'Gelezen' },
  { id: 'wil-lezen', label: 'Wil ik lezen' },
  { id: 'gestopt',   label: 'Gestopt' },
]

export interface Quote {
  id: string
  text: string
  page: string
}

export interface Book {
  id: string
  title: string
  author: string
  category: string
  pages: number | null
  currentPage: number
  status: BookStatus
  started: string | null
  finished: string | null
  rating: number | null
  /** Link naar een cover; leeg = er wordt er een gemaakt uit titel en auteur */
  coverUrl: string
  coreIdea: string
  summary: string
  quotes: Quote[]
  createdAt: string
}

export interface ReadingLog {
  id: string
  date: string
  bookId: string
  pages: number
  minutes: number
}

/**
 * Vaste kleur per boek, afgeleid uit de titel. Zo krijgt elk boek een eigen
 * rug op de plank, ook zonder cover, en verandert die niet bij het herladen.
 */
export function coverColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  const hues = [206, 24, 158, 262, 330, 42]
  const hue = hues[Math.abs(hash) % hues.length]
  return `hsl(${hue} 42% 26%)`
}

export function progressPercent(book: Book): number {
  if (book.status === 'gelezen') return 100
  if (!book.pages || book.pages <= 0) return 0
  return Math.min(100, Math.round((book.currentPage / book.pages) * 100))
}
