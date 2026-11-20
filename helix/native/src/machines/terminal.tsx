/**
 * A terminal on a phone: the screen drawn from `@xterm/headless` as lines of
 * runs, the scrollback in a window that follows the newest line, the reader's
 * keys through a field the screen focuses on a press, the find bar, and the
 * status line once the process exits.
 *
 * **Output is batched to one draw a frame**, so a program that writes in a
 * burst costs one reading of the buffer, and `write` resolves once the
 * emulator has parsed it, as the web's does.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { encodeKey } from '@fusion.dev/helix-core/terminal'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { boundTo, given, tell } from './props'
import { type Engine, engineFor } from './terminal-engine'
import { inputView, namedBy, screenView, searchParts, statesOf, useHandle } from './terminal-parts'
import { cellOf, rowsOf, type TerminalRow, useSearch } from './terminal-screen'
import type { WindowDrawing, WindowScroller } from './window'

/** How long the bell's flash holds, in milliseconds, as the web's. */
const BELL = 200

/** The controls the frame draws where `controls` is absent, as the web's. */
const RESTING_CONTROLS = 'find clear'

type Send = (event: string, detail: Readonly<Record<string, unknown>>) => boolean

/** Tells the page an event by the name the source binds, as the props now stand. */
const useSend = (family: Family, props: Props, use: MachineUse): Send => {
  const latest = useRef(props)
  latest.current = props
  return useCallback(
    (event, detail) => {
      const name = boundTo(use, event, 'event')
      return name === undefined || tell(family, latest.current, name, detail)
    },
    [family, use],
  )
}

/** The grid's size: fixed by `columns` and `rows` together, else as many cells as fit the frame. */
const useGrid = (read: (name: string) => unknown) => {
  const guessed = cellOf(useTheme())
  /* Ten cells of the face as drawn, which the guess stands in for until laid out. */
  const [measured, setMeasured] = useState<{ height: number; width: number } | undefined>(undefined)
  const cell = measured ?? guessed
  const probe = useCallback(
    (event: { nativeEvent: { layout: { height: number; width: number } } }) => {
      const { height, width } = event.nativeEvent.layout
      if (width > 0 && height > 0) {
        setMeasured((was) =>
          was?.width === width / 10 && was.height === height ? was : { height, width: width / 10 },
        )
      }
    },
    [],
  )
  const [box, setBox] = useState<{ height: number; width: number } | undefined>(undefined)
  const fixedColumns = numberIn(read('columns'))
  const fixedRows = numberIn(read('rows'))
  const fitted = {
    columns: Math.max(2, Math.floor((box?.width ?? 0) / cell.width) || 80),
    rows: Math.max(1, Math.floor((box?.height ?? 0) / cell.height) || 24),
  }
  const fixed = fixedColumns !== undefined && fixedRows !== undefined
  return {
    box,
    cell,
    columns: fixed ? fixedColumns : fitted.columns,
    known: fixed || box !== undefined,
    probe,
    rows: fixed ? fixedRows : fitted.rows,
    setBox,
  }
}

export type { TerminalHandle } from './terminal-parts'

/** The emulator, its bell, and a draw a frame for what it parsed. */
const useEngine = (send: Send, open: boolean, columns: number, rows: number) => {
  const openRef = useRef(open)
  openRef.current = open
  const [drawn, redraw] = useState(0)
  const [ringing, setRinging] = useState(false)
  const ring = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const schedule = useCallback(() => {
    if (frame.current === undefined) {
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined
        redraw((was) => was + 1)
      })
    }
  }, [])
  const input = useCallback(
    (data: string) => {
      if (openRef.current && data !== '') {
        send('onTerminalInput', { binary: false, data })
      }
    },
    [send],
  )
  const engine = useRef<Engine | undefined>(undefined)
  if (engine.current === undefined) {
    engine.current = engineFor(columns, rows, {
      bell: () => {
        clearTimeout(ring.current)
        setRinging(true)
        ring.current = setTimeout(() => setRinging(false), BELL)
        send('onTerminalBell', {})
      },
      data: input,
      title: (title) => send('onTerminalTitle', { title }),
    })
  }
  const emulator = engine.current
  /* Disposed once the frame is gone for good: React mounts an element twice
     in development, and an emulator disposed by the first unmount kept
     printing but ran no control or color the program wrote. */
  const mounts = useRef(0)
  useEffect(() => {
    mounts.current += 1
    const mine = mounts.current
    return () => {
      setTimeout(() => {
        if (mounts.current === mine) {
          clearTimeout(ring.current)
          if (frame.current !== undefined) {
            cancelAnimationFrame(frame.current)
          }
          emulator.dispose()
        }
      }, 0)
    }
  }, [emulator])
  return { drawn, emulator, input, ringing, schedule }
}

/** The hardware keys a phone with a keyboard sends while the screen has focus, as the program reads them. */
const useHardwareKeys = (emulator: Engine, input: (data: string) => void) => {
  const [region, setRegion] = useState<unknown>(null)
  useEffect(() => {
    if (region === null) {
      return undefined
    }
    return keys().listen(region as never, (press: KeyPress) => {
      const typed = [...press.key].length === 1 && !press.control && !press.alt && !press.meta
      const data =
        press.claimed || typed ? undefined : encodeKey(press, emulator.applicationCursor())
      if (data === undefined) {
        return false
      }
      input(data)
      return true
    })
  }, [emulator, input, region])
  return setRegion
}

/** The window over the lines, which follows the newest line until the reader scrolls back. */
const useWindow = (
  entries: readonly TerminalRow[],
  current: number | undefined,
  line: number,
  laid: (width: number, height: number) => void,
): WindowDrawing => {
  const list = useRef<WindowScroller | null>(null)
  const following = useRef(true)
  useEffect(() => {
    if (entries.length === 0) {
      return
    }
    if (current !== undefined) {
      list.current?.scrollToIndex?.({ animated: false, index: current, viewPosition: 0.5 })
    } else if (following.current) {
      list.current?.scrollToEnd?.({ animated: false })
    }
  }, [entries, current])
  return {
    across: 1,
    gap: 0,
    horizontal: false,
    laid,
    listRef: (next) => {
      list.current = next
    },
    measured: () => undefined,
    moved: (offset, height, content) => {
      following.current = offset + height >= content - line
    },
    rows: entries,
    sideways: true,
  }
}

/** What the status line says once the process exits, and what a reader hears when it does. */
const useExit = (read: (name: string) => unknown, exitCode: number | undefined) => {
  const status =
    exitCode === undefined
      ? ''
      : formatMessage(wordsIn(read('exited-label')), { code: String(exitCode) }, '')
  /* News once the frame has drawn: an exit written in the markup is not. */
  const [said, setSaid] = useState('')
  const seen = useRef(exitCode)
  useEffect(() => {
    if (seen.current !== exitCode) {
      seen.current = exitCode
      setSaid(exitCode === undefined ? '' : status)
    }
  }, [exitCode, status])
  return { said, status }
}

/** Hosts a terminal. */
export const useTerminal = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const send = useSend(family, props, use)
  const exitCode = numberIn(read('exit-code'))
  const open = read('readonly') !== true && exitCode === undefined
  const grid = useGrid(read)
  const { drawn, emulator, input, ringing, schedule } = useEngine(
    send,
    open,
    grid.columns,
    grid.rows,
  )

  /* The grid follows the frame, and the page hears each new size. */
  const sized = useRef('')
  useEffect(() => {
    const size = `${grid.columns}x${grid.rows}`
    if (grid.known && sized.current !== size) {
      sized.current = size
      emulator.resize(grid.columns, grid.rows)
      schedule()
      send('onTerminalResize', {
        columns: grid.columns,
        height: Math.round(grid.box?.height ?? grid.rows * grid.cell.height),
        rows: grid.rows,
        width: Math.round(grid.box?.width ?? grid.columns * grid.cell.width),
      })
    }
  })

  const field = useRef<{ focus?: () => void } | null>(null)
  useHandle(props.ref, emulator, schedule, input, field)

  /* The screen's lines, read once a draw, and the search through them. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `drawn` counts the buffer's changes.
  const lines = useMemo(() => emulator.lines(open), [drawn, emulator, open])
  const search = useSearch(read, lines, (detail) => send('onFound', detail))
  const entries = useMemo(() => rowsOf(lines, search.marks), [lines, search.marks])
  const laid = useCallback(
    (width: number, height: number) =>
      grid.setBox((was) =>
        was?.width === width && was.height === height ? was : { height, width },
      ),
    [grid.setBox],
  )
  const windowed = useWindow(entries, search.current, grid.cell.height, laid)
  const setRegion = useHardwareKeys(emulator, input)
  const exit = useExit(read, exitCode)
  const touch = useRef<number | undefined>(undefined)

  const controls = (wordsIn(read('controls')) || RESTING_CONTROLS).split(/\s+/)
  const label = typeof props.label === 'string' ? props.label : ''
  const finds = controls.includes('find')
  const clears = controls.includes('clear')
  return {
    marks: [],
    parts: {
      clear: {
        view: {
          onPress: () => {
            emulator.clear()
            schedule()
          },
        },
      },
      host: {
        states: statesOf(use, {
          bell: ringing,
          clears,
          count: search.count,
          exited: exitCode !== undefined,
          findOpen: search.open,
          finds,
          headed: label !== '' || props.actions !== undefined || finds || clears,
          named: namedBy(read, props, label),
          said: search.said || exit.said,
          status: exit.status,
          title: label,
        }),
      },
      input: { view: inputView(open, input, field) },
      lines: { windowed },
      probe: { view: { onLayout: grid.probe } },
      region: { view: { ref: setRegion } },
      restart: { view: { onPress: () => send('onTerminalRestart', {}) } },
      ...searchParts(search),
      viewport: { view: screenView(open, touch, field) },
    },
  }
}
