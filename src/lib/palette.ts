/**
 * Kleuren voor alle grafieken. Gevalideerd op de donkere ondergrond #080d16:
 * lichtheidsband, chroma, kleurenblind-scheiding (deutan/protan/tritan) en contrast.
 * Niet aanpassen zonder opnieuw te valideren — de volgorde is de veiligheidsmarge.
 */
export const SERIES = {
  blue:    '#3987e5',
  orange:  '#d95926',
  aqua:    '#199e70',
  violet:  '#9085e9',
  magenta: '#d55181',
} as const

export const STATUS = {
  good:     '#0ca30c',
  warning:  '#fab219',
  serious:  '#ec835a',
  critical: '#d03b3b',
} as const

export const CHROME = {
  accent:  '#22d3ee',
  grid:    '#16283a',
  axis:    '#6b8299',
  ink:     '#dbeafe',
  surface: '#080d16',
} as const

/** Sequentiële cyaan-ramp voor magnitude (dagscore-grids). Donker = laag. */
export const SCORE_RAMP = ['#0e2a33', '#12495a', '#1a7d94', '#1fb1cd', '#5ce3f7'] as const

export const NO_DATA = '#0f1720'

/**
 * Drempels over het bereik dat echt voorkomt. Een gelijkmatige verdeling over
 * 0-100 zou alles boven de 80 dezelfde kleur geven, en dat zijn net de dagen
 * waartussen je verschil wil zien.
 */
const SCORE_STEPS = [50, 65, 80, 90]

export function scoreColor(score: number, hasData: boolean): string {
  if (!hasData) return NO_DATA
  let i = 0
  while (i < SCORE_STEPS.length && score >= SCORE_STEPS[i]) i++
  return SCORE_RAMP[i]
}
