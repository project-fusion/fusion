/**
 * A palette of commands on a phone: a dialog holding a filterable Listbox, which
 * runs a command as a reader chooses it.
 *
 * **A command keeps no value.** The list asks `before-change` as a reader chooses,
 * which the palette refuses, so the list holds nothing and the same command runs
 * again. The palette asks `before-select` with the command's value, says `select`,
 * and closes, or with `inline` leaves the list where it stands. A refused
 * `before-select` keeps the palette open.
 *
 * **The dialog opens on the palette's own toggle**, and a dismissal of the dialog,
 * a press on the scrim, Escape, or the back gesture, asks the palette's
 * `before-close`. **A closed dialog holds nothing**, so each opening starts with an
 * empty filter and no command highlighted, as the web clears both.
 */
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { wordsIn } from './listbox-hooks'
import { boundTo, given, type HelixEvent, tell, told } from './props'
import { closeIf } from './select'
import type { Turned } from './toggle'

/** Whether a region prop holds anything to draw. */
const fills = (content: unknown): boolean =>
  content !== undefined &&
  content !== null &&
  content !== false &&
  !(Array.isArray(content) && content.every((one) => !fills(one)))

/** Asks whether the command may run, and says it ran once nobody refused. */
const choose = (family: Family, props: Props, use: MachineUse, value: string): boolean => {
  const before = boundTo(use, 'onBeforeSelect', 'event')
  if (before !== undefined && !tell(family, props, before, { value })) {
    return false
  }
  const after = boundTo(use, 'onSelect', 'event')
  if (after !== undefined) {
    told(family, props, after, { value })
  }
  return true
}

/** Hosts a palette of commands. */
export const useCommand = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop') ?? name)
  const inline = read('inline') === true
  const label = wordsIn(read('label')) || wordsIn(read('fallbackLabel'))
  const state = (name: string): string => boundTo(use, name, 'state') ?? name
  const open = toggled?.checked === true
  return {
    marks: [],
    parts: {
      dialog: {
        view: {
          material: props.material,
          /* The palette's own toggle decides, so a refused `before-close` keeps it open. */
          onBeforeClose: (heard: HelixEvent) => {
            heard.preventDefault()
            closeIf(toggled)
          },
          open,
        },
      },
      host: {
        states: {
          [state('error')]: wordsIn(read('errorText')) !== '',
          [state('footed')]: fills(props.footer),
          [state('listName')]: label,
          [state('loading')]: read('loading') === true,
          [state('modal')]: !inline,
          [state('status')]: '',
        },
      },
      listbox: {
        view: {
          onBeforeChange: (heard: HelixEvent) => {
            /* The list holds nothing, so the command chosen last runs again. */
            heard.preventDefault()
            const next = (heard.detail as { readonly value: string }).value
            if (choose(family, props, use, next) && !inline) {
              closeIf(toggled)
            }
          },
          value: '',
        },
      },
    },
  }
}
