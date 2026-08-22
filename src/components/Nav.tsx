import { NavLink } from 'react-router-dom'
import {
  BookOpen, CalendarRange, Cog, Dumbbell, GraduationCap, LayoutDashboard, ShieldCheck, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SERIES } from '../lib/palette'

interface Item { to: string; label: string; icon: LucideIcon; color: string }

export const NAV: Item[] = [
  { to: '/',            label: 'Dashboard', icon: LayoutDashboard, color: '#22d3ee' },
  { to: '/75hard',      label: '75 Hard',   icon: ShieldCheck,     color: SERIES.violet },
  { to: '/training',    label: 'Training',  icon: Dumbbell,        color: SERIES.orange },
  { to: '/business',    label: 'Business',  icon: Wallet,          color: SERIES.aqua },
  { to: '/school',      label: 'School',    icon: GraduationCap,   color: SERIES.blue },
  { to: '/boeken',      label: 'Boeken',    icon: BookOpen,        color: SERIES.magenta },
  { to: '/planning',    label: 'Planning',  icon: CalendarRange,   color: '#22d3ee' },
  { to: '/instellingen', label: 'Instellingen', icon: Cog,         color: '#6b8299' },
]

export default function Nav() {
  return (
    <>
      {/* Desktop: vaste zijbalk */}
      <nav className="fixed inset-y-0 left-0 z-30 hidden w-[168px] flex-col border-r border-line/70 bg-panel/70 px-3 py-5 backdrop-blur md:flex">
        <div className="mb-6 px-2">
          <div className="num text-lg font-bold leading-none text-accent">NOA</div>
          <div className="label mt-1">//OS v0.1</div>
        </div>
        <ul className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                    isActive ? 'bg-accent/10 text-ink' : 'text-muted hover:bg-line/40 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} style={{ color: isActive ? item.color : undefined }} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobiel: onderbalk met de vier schermen die je onderweg gebruikt */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel/95 backdrop-blur md:hidden">
        {NAV.filter((i) => ['/', '/75hard', '/training', '/planning'].includes(i.to)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            <item.icon size={18} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
