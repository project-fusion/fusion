/**
 * A text field for filters on a phone: the page's tokens in the field, a typed
 * filter read into a facet on Return, and a list of suggestions under the field
 * while it has focus, which keeps the keyboard up as a reader chooses.
 *
 * **A token's remove press reaches the field**, as the web's `helix-dismiss` does,
 * and Backspace in an empty field asks the last token drawn to go. **The list opens
 * while the field has focus and has something to say**, options, a load, or no
 * match. Escape on a hardware keyboard closes it, or empties the text where it is
 * closed. A choice keeps it open, so a key's values come next.
 */
import { completeTerm, currentTerm, type FacetDetail } from '@fusion.dev/helix-core/filter-text'
import { type RefObject, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { ListHands } from './combobox-keys'
import { says } from './combobox-model'
import { type Caret, type Control, controlOf, textRequester } from './filter-input-control'
import {
  announced,
  chipsAfter,
  type Facets,
  facetTold,
  goneWith,
  type KeyNow,
  readFilters,
} from './filter-input-facets'
import { declaredFields } from './filter-input-fields'
import { type HandleHands, useFilterHandle } from './filter-input-handle'
import {
  countOptions,
  type Sourced,
  sourcedOptions,
  statusOf,
  useSource,
} from './filter-input-suggest'
import { requestOf, tokensOf } from './filter-input-tokens'
import type { FieldPicker, FilterInputAround } from './filter-menu-model'
import { FilterInputContext } from './filter-menu-model'
import type { ListOwner } from './list-owner'
import { useWritten, wordsIn } from './listbox-hooks'
import { boundTo, given, type HelixEvent, tell, told } from './props'
import type { Turned } from './toggle'

/** The menus joined to the field, and what the field offers them, kept for every draw. */
const useAround = (latest: {
  current: Facets['heard']
}): { readonly around: FilterInputAround; readonly pickers: Set<FieldPicker> } => {
  const pickers = useRef(new Set<FieldPicker>()).current
  const around: FilterInputAround = useMemo(
    () => ({
      hear: (kind, facet) => latest.current(kind, facet),
      join: (picker) => {
        pickers.add(picker)
        return () => pickers.delete(picker)
      },
    }),
    [latest, pickers],
  )
  return { around, pickers }
}

/** Turns the list to `wanted` as the wish changes, so a refusal or a dismissal stands. */
const useWish = (toggled: Turned | undefined, wanted: boolean): void => {
  const turned = useRef(toggled)
  turned.current = toggled
  useLayoutEffect(() => {
    if (turned.current !== undefined && wanted !== turned.current.checked) {
      turned.current.turn()
    }
  }, [wanted])
}

/** What the panel offers at one draw: the options, how many, and what it says. */
const offered = (
  read: (name: string) => unknown,
  passed: unknown,
  sourced: Sourced,
  term: string,
) => {
  const suggestions =
    typeof read('source') === 'function' ? sourcedOptions(sourced.suggestions) : passed
  const counted = countOptions(suggestions, term)
  const busy = read('loading') === true || sourced.fetching
  const unmatched =
    wordsIn(read('noResultsText')) !== '' && !busy && counted.all > 0 && counted.shown === 0
  return {
    busy,
    counted,
    suggesting: counted.shown > 0 || busy || unmatched,
    suggestions,
    unmatched,
  }
}

/** What the host's states read of the field at one draw. */
interface HostNow {
  readonly busy: boolean
  readonly clearShown: boolean
  readonly count: number
  readonly expandable: boolean
  readonly expanded: boolean
  readonly open: boolean
  readonly over: number
  readonly unmatched: boolean
}

/** The values the parts read, by the names the form binds them to. */
const hostStates = (
  use: MachineUse,
  word: (name: string) => string,
  now: HostNow,
): Readonly<Record<string, boolean | string>> => {
  const state = (name: string): string => boundTo(use, name, 'state') ?? name
  return {
    [state('busy')]: now.busy,
    [state('clearShown')]: now.clearShown,
    [state('listName')]: word('label') || 'Suggestions',
    [state('restLabel')]: word(now.expanded ? 'collapseLabel' : 'expandLabel'),
    [state('restPress')]: now.expandable && (now.over > 0 || now.expanded),
    [state('restShown')]: !now.expandable && now.over > 0,
    [state('restWords')]: now.expanded ? '' : says(word('restText'), { count: now.over }),
    [state('status')]: statusOf({
      busy: now.busy,
      count: now.count,
      loadingText: word('loadingText'),
      noResultsText: word('noResultsText'),
      one: word('suggestionLabel'),
      open: now.open,
      other: word('suggestionsLabel'),
    }),
    [state('unmatched')]: now.unmatched,
  }
}

/** Hosts a text field for filters. */
export const useFilterInput = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
  touch: () => void,
): {
  readonly behavior: Behavior
  readonly handle: Readonly<Record<string, unknown>>
  readonly value: string
} => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop') ?? name)
  const flag = (name: string): boolean => read(name) === true
  const word = (name: string): string => wordsIn(read(name))
  const disabled = flag('disabled')
  const [value, setValue] = useWritten(read('value'), word('defaultValue'))
  const [caret, setCaret] = useState<Caret>({ end: value.length, start: value.length })
  const [placed, setPlaced] = useState<Caret | undefined>(undefined)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [own, setOwn] = useState<readonly FacetDetail[]>([])
  const control = useRef<Control>(null)
  const hands = useRef<ListHands | undefined>(undefined)
  const hand = useRef<HandleHands | undefined>(undefined)
  /* The handle reads new text at once, as the web element's `value` holds it when its
     `input` is heard, with the caret after it. */
  const wrote = (next: string): void => {
    setValue(next)
    if (hand.current !== undefined) {
      const caret = { end: next.length, start: next.length }
      hand.current = { ...hand.current, caret, text: next }
    }
  }
  const request = textRequester({ family, props, setValue: wrote, touch, use, value })
  /* The text as it last stood finished, so `change` follows an edit once, as the web
     input's does as it loses focus or takes Return. */
  const committed = useRef(value)
  const commit = (): void => {
    if (committed.current !== latestText.current) {
      committed.current = latestText.current
      const event = boundTo(use, 'onChange', 'event')
      if (event !== undefined) {
        told(family, props, event, {}, { value: latestText.current })
      }
    }
  }
  const latestText = useRef(value)
  latestText.current = value
  const fields = declaredFields([props.start, props.end], props.children)
  const said = facetTold(family, props, use)
  const chips = flag('chips')
  const heard: Facets['heard'] = (kind, facet) => {
    const stood = said(kind, facet)
    if (kind === 'facet' && chips) {
      setOwn((held) => chipsAfter(held, facet))
    }
    return stood
  }
  const latestHeard = useRef(heard)
  latestHeard.current = heard
  const { around, pickers } = useAround(latestHeard)
  const announce = (facet: FacetDetail) => announced({ heard, pickers }, facet)
  const gone = goneWith({ announce, family, fields, props, use })
  const tokens = tokensOf(props.tags, own, expanded ? 0 : Number(read('maxTags') ?? 0), gone)
  const term = flag('filterSuggestions') ? currentTerm(value, caret.start) : ''
  const sourced = useSource(read('source'), value, caret.start, Number(read('filterDelay') ?? 0))
  const offer = offered(read, props.suggestions, sourced, term)
  const { busy, counted, suggestions, unmatched } = offer
  const open = toggled?.checked === true
  useWish(toggled, offer.suggesting && !dismissed && !disabled && focused)
  const clear = (): void => {
    if (value !== '') {
      request('')
    }
    control.current?.focus?.()
  }
  const key = useRef<KeyNow>(undefined as never)
  key.current = {
    clear,
    close: () => setDismissed(true),
    list: hands.current?.key,
    open,
    read: () => {
      const left = readFilters(value, fields, announce)
      if (left !== undefined) {
        request(left)
      }
      commit()
      return left !== undefined
    },
    text: value,
  }
  const choose = (chosen: string): void => {
    const event = boundTo(use, 'onBeforeSelect', 'event') ?? 'before-select'
    if (
      tell(family, props, event, { value: chosen }, { value: chosen }) &&
      sourced.values.has(chosen)
    ) {
      const done = completeTerm(value, caret.start, chosen)
      request(done.text)
      setPlaced({ end: done.caret, start: done.caret })
    }
  }
  /* A write and a caret put through the handle hold at once, as the web element's do,
     so a page that completes a term and then reads the caret reads where it put it. */
  hand.current = {
    caret,
    put: (start, end) => {
      setPlaced({ end, start })
      setCaret({ end, start })
      if (hand.current !== undefined) {
        hand.current = { ...hand.current, caret: { end, start } }
      }
    },
    text: value,
    write: wrote,
  }
  const handle = useFilterHandle(hand as RefObject<HandleHands>)
  const listening = useRef<(() => void) | undefined>(undefined)
  const listOwner: ListOwner = {
    again: () => undefined,
    ...(term === '' ? {} : { filter: term }),
    hands,
    keepsFocus: true,
    landed: () => undefined,
    opening: { where: 'none' },
    tab: () => setFocused(false),
  }
  return {
    behavior: {
      marks: [...(busy ? ['loading'] : []), ...(unmatched ? ['noResults'] : [])],
      parts: {
        clear: { view: { onPress: clear } },
        control: controlOf({
          back: () => {
            if (tokens.last !== undefined) {
              gone(tokens.last, requestOf(tokens.last))
            }
          },
          control,
          disabled,
          /* A field typed in has focus, though the first letter may come before its focus. */
          edit: (next) => {
            setDismissed(false)
            setFocused(true)
            request(next)
          },
          focus: (now) => {
            if (!now) {
              commit()
            }
            setFocused(now)
            setDismissed(false)
          },
          key,
          listening,
          placed,
          select: (next) => {
            setCaret(next)
            setPlaced(undefined)
          },
          value,
        }),
        host: {
          states: hostStates(use, word, {
            busy,
            clearShown: flag('clearable') && value !== '' && !disabled,
            count: counted.shown,
            expandable: flag('expandable'),
            expanded,
            open,
            over: tokens.over,
            unmatched,
          }),
        },
        listbox: {
          view: {
            listOwner,
            /* The list holds nothing: a choice is the page's, from `before-select`. */
            onBeforeChange: (event: HelixEvent) => {
              event.preventDefault()
              choose((event.detail as { readonly value: string }).value)
            },
            value: '',
          },
        },
        rest: { view: { onPress: () => setExpanded((was) => !was) } },
      },
      provide: (inside) => (
        <FilterInputContext.Provider value={around}>{inside}</FilterInputContext.Provider>
      ),
      regions: { suggestions, tags: tokens.drawn },
    },
    handle,
    value,
  }
}
