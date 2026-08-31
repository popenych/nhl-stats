import { api } from '../lib/apiClient'
import type {
  HeadToHead,
  LeaderboardResponse,
  MetricKey,
  PlaceSummary,
  PlayerExtras,
  PlayerSummaryRow,
  PlayerTeamSummaryRow,
  SideFilter,
  StatsSummary,
  TeamExtras,
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

export interface StatsFilters {
  seasonId?: number
  teamId?: number
  placeId?: number
  side?: SideFilter
}

export function getPlayerSummary(playerId: number, options: StatsFilters = {}) {
  const { seasonId, teamId, placeId, side } = options
  return api.get<StatsSummary>(
    `/stats/players/${playerId}/summary${qs({ season_id: seasonId, team_id: teamId, place_id: placeId, side })}`,
  )
}

export function getPlayerExtras(
  playerId: number,
  options: { seasonId?: number; placeId?: number; side?: SideFilter } = {},
) {
  const { seasonId, placeId, side } = options
  return api.get<PlayerExtras>(
    `/stats/players/${playerId}/extras${qs({ season_id: seasonId, place_id: placeId, side })}`,
  )
}

export function getPlayerTeamExtras(
  playerId: number,
  teamId: number,
  options: { seasonId?: number; placeId?: number; side?: SideFilter } = {},
) {
  const { seasonId, placeId, side } = options
  return api.get<TeamExtras>(
    `/stats/players/${playerId}/team-extras${qs({ team_id: teamId, season_id: seasonId, place_id: placeId, side })}`,
  )
}

export function getPlayerTeamBreakdown(
  playerId: number,
  options: { seasonId?: number; placeId?: number; side?: SideFilter } = {},
) {
  const { seasonId, placeId, side } = options
  return api.get<PlayerTeamSummaryRow[]>(
    `/stats/players/${playerId}/by-team${qs({ season_id: seasonId, place_id: placeId, side })}`,
  )
}

export function getTeamSummary(
  teamId: number,
  options: { seasonId?: number; placeId?: number; side?: SideFilter } = {},
) {
  const { seasonId, placeId, side } = options
  return api.get<StatsSummary>(
    `/stats/teams/${teamId}/summary${qs({ season_id: seasonId, place_id: placeId, side })}`,
  )
}

export function getTeamExtras(
  teamId: number,
  options: { seasonId?: number; placeId?: number; side?: SideFilter } = {},
) {
  const { seasonId, placeId, side } = options
  return api.get<TeamExtras>(
    `/stats/teams/${teamId}/extras${qs({ season_id: seasonId, place_id: placeId, side })}`,
  )
}

export function getPlaceSummary(placeId: number, seasonId?: number) {
  return api.get<PlaceSummary>(`/stats/places/${placeId}/summary${qs({ season_id: seasonId })}`)
}

export function getHeadToHead(
  playerA: number,
  playerB: number,
  options: {
    seasonId?: number
    placeId?: number
    teamIdA?: number
    teamIdB?: number
    side?: SideFilter
  } = {},
) {
  const { seasonId, placeId, teamIdA, teamIdB, side } = options
  return api.get<HeadToHead>(
    `/stats/head-to-head${qs({
      player_a: playerA,
      player_b: playerB,
      season_id: seasonId,
      place_id: placeId,
      team_id_a: teamIdA,
      team_id_b: teamIdB,
      side,
    })}`,
  )
}

export function getAllPlayerSummaries(options: StatsFilters = {}) {
  const { seasonId, teamId, placeId, side } = options
  return api.get<PlayerSummaryRow[]>(
    `/stats/players-summary${qs({ season_id: seasonId, team_id: teamId, place_id: placeId, side })}`,
  )
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
  placeId?: number
  side?: SideFilter
}) {
  const { metric, x, seasonId, playerId, teamId, placeId, side } = options
  return api.get<TrendResponse>(
    `/stats/trend${qs({
      metric,
      x,
      season_id: seasonId,
      player_id: playerId,
      team_id: teamId,
      place_id: placeId,
      side,
    })}`,
  )
}
