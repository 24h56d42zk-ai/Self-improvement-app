import type { Database } from './types'
import { emptyDatabase } from './types'

/**
 * Eén keer per apparaat wordt automatisch schoongeveegd, zodat de teller op de
 * startdatum begint zonder dat je zelf een knop moet zoeken. Verander deze
 * sleutel alleen als er echt opnieuw gewist moet worden: hij is de enige
 * herinnering dat het al gebeurd is.
 */
export const RESET_ID = '2026-09-10-alles'

/** Elke schoonmaak legt zijn eigen kopie opzij; een oudere gaat nooit verloren. */
const BACKUP_KEY = `noa.dashboard.backup.${RESET_ID}`
/** De kopie van de allereerste automatische schoonmaak. */
const LEGACY_BACKUP_KEY = 'noa.dashboard.backup.voor-reset'

export type ResetScope = 'logboek' | 'alles'

/** Heeft deze database überhaupt iets in zich dat het bewaren waard is? */
export function hasContent(db: Database): boolean {
  return (
    Object.keys(db.days).length > 0 || db.tasks.length > 0 || db.netWorth.length > 0 ||
    db.sessionLogs.length > 0 || db.stations.length > 0 || db.inventory.length > 0 ||
    db.trades.length > 0 || db.fairs.length > 0 || db.reading.length > 0 ||
    db.subjects.length > 0 || db.notes.length > 0 || db.projects.length > 0 ||
    db.presentations.length > 0 || db.books.length > 0 || db.goals.length > 0 ||
    db.lessons.length > 0 || db.settings.hard75Start !== null
  )
}

/**
 * Wist de database. 'logboek' houdt je opzet (vakken, inventaris, boeken);
 * 'alles' laat alleen je aanmelding en je cloudinstellingen staan.
 */
export function wipe(draft: Database, scope: ResetScope) {
  const fresh = emptyDatabase()

  draft.days = {}
  draft.tasks = []
  draft.netWorth = []
  draft.sessionLogs = []
  draft.stations = []
  draft.stationTargets = fresh.stationTargets
  draft.trades = []
  draft.fairs = []
  draft.reading = []
  draft.shopifyImported = []
  draft.shopifySyncedAt = null
  draft.settings.hard75Start = null
  draft.settings.hard75Attempt = 1
  draft.settings.bootSeen = null

  if (scope === 'alles') {
    draft.inventory = []
    draft.subjects = []
    draft.notes = []
    draft.projects = []
    draft.presentations = []
    draft.books = []
    draft.goals = []
    draft.lessons = []
    draft.bookGoal = fresh.bookGoal
  }
}

function read(key: string): Database | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Database) : null
  } catch {
    return null
  }
}

/** Legt de huidige stand opzij, zodat wissen nooit definitief verlies is. */
export function keepBackup(db: Database) {
  if (!hasContent(db)) return
  try {
    const existing = read(BACKUP_KEY)
    // De rijkste versie wint: een lege lokale stand mag een volle cloudstand
    // die net binnenkwam niet overschrijven.
    if (existing && existing.updatedAt > db.updatedAt) return
    localStorage.setItem(BACKUP_KEY, JSON.stringify(db))
  } catch {
    /* geen plaats of privémodus: het wissen zelf mag hier niet op stuklopen */
  }
}

/** De jongste bewaarde kopie: die van deze schoonmaak, anders de vorige. */
export function readBackup(): Database | null {
  return read(BACKUP_KEY) ?? read(LEGACY_BACKUP_KEY)
}
