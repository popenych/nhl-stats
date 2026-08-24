export type UserRole = 'admin' | 'member'

export interface Player {
  id: number
  name: string
  photo_path: string | null
  icon: string | null
}

export interface User {
  id: number
  username: string
  email: string | null
  role: UserRole
  is_active: boolean
  player: Player
}

export interface Team {
  id: number
  abbreviation: string
  name: string
  logo_path: string | null
}

export interface Place {
  id: number
  name: string
  photo_path: string | null
}

export interface Season {
  id: number
  name: string
  sort_order: number
}

export interface GameSideStats {
  goals: number
  shots: number
  hits: number
  time_on_attack_seconds: number
  passing_pct: number
  faceoffs_won: number
  penalty_minutes_seconds: number
  powerplay_goals: number
  powerplay_total: number
  powerplay_minutes_seconds: number
  shorthanded_goals: number
}

export interface GameSide extends GameSideStats {
  player: Player
  team: Team
}

export interface Game {
  id: number
  date: string
  season: Season
  place: Place
  photo_path: string
  notes: string | null
  created_by_user_id: number
  home: GameSide
  away: GameSide
}

export interface GameListItem {
  id: number
  date: string
  season: Season
  place: Place
  home: GameSide
  away: GameSide
}

export interface GameListResponse {
  items: GameListItem[]
  total: number
}

export interface GameSideInput extends GameSideStats {
  player_id: number
  team_id: number
}

export interface GameCreateInput {
  date?: string
  season_id: number
  place_id: number
  photo_path: string
  notes?: string
  home: GameSideInput
  away: GameSideInput
}

export interface GameUpdateInput {
  date?: string
  season_id?: number
  place_id?: number
  photo_path?: string
  notes?: string
  home?: GameSideInput
  away?: GameSideInput
}

export interface OcrFieldResult {
  raw_text: string
  value: number | [number, number] | null
  confidence: number
}

export interface OcrSideResult {
  goals: OcrFieldResult
  shots: OcrFieldResult
  hits: OcrFieldResult
  time_on_attack_seconds: OcrFieldResult
  passing_pct: OcrFieldResult
  faceoffs_won: OcrFieldResult
  penalty_minutes_seconds: OcrFieldResult
  powerplay_goals: OcrFieldResult
  powerplay_total: OcrFieldResult
  powerplay_minutes_seconds: OcrFieldResult
  shorthanded_goals: OcrFieldResult
}

export interface OcrTeamGuess {
  raw_text: string
  confidence: number
  team_id: number | null
  team: Team | null
}

export interface ExtractResponse {
  photo_path: string
  home: OcrSideResult
  away: OcrSideResult
  home_team_guess: OcrTeamGuess
  away_team_guess: OcrTeamGuess
  labels_found: number
  labels_expected: number
}
