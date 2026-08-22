import type { Database, Task } from './types'
import { SESSION_STYLE, SLOT_TIMES, sessionsFor } from './schedule'
import { isoWeekday } from './date'

export type BlockKind = 'les' | 'training' | 'taak' | 'vrij' | 'slapen'

export interface Block {
  start: number
  end: number
  kind: BlockKind
  label: string
  detail: string
  color: string
  taskId?: string
}

const DAY_START = 7 * 60
const DAY_END = 22 * 60
const DEFAULT_TASK_MIN = 30
/** Even lucht tussen twee dingen; een dag zonder marge houdt niemand vol. */
const BUFFER = 10

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Bouwt je dag uit wat vaststaat — lessen en trainingen — en vult de gaten
 * met je taken, de belangrijkste eerst. Wat niet past blijft over, en dat
 * zegt de app er ook bij.
 */
export function planDay(db: Database, dateKey: string): { blocks: Block[]; unplanned: Task[] } {
  const fixed: Block[] = []

  const weekday = isoWeekday(dateKey)
  for (const lesson of db.lessons.filter((l) => l.weekday === weekday)) {
    const subject = db.subjects.find((s) => s.id === lesson.subjectId)
    fixed.push({
      start: toMinutes(lesson.start),
      end: toMinutes(lesson.end),
      kind: 'les',
      label: subject?.name ?? 'Les',
      detail: lesson.room,
      color: subject?.color ?? '#6b8299',
    })
  }

  for (const session of sessionsFor(dateKey)) {
    const times = SLOT_TIMES[session.slot]
    const done = db.days[dateKey]?.sessions[session.id]
    fixed.push({
      start: toMinutes(times.start),
      end: toMinutes(times.end),
      kind: 'training',
      label: SESSION_STYLE[session.kind].label,
      detail: done ? 'gedaan' : session.slot,
      color: SESSION_STYLE[session.kind].color,
    })
  }

  fixed.sort((a, b) => a.start - b.start)

  // Gaten zoeken tussen wat vaststaat.
  const gaps: { start: number; end: number }[] = []
  let cursor = DAY_START
  for (const block of fixed) {
    if (block.start - cursor >= 20) gaps.push({ start: cursor, end: block.start - BUFFER })
    cursor = Math.max(cursor, block.end + BUFFER)
  }
  if (DAY_END - cursor >= 20) gaps.push({ start: cursor, end: DAY_END })

  // Taken erin, belangrijkste eerst.
  const open = db.tasks
    .filter((t) => t.date === dateKey && !t.done)
    .sort((a, b) => a.priority - b.priority)

  const placed: Block[] = []
  const unplanned: Task[] = []
  const free = gaps.map((g) => ({ ...g }))

  for (const task of open) {
    const need = task.estimateMin ?? DEFAULT_TASK_MIN
    const gap = free.find((g) => g.end - g.start >= need)
    if (!gap) { unplanned.push(task); continue }
    placed.push({
      start: gap.start,
      end: gap.start + need,
      kind: 'taak',
      label: task.title,
      detail: `${need} min`,
      color: '#22d3ee',
      taskId: task.id,
    })
    gap.start += need + BUFFER
  }

  // Wat overblijft is echt vrij.
  const leftovers: Block[] = free
    .filter((g) => g.end - g.start >= 30)
    .map((g) => ({ start: g.start, end: g.end, kind: 'vrij' as BlockKind, label: 'Vrij', detail: '', color: '#16283a' }))

  return {
    blocks: [...fixed, ...placed, ...leftovers].sort((a, b) => a.start - b.start),
    unplanned,
  }
}

export const PLAN_DAY_START = DAY_START
export const PLAN_DAY_END = DAY_END

/** Taken van eerdere dagen die nog openstaan. */
export function overdueTasks(db: Database, today: string): Task[] {
  return db.tasks
    .filter((t) => !t.done && t.date !== null && t.date < today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
}

/** Haalt blijven liggen taken naar vandaag, zodat je lijst klopt met je dag. */
export function carryOver(db: Database, today: string): number {
  const stale = db.tasks.filter((t) => !t.done && t.date !== null && t.date < today)
  for (const t of stale) t.date = today
  return stale.length
}
