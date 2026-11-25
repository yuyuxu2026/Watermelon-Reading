/// <reference types="vite/client" />
import type { ReaderApi } from '../electron/types'
declare global { interface Window { reader: ReaderApi } }
export {}
