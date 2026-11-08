import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

// Prompt-cache TTL of this session (1h; set to 5 for a 5-minute cache).
const CACHE_TTL_MIN = 60
const TICK_MS = 30_000

const limits = atom({ plugin: 'usage-band', key: 'limits' } as const, [] as Limit[], {
  shape: 'limits-1',
})
const lastResponseAt = atom(
  { plugin: 'usage-band', key: 'lastResponseAt' } as const,
  null as number | null,
)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const LABEL: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'spend',
}

function fmtDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return m ? `${h}h${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d${h % 24}h`
}

export const register: Register = on => {
  let stopTick: (() => void) | undefined

  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await update($, limits, () => usage.rateLimits.map(l => ({ ...l })))
    const t = await $.clock.now()
    await update($, now, () => t)

    stopTick?.()
    const timer = $.clock.every(TICK_MS, () => {
      void $.clock.now().then(ms => update($, now, () => ms))
    })
    stopTick = () => timer.cancel()

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => e.rateLimits.map(l => ({ ...l })))
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const t = await $.clock.now()
    await update($, lastResponseAt, () => t)
    await update($, now, () => t)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, limits)
    const last = await read($, lastResponseAt)
    const t = await read($, now)

    // No fragments (<>...</>) in this tree: the band lays a fragment out as
    // a column, which pushed part of a segment onto the next row.
    const bodyColumns = e.props.bodyColumns
    const BAR = bodyColumns >= 95 ? 8 : bodyColumns >= 75 ? 5 : 0
    const bar = (fraction: number) => {
      const full = Math.round(Math.min(1, Math.max(0, fraction)) * BAR)
      return '▰'.repeat(full) + '▱'.repeat(BAR - full)
    }

    const segments = list.map(l => {
      const left = Math.max(0, 100 - l.percentUsed)
      const reset = l.resetsAt ? Date.parse(l.resetsAt) - t : NaN
      const color = left <= 10 ? 'red' : left <= 30 ? 'yellow' : 'green'
      return (
        <Box key={l.kind} columnGap={1} flexShrink={0}>
          <Text bold>{LABEL[l.kind] ?? l.kind}</Text>
          {BAR > 0 && <Text color={color}>{bar(left / 100)}</Text>}
          <Text color={color}>{`${Math.round(left)}%`.padStart(4)}</Text>
          {Number.isFinite(reset) && reset > 0 && (
            <Text dimColor>{`↻ ${fmtDuration(reset)}`}</Text>
          )}
        </Box>
      )
    })
    if (segments.length === 0) {
      segments.push(
        <Box key="none" columnGap={1} flexShrink={0}>
          <Text bold>usage</Text>
          <Text dimColor>대기 중</Text>
        </Box>,
      )
    }

    const ttlMs = CACHE_TTL_MIN * 60_000
    const leftMs = last === null ? null : last + ttlMs - t
    const cacheColor =
      leftMs === null ? undefined : leftMs <= 0 ? 'red' : leftMs < 5 * 60_000 ? 'yellow' : 'cyan'
    segments.push(
      <Box key="cache" columnGap={1} flexShrink={0}>
        <Text bold>cache</Text>
        {leftMs === null && <Text dimColor>대기 중</Text>}
        {leftMs !== null && leftMs <= 0 && <Text color="red">만료</Text>}
        {leftMs !== null && leftMs > 0 && BAR > 0 && (
          <Text color={cacheColor}>{bar(leftMs / ttlMs)}</Text>
        )}
        {leftMs !== null && leftMs > 0 && <Text color={cacheColor}>{fmtDuration(leftMs)}</Text>}
      </Box>,
    )

    return (
      <Box columnGap={1} paddingX={1} flexWrap="nowrap">
        {segments.flatMap((seg, i) =>
          i === 0 ? [seg] : [<Text key={`sep${i}`} dimColor>│</Text>, seg],
        )}
      </Box>
    )
  })
}
