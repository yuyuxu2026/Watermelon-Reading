/** Active chapter for a reading block (last chapter whose block <= current). */
export function chapterIndexForBlock(chapters: { block: number }[], block: number): number {
  let current = -1
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].block <= block) current = i
    else break
  }
  return current
}
