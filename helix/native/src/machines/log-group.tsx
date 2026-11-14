/**
 * The machine a step of a log runs on a phone: what its press is named, the mark
 * its status draws, and whether what it holds is steps, lines, or nothing.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { LogContext, type LogOffer } from './log'
import { boundTo, given } from './props'
import type { Turned } from './toggle'

/** The step a line or a step stands in. */
export const LogStep = createContext<
  | {
      /** Tells the step a step stands in it. */
      readonly nest: () => void
      /** Opens the step, where a search found what it holds. */
      readonly reveal: () => void
    }
  | undefined
>(undefined)

/** The mark each status draws. */
const MARKS: Readonly<Record<string, string>> = {
  done: 'check-circle-fill',
  failed: 'x-circle-fill',
  pending: 'circle',
  running: 'clock',
  skipped: 'minus',
}

/** The width a step's heading stands in, as the log around it measured it. */
const frameOf = (offer: LogOffer | undefined): string =>
  offer === undefined || offer.frame === 0 ? '100%' : `${offer.frame}px`

/** Hosts a step. */
export const useLogGroup = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const around = useContext(LogStep)
  const offer_ = useContext(LogContext)
  const [steps, setSteps] = useState(false)
  const nest = around?.nest
  useEffect(() => nest?.(), [nest])
  const turn = useRef(toggled)
  turn.current = toggled
  const reveal = useCallback(() => {
    if (turn.current?.checked !== true) {
      turn.current?.stand?.(true)
    }
  }, [])
  const offer = useMemo(() => ({ nest: () => setSteps(true), reveal }), [reveal])
  const status = typeof read('status') === 'string' ? String(read('status')) : ''
  const heading = String(read('heading') ?? '')
  const duration = String(read('duration') ?? '')
  const tag = locale().read()
  const spoken =
    status === '' ? '' : formatMessage(String(read('statusLabel') ?? ''), { status }, tag)
  const drawn = read('logDrawn') === true
  const empty = !drawn && Children.count(props.children as ReactNode) === 0
  const flag = (bound: string, value: boolean | string): Record<string, boolean | string> => ({
    [boundTo(use, bound, 'state') ?? bound]: value,
  })
  return {
    marks: [
      ...(toggled?.checked === true ? ['open'] : []),
      ...(steps ? ['steps'] : []),
      ...(empty ? ['empty'] : []),
    ],
    parts: {
      host: {
        states: {
          ...flag('digits', String(offer_?.digits || 2)),
          ...flag('frame', frameOf(offer_)),
          ...flag('durationHidden', duration === ''),
          ...flag('heard', [heading, spoken, duration].filter(Boolean).join(' ')),
          ...flag('statusHidden', status === ''),
          ...flag('statusIcon', MARKS[status] ?? ''),
        },
      },
    },
    provide: (held: ReactNode) => <LogStep.Provider value={offer}>{held}</LogStep.Provider>,
  }
}
