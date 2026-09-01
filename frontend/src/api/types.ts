export type UserRole = 'admin' | 'member'

export interface Player {
  id: number
  name: string
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
  icon: string | null
}

export interface Season {
  id: number
  name: string
  sort_order: number
  icon: string | null
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

// Mirrors backend MetricKey (app/schemas/stats.py) — every numeric
// StatsSummary field the trend/leaderboard endpoints can key off of. Short
// and full display names for these live in lib/stats.ts, not here — this
// file only carries API shapes.
export type MetricKey =
  | 'win_pct'
  | 'wins'
  | 'losses'
  | 'games_played'
  | 'goals_for'
  | 'goals_against'
  | 'goals_for_per_game'
  | 'goals_against_per_game'
  | 'goal_diff'
  | 'goal_diff_per_game'
  | 'shots_for'
  | 'shots_per_game'
  | 'shots_against_per_game'
  | 'hits_for'
  | 'hits_per_game'
  | 'shooting_pct'
  | 'passing_pct_avg'
  | 'time_on_attack_avg_seconds'
  | 'faceoffs_won'
  | 'faceoff_pct'
  | 'powerplay_goals'
  | 'powerplay_total'
  | 'powerplay_minutes_avg_seconds'
  | 'pp_pct'
  | 'penalty_minutes_total_seconds'
  | 'penalty_minutes_avg_seconds'
  | 'penalty_kill_situations'
  | 'penalty_kills_successful'
  | 'pk_pct'
  | 'shorthanded_goals'

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
  goal_diff: number
  goal_diff_per_game: number
  shots_for: number
  shots_per_game: number
  shots_against_per_game: number
  hits_for: number
  hits_per_game: number
  shooting_pct: number
  passing_pct_avg: number
  time_on_attack_avg_seconds: number
  faceoffs_won: number
  faceoff_pct: number
  powerplay_goals: number
  powerplay_total: number
  powerplay_minutes_avg_seconds: number
  pp_pct: number
  penalty_minutes_total_seconds: number
  penalty_minutes_avg_seconds: number
  penalty_kill_situations: number
  penalty_kills_successful: number
  pk_pct: number
  shorthanded_goals: number
  current_streak: string
  last5: string
}

export interface TeamRecord {
  team: Team
  games_played: number
  wins: number
  losses: number
}

export interface GameRecord {
  game_id: number
  date: string
  own_team: Team
  opp_team: Team
  own_goals: number
  opp_goals: number
  diff: number
}

export interface PlayerExtras {
  best_win_streak: number
  worst_lose_streak: number
  most_played_team: TeamRecord | null
  most_wins_team: TeamRecord | null
  most_losses_team: TeamRecord | null
  best_diff_game: GameRecord | null
  worst_diff_game: GameRecord | null
  best_gf_game: GameRecord | null
  worst_ga_game: GameRecord | null
}

export interface PlayerRecord {
  player: Player
  games_played: number
  wins: number
  losses: number
}

export interface TeamExtras {
  best_win_streak: number
  worst_lose_streak: number
  most_played_player: PlayerRecord | null
  most_wins_player: PlayerRecord | null
  most_losses_player: PlayerRecord | null
  best_diff_game: GameRecord | null
  worst_diff_game: GameRecord | null
  best_gf_game: GameRecord | null
  worst_ga_game: GameRecord | null
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
  player_a_summary: StatsSummary
  player_b_summary: StatsSummary
  player_a_extras: PlayerExtras
  player_b_extras: PlayerExtras
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

export interface PlayerSummaryRow {
  player: Player
  summary: StatsSummary
}

export interface PlayerTeamSummaryRow {
  team: Team
  summary: StatsSummary
}

// Which side of the game a player/team was on — filters stats down to only
// their home games or only their away games.
export type SideFilter = 'home' | 'away'

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
