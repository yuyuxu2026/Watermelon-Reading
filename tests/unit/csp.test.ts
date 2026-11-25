import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy } from '../../electron/csp'

describe('contentSecurityPolicy', () => {
  it('allows Vite HMR and eval in development', () => {
    const csp = contentSecurityPolicy(true)
    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
    expect(csp).toContain('ws://127.0.0.1:*')
    expect(csp).toContain('http://127.0.0.1:*')
  })

  it('keeps production CSP strict without eval or broad connect', () => {
    const csp = contentSecurityPolicy(false)
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('ws://')
  })
})
