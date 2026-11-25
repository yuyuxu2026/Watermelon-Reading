import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('reading cursor', () => {
  it('uses the arrow cursor on text and keeps pointer on controls', () => {
    const css = readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toMatch(/body\s*\{[^}]*cursor:\s*default/)
    expect(css).toMatch(/button\s*\{[^}]*cursor:\s*pointer/)
    expect(css).toMatch(/\.book-card\s*\{[^}]*cursor:\s*pointer/)
  })
})
