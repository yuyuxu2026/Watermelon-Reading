export type Theme = 'paper' | 'light' | 'dark'
export interface Settings { fontSize: number; theme: Theme }
export interface Position { block: number; fraction: number }
export interface Book {
  id: string
  title: string
  fileName: string
  encoding: string
  characters: number
  importedAt: string
  lastReadAt: string | null
  progress: number
  position: Position
}
export interface Library { books: Book[]; settings: Settings }
export interface BlockInfo { start: number; length: number; lines: number }
export interface Chapter { index: number; title: string; start: number; block: number }
export interface OpenBook { book: Book; blocks: BlockInfo[]; chapters: Chapter[] }
export interface TextBlock { index: number; text: string }
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }
export interface ReaderApi {
  library(): Promise<Result<Library>>
  importBook(): Promise<Result<Book | null>>
  openBook(id: string): Promise<Result<OpenBook>>
  blocks(id: string, start: number, count: number): Promise<Result<TextBlock[]>>
  removeBook(id: string): Promise<Result<null>>
  savePosition(id: string, position: Position): Promise<Result<Book>>
  saveSettings(settings: Settings): Promise<Result<Settings>>
}
