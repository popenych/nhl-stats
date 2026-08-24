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

export type MetricKey =
  | 'win_pct'
  | 'goals_for_per_game'
  | 'goals_against_per_game'
  | 'shooting_pct'
  | 'pp_pct'
  | 'pk_pct'
  | 'faceoff_pct'

export const METRIC_LABELS: Record<MetricKey, string> = {
  win_pct: 'W%',
  goals_for_per_game: 'GF/GP',
  goals_against_per_game: 'GA/GP',
  shooting_pct: 'SH%',
  pp_pct: 'PP%',
  pk_pct: 'PK%',
  faceoff_pct: 'FOW%',
}

export interface StatsSummary {
  games_played: number
  wins: number
  losses: number
  ties: number
  win_pct: number
  goals_for: number
  goals_against: number
  goals_for_per_game: number
  goals_against_per_game: number
  shots_per_game: number
  shots_against_per_game: number
  hits_per_game: number
  shooting_pct: number
  passing_pct_avg: number
  faceoff_pct: number
  pp_pct: number
  pk_pct: number
  shorthanded_goals: number
  current_streak: string
  last5: string
}

export interface PlaceStanding {
  player: Player
  games_played: number
  wins: number
  losses: number
  ties: number
}

export interface PlaceSummary {
  games_played: number
  standings: PlaceStanding[]
}

export interface HeadToHead {
  player_a: Player
  player_b: Player
  games_played: number
  player_a_wins: number
  player_b_wins: number
  ties: number
  player_a_goals_for: number
  player_b_goals_for: number
}

export interface LeaderboardEntry {
  player: Player
  games_played: number
  value: number
}

export interface LeaderboardResponse {
  metric: MetricKey
  entries: LeaderboardEntry[]
}

export interface TrendPoint {
  x: string
  value: number
}

export interface TrendSeries {
  player: Player
  points: TrendPoint[]
}

export interface TrendResponse {
  metric: MetricKey
  x_axis: 'date' | 'games_played'
  series: TrendSeries[]
}
