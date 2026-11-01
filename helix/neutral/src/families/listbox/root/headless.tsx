import {
  Announce,
  bare,
  callback,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Listbox's headless tier: a list of options, from which a reader chooses one or
 * several, with a field's label, hint, and message around it.
 *
 * **The options join it wherever they stand**, through groups too: on the web the
 * element walks its children, and on a phone each option joins through a context.
 * `items` draws them from data, windowed, and then the children are not read.
 *
 * **Selected and active are two facts.** The value is what is chosen, and the
 * highlight is where the keys are. In a list of one choice the arrows choose as
 * they move, unless `manual` is set. Under `multiple`, a press toggles an option.
 *
 * **The keys read core's arithmetic**, the same the web element reads, and on a
 * phone they are a hardware keyboard's: Up, Down, Home, End, Page Up, Page Down, a
 * typed letter, Enter, Space, Shift with Space, Shift with Home or End, Control or
 * Command with A, and under `layout="grid"`, the arrows along the columns.
 *
 * **A Shift range adds**: Shift with Space or a press takes in every option from
 * the one last chosen, and lets none go. The multiple selection machine other sets
 * run replaces the last range, so this list does not bind it.
 *
 * **A phone has no `aria-activedescendant`, so virtual focus is the runtime's**:
 * the highlight is drawn for a hardware keyboard, scrolled into the list, and said
 * as it moves from the filter field, and every option takes a screen reader's
 * focus of its own.
 *
 * **`filterable` draws a field that narrows the list.** `before-filter` asks first
 * and `filter` says it stood, a group a filter has emptied goes with its options,
 * and a reader hears how many are left. Escape clears it.
 *
 * **`reorderable` lets a reader move options**: Alt with an arrow, a screen
 * reader's actions, and on a phone a long press and a drag, within a group. The
 * page moves them on `reorder`. The web needs the entry imported, and a phone
 * carries the moves in the runtime.
 *
 * **The web's**: `autocomplete`'s hidden select, `name`, dictation, which a phone's
 * keyboard offers itself, `filter-delay`'s attribute form, and the marks a filter
 * draws over the words it matched, which paint through `CSS.highlights`.
 *
 * **Held to `helix-listbox`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('listbox', {
  props: {
    ariaLabel: string(),
    autocomplete: web('off'),
    defaultFilter: '',
    defaultValue: '',
    dictationDeniedLabel: web('Dictation needs the microphone'),
    dictationFailedLabel: web('Dictation stopped with an error'),
    dictationUnreachableLabel: web('Dictation could not reach the speech service'),
    disabled: false,
    emptyText: 'No matches',
    errorText: '',
    feedback: '',
    filter: string(),
    filterable: false,
    filterDelay: number(),
    filterLabel: 'Filter',
    filterMatch: callback('(text: string, filter: string) => boolean'),
    hint: '',
    items: property(object()),
    label: '',
    layout: oneOf(['grid', 'stack']),
    listeningLabel: web('Listening'),
    /* The old name of `error-text`, the web's for one release. */
    loadError: web(string()),
    loading: false,
    loadingText: 'Loading',
    manual: false,
    multiple: false,
    /* A form's, which a phone has none of. */
    name: web(''),
    noResultsText: string(),
    reorderable: false,
    required: false,
    /* The old form of `results-label`, the web's for one release. */
    resultLabel: web(string()),
    resultsLabel: '{count, plural, one {# result} other {# results}}',
    selectedLabel: '{name}, selected',
    stoppedListeningLabel: web('Stopped listening'),
    value: string(),
    valueMissingMessage: 'Choose one to continue.',
    voice: web(false),
    voiceLabel: web('Dictate'),
    voiceStopLabel: web('Stop dictation'),
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeFilter: cancelable(['value']),
    beforeListen: web(cancelable()),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'to', 'value']),
    change: bare(),
    filter: ['value'],
    input: bare(),
    listen: web([]),
    loadMore: [],
    reorder: ['from', 'key', 'keys', 'kind', 'to', 'value'],
  },
  states: ['empty', 'error', 'invalid', 'listening', 'loading', 'noResults', 'settled'],
  listbox: {
    childrenShown: 'childrenShown',
    defaultFilter: 'defaultFilter',
    defaultValue: 'defaultValue',
    disabled: 'disabled',
    emptyShown: 'emptyShown',
    emptyText: 'emptyText',
    emptyWords: 'emptyWords',
    errorShown: 'errorShown',
    errorText: 'errorText',
    errorWords: 'errorWords',
    filter: 'filter',
    filterDelay: 'filterDelay',
    filterMatch: 'filterMatch',
    filterable: 'filterable',
    items: 'items',
    layout: 'layout',
    loading: 'loading',
    loadingShown: 'loadingShown',
    loadingText: 'loadingText',
    manual: 'manual',
    multiple: 'multiple',
    noResultsText: 'noResultsText',
    onBeforeChange: 'beforeChange',
    onBeforeFilter: 'beforeFilter',
    onBeforeReorder: 'beforeReorder',
    onChange: 'change',
    onFilter: 'filter',
    onInput: 'input',
    onLoadMore: 'loadMore',
    onReorder: 'reorder',
    reorderable: 'reorderable',
    resultsLabel: 'resultsLabel',
    rows: 'rows',
    selectedLabel: 'selectedLabel',
    value: 'value',
    windowed: 'windowed',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ entry, listbox, props, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      {props.filterable && (
        <View part="search">
          <View
            ariaHidden
            part="filter-icon"
          >
            <Slot name="filter-icon">
              <View
                ariaHidden
                icon="magnifying-glass"
                part="filter-mark"
              />
            </Slot>
          </View>
          <TextInput
            autoCorrect={false}
            disabled={props.disabled}
            label={props.filterLabel}
            part="search-field"
            placeholder={props.filterLabel}
          />
          {props.voice && (
            <Pressable
              also={{ 'voice-listening': state.listening }}
              label={props.voiceLabel}
              part="voice"
              platform="web"
            >
              <View
                draws="voice-level"
                exports={{ canvas: true }}
                part="voice-level"
              />
            </Pressable>
          )}
          {props.voice && (
            <Announce
              part="voice-status"
              platform="web"
            />
          )}
        </View>
      )}
      <View
        busy={props.loading}
        data-windowed={listbox.windowed}
        describedby="hint"
        label={props.ariaLabel}
        labelledby="label"
        part="items"
        role="listbox"
      >
        {listbox.childrenShown && <Slot />}
        {listbox.windowed && (
          <Repeat
            each={listbox.rows}
            key="key"
            part="rows"
            windowed
          >
            <View
              data-active={entry.active}
              draws="option"
              gives={{
                dataActive: entry.active,
                disabled: entry.disabled,
                label: entry.words,
                selected: entry.selected,
                value: entry.value,
              }}
              part="row"
              platform="native"
            />
          </Repeat>
        )}
        {listbox.errorShown && (
          <View part="error">
            <Slot name="error">
              <Text part="error-words">{listbox.errorWords}</Text>
            </Slot>
          </View>
        )}
        {listbox.loadingShown && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {listbox.emptyShown && (
          <View part="empty">
            {state.noResults ? (
              <Slot name="no-results">
                <Text part="empty-words">{listbox.emptyWords}</Text>
              </Slot>
            ) : (
              <Slot name="empty">
                <Text part="empty-words">{listbox.emptyWords}</Text>
              </Slot>
            )}
          </View>
        )}
      </View>
      <Announce
        part="live"
        platform="web"
      />
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
    </>
  ),
})
