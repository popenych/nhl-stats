import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Textarea,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  IconCalendar,
  IconDeviceFloppy,
  IconDeviceGamepad2,
  IconMapPin,
  IconNotes,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import * as placesApi from '../../api/places'
import * as playersApi from '../../api/players'
import * as seasonsApi from '../../api/seasons'
import * as teamsApi from '../../api/teams'
import type { Game, GameCreateInput, OcrSideResult } from '../../api/types'
import { CreatableSelect } from '../../components/CreatableSelect'
import { toDateOnlyString } from '../../lib/date'
import { formatMMSS, isValidMMSS, parseMMSS } from '../../lib/time'
import { emptySide, type GameFormValues, type GameSideFormValues } from './gameFormTypes'
import { GameStatsGrid } from './GameStatsGrid'

function ocrSideToConfidence(result: OcrSideResult): Record<string, number> {
  return {
    goals: result.goals.confidence,
    shots: result.shots.confidence,
    hits: result.hits.confidence,
    timeOnAttack: result.time_on_attack_seconds.confidence,
    passingPct: result.passing_pct.confidence,
    faceoffsWon: result.faceoffs_won.confidence,
    penaltyMinutes: result.penalty_minutes_seconds.confidence,
    powerplayGoals: result.powerplay_goals.confidence,
    powerplayTotal: result.powerplay_total.confidence,
    powerplayMinutes: result.powerplay_minutes_seconds.confidence,
    shorthandedGoals: result.shorthanded_goals.confidence,
  }
}

function validateSide(prefix: 'home' | 'away', values: GameSideFormValues) {
  return {
    [`${prefix}.playerId`]: values.playerId ? null : 'Required',
    [`${prefix}.teamId`]: values.teamId ? null : 'Required',
    [`${prefix}.timeOnAttack`]: isValidMMSS(values.timeOnAttack) ? null : 'Expected mm:ss',
    [`${prefix}.penaltyMinutes`]: isValidMMSS(values.penaltyMinutes) ? null : 'Expected mm:ss',
    [`${prefix}.powerplayMinutes`]: isValidMMSS(values.powerplayMinutes) ? null : 'Expected mm:ss',
  }
}

function toSideInput(values: GameSideFormValues) {
  return {
    player_id: Number(values.playerId),
    team_id: Number(values.teamId),
    goals: values.goals,
    shots: values.shots,
    hits: values.hits,
    time_on_attack_seconds: parseMMSS(values.timeOnAttack),
    passing_pct: values.passingPct,
    faceoffs_won: values.faceoffsWon,
    penalty_minutes_seconds: parseMMSS(values.penaltyMinutes),
    powerplay_goals: values.powerplayGoals,
    powerplay_total: values.powerplayTotal,
    powerplay_minutes_seconds: parseMMSS(values.powerplayMinutes),
    shorthanded_goals: values.shorthandedGoals,
  }
}

function fromGameSide(side: Game['home']): GameSideFormValues {
  return {
    playerId: String(side.player.id),
    teamId: String(side.team.id),
    goals: side.goals,
    shots: side.shots,
    hits: side.hits,
    timeOnAttack: formatMMSS(side.time_on_attack_seconds),
    passingPct: side.passing_pct,
    faceoffsWon: side.faceoffs_won,
    penaltyMinutes: formatMMSS(side.penalty_minutes_seconds),
    powerplayGoals: side.powerplay_goals,
    powerplayTotal: side.powerplay_total,
    powerplayMinutes: formatMMSS(side.powerplay_minutes_seconds),
    shorthandedGoals: side.shorthanded_goals,
  }
}

export function GameForm({
  title,
  initialGame,
  onSubmit,
  submitting,
}: {
  title: string
  initialGame?: Game
  onSubmit: (data: GameCreateInput) => void
  submitting: boolean
}) {
  const queryClient = useQueryClient()
  const [photoPath, setPhotoPath] = useState<string | null>(initialGame?.photo_path ?? null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<{
    home: Record<string, number>
    away: Record<string, number>
  } | null>(null)
  const [lowQualityExtraction, setLowQualityExtraction] = useState(false)
  const [teamHints, setTeamHints] = useState<{ home: string | null; away: string | null }>({
    home: null,
    away: null,
  })

  const { data: players } = useQuery({ queryKey: ['players'], queryFn: playersApi.listPlayers })
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })

  const extractMutation = useMutation({
    mutationFn: gamesApi.extractGamePhoto,
    onSuccess: (res) => {
      setPhotoPath(res.photo_path)
      setConfidence({ home: ocrSideToConfidence(res.home), away: ocrSideToConfidence(res.away) })
      setLowQualityExtraction(res.labels_found < res.labels_expected)
      applyExtractedSide('home', res.home)
      applyExtractedSide('away', res.away)
      applyTeamGuess('home', res.home_team_guess)
      applyTeamGuess('away', res.away_team_guess)
    },
    onError: () => notifications.show({ message: 'Photo upload / reading failed', color: 'red' }),
  })

  function applyTeamGuess(
    side: 'home' | 'away',
    guess: { team_id: number | null; raw_text: string },
  ) {
    if (guess.team_id) {
      form.setFieldValue(`${side}.teamId`, String(guess.team_id))
      setTeamHints((h) => ({ ...h, [side]: null }))
    } else if (guess.raw_text) {
      setTeamHints((h) => ({ ...h, [side]: guess.raw_text }))
    }
  }

  function applyExtractedSide(side: 'home' | 'away', result: OcrSideResult) {
    const set = (field: keyof GameSideFormValues, value: number) =>
      form.setFieldValue(`${side}.${field}`, value)

    if (typeof result.goals.value === 'number') set('goals', result.goals.value)
    if (typeof result.shots.value === 'number') set('shots', result.shots.value)
    if (typeof result.hits.value === 'number') set('hits', result.hits.value)
    if (typeof result.time_on_attack_seconds.value === 'number') {
      form.setFieldValue(`${side}.timeOnAttack`, formatMMSS(result.time_on_attack_seconds.value))
    }
    if (typeof result.passing_pct.value === 'number') set('passingPct', result.passing_pct.value)
    if (typeof result.faceoffs_won.value === 'number') set('faceoffsWon', result.faceoffs_won.value)
    if (typeof result.penalty_minutes_seconds.value === 'number') {
      form.setFieldValue(`${side}.penaltyMinutes`, formatMMSS(result.penalty_minutes_seconds.value))
    }
    if (typeof result.powerplay_goals.value === 'number') {
      set('powerplayGoals', result.powerplay_goals.value)
    }
    if (typeof result.powerplay_total.value === 'number') {
      set('powerplayTotal', result.powerplay_total.value)
    }
    if (typeof result.powerplay_minutes_seconds.value === 'number') {
      form.setFieldValue(
        `${side}.powerplayMinutes`,
        formatMMSS(result.powerplay_minutes_seconds.value),
      )
    }
    if (typeof result.shorthanded_goals.value === 'number') {
      set('shorthandedGoals', result.shorthanded_goals.value)
    }
  }

  const form = useForm<GameFormValues>({
    initialValues: initialGame
      ? {
          date: initialGame.date,
          seasonId: String(initialGame.season.id),
          placeId: String(initialGame.place.id),
          notes: initialGame.notes ?? '',
          home: fromGameSide(initialGame.home),
          away: fromGameSide(initialGame.away),
        }
      : {
          date: new Date(),
          seasonId: null,
          placeId: null,
          notes: '',
          home: { ...emptySide },
          away: { ...emptySide },
        },
    validate: (values) => ({
      seasonId: values.seasonId ? null : 'Required',
      placeId: values.placeId ? null : 'Required',
      ...validateSide('home', values.home),
      ...validateSide('away', values.away),
    }),
  })

  // Default a new game to the newest season (highest sort_order — seasons
  // are append-only and ordered that way) rather than making the user pick
  // it every time; only when creating (not editing) and nothing's chosen yet.
  useEffect(() => {
    if (initialGame || form.values.seasonId || !seasons || seasons.length === 0) return
    const newest = seasons.reduce((a, b) => (b.sort_order > a.sort_order ? b : a))
    form.setFieldValue('seasonId', String(newest.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when seasons load
  }, [seasons])

  function handleSubmit(values: GameFormValues) {
    setSubmitError(null)
    if (!photoPath) {
      setSubmitError('Upload the stats photo first')
      return
    }
    if (values.home.playerId === values.away.playerId) {
      setSubmitError('Home and away must be different players')
      return
    }

    onSubmit({
      date: toDateOnlyString(values.date),
      season_id: Number(values.seasonId),
      place_id: Number(values.placeId),
      photo_path: photoPath,
      notes: values.notes || undefined,
      home: toSideInput(values.home),
      away: toSideInput(values.away),
    })
  }

  return (
    <Stack maw={900}>
      <Title order={2}>{title}</Title>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Stats photo
        </Title>
        {photoPath ? (
          <Stack>
            <Image src={gamesApi.photoUrl(photoPath)} radius="sm" mah={300} fit="contain" />
            <Button
              variant="light"
              onClick={() => {
                setPhotoPath(null)
                setConfidence(null)
                setLowQualityExtraction(false)
                setTeamHints({ home: null, away: null })
              }}
            >
              Replace photo
            </Button>
          </Stack>
        ) : (
          <Dropzone
            onDrop={(files) => files[0] && extractMutation.mutate(files[0])}
            accept={IMAGE_MIME_TYPE}
            maxFiles={1}
            loading={extractMutation.isPending}
          >
            <Group justify="center" py="lg" px="xs">
              <Title order={5} c="dimmed" ta="center">
                {extractMutation.isPending
                  ? 'Reading stats from photo — this can take a few seconds…'
                  : 'Tap to take or choose the post-game stats photo'}
              </Title>
            </Group>
          </Dropzone>
        )}
        {lowQualityExtraction && (
          <Alert color="yellow" mt="sm" title="Couldn't read this photo well">
            Please double check every stat below — some may be missing or wrong.
          </Alert>
        )}
      </Paper>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Paper withBorder p="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <DateInput
                label="Date"
                required
                leftSection={<IconCalendar size={16} />}
                {...form.getInputProps('date')}
              />
              <CreatableSelect
                label="Season"
                createLabel="Add a season"
                icon={<IconDeviceGamepad2 size={16} />}
                data={(seasons ?? []).map((s) => ({
                  value: String(s.id),
                  label: s.icon ? `${s.icon} ${s.name}` : s.name,
                }))}
                value={form.values.seasonId}
                onChange={(v) => form.setFieldValue('seasonId', v)}
                onCreate={async (name) => {
                  const season = await seasonsApi.createSeason(name)
                  queryClient.invalidateQueries({ queryKey: ['seasons'] })
                  return season
                }}
              />
              <CreatableSelect
                label="Place"
                createLabel="Add a place"
                icon={<IconMapPin size={16} />}
                data={(places ?? []).map((p) => ({
                  value: String(p.id),
                  label: p.icon ? `${p.icon} ${p.name}` : p.name,
                }))}
                value={form.values.placeId}
                onChange={(v) => form.setFieldValue('placeId', v)}
                onCreate={async (name) => {
                  const place = await placesApi.createPlace(name)
                  queryClient.invalidateQueries({ queryKey: ['places'] })
                  return place
                }}
              />
            </SimpleGrid>
            <Textarea
              label="Notes (optional)"
              mt="sm"
              leftSection={<IconNotes size={16} />}
              {...form.getInputProps('notes')}
            />
          </Paper>

          <GameStatsGrid
            form={form}
            players={players ?? []}
            teams={teams ?? []}
            confidence={confidence ?? undefined}
            teamHints={teamHints}
          />

          {submitError && <Alert color="red">{submitError}</Alert>}

          <Button
            type="submit"
            loading={submitting}
            size="md"
            leftSection={<IconDeviceFloppy size={18} />}
          >
            Save game
          </Button>
        </Stack>
      </form>
    </Stack>
  )
}
