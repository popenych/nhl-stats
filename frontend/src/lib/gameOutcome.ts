import type { GameListItem, GameSide } from '../api/types'

export type Outcome = 'win' | 'loss' | 'tie' | null

function outcomeOf(mine: GameSide | null, opp: GameSide | null): Outcome {
  if (!mine || !opp) return null
  if (mine.goals === opp.goals) return 'tie'
  return mine.goals > opp.goals ? 'win' : 'loss'
}

export function myOutcome(g: GameListItem, playerId: number | undefined): Outcome {
  if (playerId === undefined) return null
  const mine =
    g.home.player.id === playerId ? g.home : g.away.player.id === playerId ? g.away : null
  const opp = mine ? (mine === g.home ? g.away : g.home) : null
  return outcomeOf(mine, opp)
}

// A team can appear on either side across different games (or, rarely, on
// both sides of the same game if two players picked the same team) — take
// the first matching side, same as the backend's team-summary aggregation.
export function teamOutcome(g: GameListItem, teamId: number | undefined): Outcome {
  if (teamId === undefined) return null
  const mine = g.home.team.id === teamId ? g.home : g.away.team.id === teamId ? g.away : null
  const opp = mine ? (mine === g.home ? g.away : g.home) : null
  return outcomeOf(mine, opp)
}
