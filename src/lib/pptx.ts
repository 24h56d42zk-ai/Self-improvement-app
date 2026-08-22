import type { Presentation, Slide } from './school'

export type Theme = 'licht' | 'donker'

interface ThemeColors {
  bg: string
  title: string
  body: string
  accent: string
  muted: string
}

const THEMES: Record<Theme, ThemeColors> = {
  // Licht is de veilige keuze op een schoolbeamer; donker sluit aan bij het dashboard.
  licht:  { bg: 'FFFFFF', title: '10243A', body: '253649', accent: '0E7490', muted: '6B7C8C' },
  donker: { bg: '0B1220', title: 'E6F1FF', body: 'C6D6E6', accent: '22D3EE', muted: '7C96B2' },
}

/**
 * Bouwt een echte .pptx en laat hem downloaden. pptxgenjs wordt pas geladen
 * wanneer je exporteert, zodat de app zelf licht blijft.
 */
export async function exportPptx(presentation: Presentation, theme: Theme): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const c = THEMES[theme]
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.title = presentation.title || 'Presentatie'

  for (const slide of presentation.slides) {
    addSlide(pptx, slide, c)
  }
  if (presentation.slides.length === 0) {
    const s = pptx.addSlide()
    s.background = { color: c.bg }
    s.addText(presentation.title || 'Presentatie', {
      x: 0.8, y: 2.4, w: 11.7, h: 1.2, fontSize: 40, bold: true, color: c.title,
    })
  }

  const name = (presentation.title || 'presentatie')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'presentatie'
  await pptx.writeFile({ fileName: `${name}.pptx` })
}

type Pptx = InstanceType<Awaited<typeof import('pptxgenjs')>['default']>

function addSlide(pptx: Pptx, slide: Slide, c: ThemeColors) {
  const s = pptx.addSlide()
  s.background = { color: c.bg }
  if (slide.notes.trim()) s.addNotes(slide.notes)

  if (slide.layout === 'titel') {
    s.addText(slide.heading || 'Titel', {
      x: 0.9, y: 2.2, w: 11.5, h: 1.4, fontSize: 44, bold: true, color: c.title,
    })
    if (slide.subheading) {
      s.addText(slide.subheading, { x: 0.9, y: 3.6, w: 11.5, h: 0.8, fontSize: 20, color: c.muted })
    }
    s.addShape('rect', { x: 0.9, y: 2.0, w: 1.6, h: 0.06, fill: { color: c.accent } })
    return
  }

  if (slide.layout === 'sectie') {
    s.addShape('rect', { x: 0, y: 3.0, w: 13.33, h: 1.5, fill: { color: c.accent, transparency: 88 } })
    s.addText(slide.heading || 'Sectie', {
      x: 0.9, y: 3.1, w: 11.5, h: 1.3, fontSize: 34, bold: true, color: c.title, valign: 'middle',
    })
    return
  }

  if (slide.layout === 'citaat') {
    s.addText(`"${slide.heading}"`, {
      x: 1.2, y: 2.1, w: 10.9, h: 2.2, fontSize: 30, italic: true, color: c.title, valign: 'middle',
    })
    if (slide.subheading) {
      s.addText(`— ${slide.subheading}`, { x: 1.2, y: 4.3, w: 10.9, h: 0.6, fontSize: 16, color: c.muted })
    }
    return
  }

  // Opsomming
  s.addText(slide.heading || 'Titel', {
    x: 0.9, y: 0.7, w: 11.5, h: 0.9, fontSize: 30, bold: true, color: c.title,
  })
  s.addShape('rect', { x: 0.9, y: 1.62, w: 1.4, h: 0.05, fill: { color: c.accent } })

  const bullets = slide.bullets.map((b) => b.trim()).filter(Boolean)
  if (bullets.length > 0) {
    s.addText(
      bullets.map((text) => ({ text, options: { bullet: { code: '2022' }, breakLine: true } })),
      { x: 1.0, y: 2.0, w: 11.3, h: 4.4, fontSize: bullets.length > 6 ? 17 : 20, color: c.body, lineSpacingMultiple: 1.4 },
    )
  }
}
