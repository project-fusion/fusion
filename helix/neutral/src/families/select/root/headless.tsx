import {
  Announce,
  bare,
  boolean,
  callback,
  cancelable,
  headless,
  Layer,
  object,
  oneOf,
  Pressable,
  property,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Select's headless tier: a field that opens a list of options, shows what is
 * chosen on its trigger, and owns the value the list takes its changes through.
 *
 * **The list is Listbox**, with its keys, filter, and windowed `items`. The options
 * stay the page's: on the web they are slotted through into the list, and on a phone
 * they join a hidden copy of themselves for the trigger's words while the list is
 * closed, and the list's own as it opens.
 *
 * **A choice closes the list**, unless `multiple` is set, and so does the chosen
 * option pressed again. `before-change` may refuse a choice, which leaves the list
 * as it stands.
 *
 * **The closed trigger hears a hardware keyboard**: Down, Up, Enter, Space, Home, and
 * End open the list, a typed letter chooses, or under `multiple` opens on the match,
 * and the inline arrows step the choice, the other way round on a right-to-left page.
 *
 * **In a window narrower than 30rem the panel is a sheet**, and in a wider one a
 * popover. `presentation` forces either.
 *
 * **The web's**: `autocomplete`'s hidden select, `name`, `focusable`, a toolbar's
 * coordination on the web, and `value-content`, a function that returns a template.
 * `position="item-aligned"` stands a popover's chosen option on the trigger on both;
 * a sheet ignores it, on both.
 *
 * **Held to `helix-select`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('select', {
  props: {
    ariaLabel: string(),
    autocomplete: web(''),
    defaultOpen: false,
    defaultValue: '',
    disabled: false,
    emptyText: 'No matches',
    feedback: '',
    filterable: false,
    hint: '',
    items: property(object()),
    label: '',
    listLabel: 'Options',
    loading: false,
    loadingText: 'Loading',
    multiple: false,
    /* A form's, which a phone has none of. */
    name: web(''),
    open: boolean(),
    placeholder: 'Choose',
    position: oneOf(['floating', 'item-aligned'], 'floating'),
    presentation: oneOf(['auto', 'popover', 'sheet'], 'auto'),
    required: false,
    value: string(),
    valueContent: web(callback('(chosen: readonly HelixOption[]) => unknown')),
    valueMissingMessage: 'Choose one to continue.',
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeFilter: cancelable(['value']),
    beforeOpen: cancelable(['open']),
    change: bare(),
    filter: ['value'],
    input: bare(),
    loadMore: [],
    toggle: bare(['newState', 'oldState']),
  },
  states: [
    'alignedEnd',
    'alignedStart',
    'invalid',
    'open',
    'placedBottom',
    'placedTop',
    'settled',
    'sheet',
  ],
  select: {
    defaultValue: 'defaultValue',
    disabled: 'disabled',
    filterable: 'filterable',
    items: 'items',
    listLabel: 'listLabel',
    listName: 'listName',
    multiple: 'multiple',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    placeholder: 'placeholder',
    position: 'position',
    said: 'said',
    status: 'status',
    value: 'value',
    words: 'words',
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ props, select, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      {/* The options, joined for the trigger's words while the list is closed. */}
      <View
        ariaHidden
        part="held"
        platform="native"
      >
        <Slot />
      </View>
      {/* The trigger's own box on a phone, which the panel is placed against. */}
      <Wrap
        part="anchor"
        platform="native"
      >
        <Pressable
          disabled={props.disabled}
          expanded={props.open}
          label={select.said}
          part="trigger"
          popup="listbox"
          role="button"
        >
          <Slot name="start" />
          <View
            part="value"
            run
          >
            <Text part="value-words">{select.words}</Text>
          </View>
          <Slot name="end" />
          <Slot name="indicator">
            <View
              ariaHidden
              icon="caret-down"
              part="indicator"
            />
          </Slot>
        </Pressable>
      </Wrap>
      <Layer
        anchor="anchor"
        anchorPress="toggle"
        closedby="any"
        label={select.listName}
        offset={4}
        open={props.open}
        part="surface"
        placement="bottom-start"
        presentation={props.presentation}
      >
        <Wrap
          bubbles="before-filter filter load-more"
          draws="listbox"
          exports={{
            empty: true,
            error: true,
            feedback: true,
            'filter-icon': true,
            'filter-mark': true,
            hint: true,
            items: true,
            label: true,
            live: true,
            loading: true,
            search: true,
            'search-field': true,
            voice: true,
            'voice-level': true,
            'voice-level-canvas': true,
            'voice-listening': true,
            'voice-status': true,
          }}
          gives={{
            ariaLabel: select.listName,
            emptyText: props.emptyText,
            filterable: props.filterable,
            items: props.items,
            loading: props.loading,
            loadingText: props.loadingText,
            manual: true,
            multiple: props.multiple,
          }}
          part="listbox"
        >
          <Slot />
        </Wrap>
      </Layer>
      {!state.invalid ? (
        <Wrap
          part="hint"
          when={props.hint}
        >
          <Slot name="hint">
            <Text part="hint-text">{props.hint}</Text>
          </Slot>
        </Wrap>
      ) : (
        <View
          part="feedback"
          role="alert"
        >
          <Slot name="feedback">
            <Text part="feedback-text">{validation.message}</Text>
          </Slot>
        </View>
      )}
      <Announce
        follows="status"
        part="live"
      >
        {select.status}
      </Announce>
    </>
  ),
})
