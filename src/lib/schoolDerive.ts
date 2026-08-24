import type { Database } from './types'
import type { Project } from './school'
import { daysBetween, todayKey } from './date'

export interface ProjectStatus {
  done: number
  total: number
  percent: number
  daysLeft: number | null
  nextPhase: { name: string; due: string | null } | null
  minutesLogged: number
  /** Loop je achter op het tempo dat je deadline vraagt? */
  behind: boolean
}

export function projectStatus(project: Project, today = todayKey()): ProjectStatus {
  const total = project.phases.length
  const done = project.phases.filter((p) => p.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const daysLeft = project.deadline ? daysBetween(today, project.deadline) : null
  const next = project.phases.find((p) => !p.done) ?? null
  const minutesLogged = project.log.reduce((n, l) => n + l.minutes, 0)

  // Een fase met een verstreken deadline, of minder ver dan de tijd verstreken is.
  const overdue = project.phases.some((p) => !p.done && p.due && daysBetween(p.due, today) > 0)
  let behind = overdue
  if (!behind && project.deadline && total > 0) {
    const start = project.createdAt.slice(0, 10)
    const span = daysBetween(start, project.deadline)
    const gone = daysBetween(start, today)
    if (span > 0 && gone > 0) behind = percent < Math.round((gone / span) * 100) - 15
  }

  return {
    done, total, percent, daysLeft,
    nextPhase: next ? { name: next.name, due: next.due } : null,
    minutesLogged,
    behind,
  }
}

export function subjectName(db: Database, id: string | null): string {
  if (!id) return 'Algemeen'
  return db.subjects.find((s) => s.id === id)?.name ?? 'Algemeen'
}

export function subjectColor(db: Database, id: string | null): string {
  if (!id) return '#6b8299'
  return db.subjects.find((s) => s.id === id)?.color ?? '#6b8299'
}
