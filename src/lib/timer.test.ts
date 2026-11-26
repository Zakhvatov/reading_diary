import { describe, expect, it } from 'vitest'
import {
  MAX_SESSION_MS,
  elapsedMs,
  formatClock,
  needsTrim,
  parseTimer,
  pauseTimer,
  resumeTimer,
  serializeTimer,
  startTimer,
  stopTimer,
} from './timer'

const START = Date.UTC(2026, 4, 20, 10, 0, 0)
const MINUTE = 60_000

describe('timer transitions', () => {
  it('starts in a running state and counts from Date.now()', () => {
    const timer = startTimer('book-1', START)

    expect(timer).toMatchObject({
      bookId: 'book-1',
      startedAt: new Date(START).toISOString(),
      accumulatedMs: 0,
      runningSince: START,
    })
    expect(elapsedMs(timer, START)).toBe(0)
    expect(elapsedMs(timer, START + 5 * MINUTE)).toBe(5 * MINUTE)
  })

  it('pauses and freezes the elapsed time', () => {
    const timer = startTimer('book-1', START)
    const paused = pauseTimer(timer, START + 10 * MINUTE)

    expect(paused.runningSince).toBeUndefined()
    expect(elapsedMs(paused, START + 90 * MINUTE)).toBe(10 * MINUTE)
  })

  it('resumes without counting the pause', () => {
    const timer = startTimer('book-1', START)
    const paused = pauseTimer(timer, START + 10 * MINUTE)
    const resumed = resumeTimer(paused, START + 30 * MINUTE)

    expect(resumed.runningSince).toBe(START + 30 * MINUTE)
    expect(elapsedMs(resumed, START + 35 * MINUTE)).toBe(15 * MINUTE)
  })

  it('keeps a paused timer paused and a running timer running', () => {
    const timer = startTimer('book-1', START)
    expect(pauseTimer(timer, START + MINUTE).accumulatedMs).toBe(MINUTE)

    const paused = pauseTimer(timer, START + MINUTE)
    expect(pauseTimer(paused, START + 2 * MINUTE)).toBe(paused)
    expect(resumeTimer(timer, START + 2 * MINUTE)).toBe(timer)
  })

  it('stops with the accumulated duration and the original start', () => {
    const timer = startTimer('book-1', START)
    const paused = pauseTimer(timer, START + 25 * MINUTE)
    const resumed = resumeTimer(paused, START + 45 * MINUTE)
    const stopped = stopTimer(resumed, START + 50 * MINUTE)

    expect(stopped).toEqual({
      bookId: 'book-1',
      startedAt: new Date(START).toISOString(),
      durationMs: 30 * MINUTE,
      needsTrim: false,
    })
  })

  it('does not go below zero when the clock moves backwards', () => {
    const timer = startTimer('book-1', START)

    expect(elapsedMs(timer, START - 10 * MINUTE)).toBe(0)
  })
})

describe('twelve hour guard', () => {
  it('flags sessions strictly longer than twelve hours', () => {
    expect(needsTrim(MAX_SESSION_MS)).toBe(false)
    expect(needsTrim(MAX_SESSION_MS + 1)).toBe(true)
    expect(needsTrim(23 * 60 * MINUTE)).toBe(true)
  })

  it('marks a stopped twelve-hour session as trimmed', () => {
    const timer = startTimer('book-1', START)
    const stopped = stopTimer(timer, START + MAX_SESSION_MS + MINUTE)

    expect(stopped.needsTrim).toBe(true)
  })
})

describe('serialization', () => {
  it('round-trips a running timer', () => {
    const timer = startTimer('book-1', START)
    const parsed = parseTimer(serializeTimer(timer))

    expect(parsed).toEqual(timer)
  })

  it('round-trips a paused timer without runningSince', () => {
    const paused = pauseTimer(startTimer('book-1', START), START + 7 * MINUTE)
    const parsed = parseTimer(serializeTimer(paused))

    expect(parsed).toEqual(paused)
    expect(serializeTimer(paused)).not.toContain('runningSince')
  })

  it('rejects empty, broken and structurally wrong payloads', () => {
    expect(parseTimer(null)).toBeNull()
    expect(parseTimer('')).toBeNull()
    expect(parseTimer('not json')).toBeNull()
    expect(parseTimer('[]')).toBeNull()
    expect(parseTimer('"timer"')).toBeNull()
    expect(parseTimer('{}')).toBeNull()
    expect(
      parseTimer(
        JSON.stringify({ bookId: '', startedAt: '2026-05-20T10:00:00.000Z', accumulatedMs: 0 }),
      ),
    ).toBeNull()
    expect(
      parseTimer(JSON.stringify({ bookId: 'book-1', startedAt: 'вчера', accumulatedMs: 0 })),
    ).toBeNull()
    expect(
      parseTimer(
        JSON.stringify({
          bookId: 'book-1',
          startedAt: '2026-05-20T10:00:00.000Z',
          accumulatedMs: -1,
        }),
      ),
    ).toBeNull()
    expect(
      parseTimer(
        JSON.stringify({
          bookId: 'book-1',
          startedAt: '2026-05-20T10:00:00.000Z',
          accumulatedMs: 0,
          runningSince: 'now',
        }),
      ),
    ).toBeNull()
    expect(
      parseTimer(
        JSON.stringify({
          bookId: 'book-1',
          startedAt: '2026-05-20T10:00:00.000Z',
          accumulatedMs: 0,
          runningSince: 0,
        }),
      ),
    ).toBeNull()
  })
})

describe('formatClock', () => {
  it('formats hours, minutes and seconds with leading zeroes', () => {
    expect(formatClock(0)).toBe('00:00:00')
    expect(formatClock(65_000)).toBe('00:01:05')
    expect(formatClock(3 * 60 * MINUTE + 7 * MINUTE + 9_000)).toBe('03:07:09')
  })

  it('never shows negative time', () => {
    expect(formatClock(-5_000)).toBe('00:00:00')
  })
})
