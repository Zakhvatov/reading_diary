import { describe, expect, it } from 'vitest'
import { DIARY_TEMPLATES, sectionsFor, TEMPLATE_SECTION_HINTS } from './templates'

describe('sectionsFor', () => {
  it('gives every template its own set of sections', () => {
    expect(sectionsFor('lite')).toEqual(['overview', 'quotes'])
    expect(sectionsFor('analyst')).toEqual(['overview', 'quotes', 'characters', 'plot', 'insights'])
    expect(sectionsFor('bookclub')).toEqual(['overview', 'quotes', 'insights', 'links'])
  })

  it('returns a copy so callers cannot break the template', () => {
    sectionsFor('lite').push('links')
    expect(sectionsFor('lite')).toEqual(['overview', 'quotes'])
  })

  it('describes every template in the picker', () => {
    expect(DIARY_TEMPLATES.map((template) => template.id)).toEqual(['lite', 'analyst', 'bookclub'])
  })
})

describe('TEMPLATE_SECTION_HINTS', () => {
  it('only hints at sections the template shows', () => {
    for (const template of DIARY_TEMPLATES) {
      const visible = sectionsFor(template.id)
      const hinted = Object.keys(TEMPLATE_SECTION_HINTS[template.id])

      for (const section of hinted) {
        expect(visible).toContain(section)
      }
    }
  })

  it('keeps the lite template free of prompts', () => {
    expect(TEMPLATE_SECTION_HINTS.lite).toEqual({})
  })
})
