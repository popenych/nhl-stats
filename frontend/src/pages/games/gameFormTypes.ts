export interface GameSideFormValues {
  playerId: string
  teamId: string
  goals: number
  shots: number
  hits: number
  timeOnAttack: string
  passingPct: number
  faceoffsWon: number
  penaltyMinutes: string
  powerplayGoals: number
  powerplayTotal: number
  powerplayMinutes: string
  shorthandedGoals: number
}

export interface GameFormValues {
  // Mantine's DateInput can emit either a Date or a "YYYY-MM-DD" string
  // depending on how the value was entered — see lib/date.ts.
  date: Date | string
  seasonId: string | null
  placeId: string | null
  notes: string
  home: GameSideFormValues
  away: GameSideFormValues
}

export const emptySide: GameSideFormValues = {
  playerId: '',
  teamId: '',
  goals: 0,
  shots: 0,
  hits: 0,
  timeOnAttack: '0:00',
  passingPct: 0,
  faceoffsWon: 0,
  penaltyMinutes: '0:00',
  powerplayGoals: 0,
  powerplayTotal: 0,
  powerplayMinutes: '0:00',
  shorthandedGoals: 0,
}
