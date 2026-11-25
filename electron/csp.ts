/** Content-Security-Policy for the reader window. */
export function contentSecurityPolicy(isDev: boolean): string {
  if (isDev) {
    // Vite needs eval + websocket HMR; keep production stricter below.
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:* ws://localhost:* http://localhost:*"
    ].join('; ')
  }
  return "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self' data:"
}
