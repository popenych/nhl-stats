import { api } from '../lib/apiClient'
import type {
  HeadToHead,
  LeaderboardResponse,
  MetricKey,
  PlaceSummary,
  PlayerSummaryRow,
  StatsSummary,
  TrendResponse,
} from './types'

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export function getPlayerSummary(playerId: number, seasonId?: number) {
  return api.get<StatsSummary>(`/stats/players/${playerId}/summary${qs({ season_id: seasonId })}`)
}

export function getTeamSummary(teamId: number, seasonId?: number) {
  return api.get<StatsSummary>(`/stats/teams/${teamId}/summary${qs({ season_id: seasonId })}`)
}

export function getPlaceSummary(placeId: number, seasonId?: number) {
  return api.get<PlaceSummary>(`/stats/places/${placeId}/summary${qs({ season_id: seasonId })}`)
}

export function getHeadToHead(playerA: number, playerB: number, seasonId?: number) {
  return api.get<HeadToHead>(
    `/stats/head-to-head${qs({ player_a: playerA, player_b: playerB, season_id: seasonId })}`,
  )
}

export function getAllPlayerSummaries(seasonId?: number) {
  return api.get<PlayerSummaryRow[]>(`/stats/players-summary${qs({ season_id: seasonId })}`)
}

export function getLeaderboard(metric: MetricKey, seasonId?: number) {
  return api.get<LeaderboardResponse>(`/stats/leaderboard${qs({ metric, season_id: seasonId })}`)
}

export function getTrend(options: {
  metric: MetricKey
  x?: 'date' | 'games_played'
  seasonId?: number
  playerId?: number
  teamId?: number
}) {
  const { metric, x, seasonId, playerId, teamId } = options
  return api.get<TrendResponse>(
    `/stats/trend${qs({ metric, x, season_id: seasonId, player_id: playerId, team_id: teamId })}`,
  )
}
