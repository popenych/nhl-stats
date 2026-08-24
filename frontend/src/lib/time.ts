const MMSS_PATTERN = /^(\d{1,3}):([0-5]?\d)$/

export function parseMMSS(value: string): number {
  const match = MMSS_PATTERN.exec(value.trim())
  if (!match) throw new Error(`Invalid time "${value}" — expected mm:ss`)
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

export function isValidMMSS(value: string): boolean {
  return MMSS_PATTERN.test(value.trim())
}

export function formatMMSS(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
