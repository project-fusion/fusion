import {
  Announce,
  bare,
  boolean,
  callback,
  cancelable,
  headless,
  Layer,
  Pressable,
  property,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Filter Input's headless tier: a text field for filters, with the active filters
 * standing in it as tokens.
 *
 * **Tokens are the page's own elements**, passed into `tags`, and a remove press on
 * one is a request the field hears too, as the web's event bubbles to it. Backspace
 * in an empty field asks the last token shown to go. **`max-tags` draws the first
 * that many** and counts the rest, a press on the count under `expandable` showing
 * them all.
 *
 * **Typed filters.** Return reads the text against the `FilterField`s the field
 * holds, in a `FilterMenu` or directly inside it, with core's grammar:
 * `status:open` and `-status:open` send `before-facet` and `facet` as ticking those
 * values in the menu does, and the text read is taken out. A chip naming a declared
 * field asks for the field to be filtered by nothing as it is removed, and `chips`
 * draws, updates, and removes those chips itself.
 *
 * **Suggestions.** Options passed into `suggestions` open a list under the field
 * while it has focus, and focus stays in the field, so a phone's keyboard stays up.
 * An option's press sends its own `before-select`, and the page says what choosing
 * means. `filter-suggestions` narrows the list to the term at the caret. `source`
 * asks a function for them instead, and a choice is written over the term.
 *
 * **The web's**: a form's `name` and its entries, dictation, and the arrow keys
 * that step from the text to a token's remove button, since a phone's tokens each
 * take a screen reader's own focus.
 *
 * **Held to `helix-filter-input`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('filter-input', {
  props: {
    ariaLabel: string(),
    chips: false,
    clearable: false,
    clearLabel: 'Clear',
    collapseLabel: 'Show fewer',
    defaultOpen: false,
    defaultValue: '',
    dictationDeniedLabel: web('Dictation needs the microphone'),
    dictationFailedLabel: web('Dictation stopped with an error'),
    dictationUnreachableLabel: web('Dictation could not reach the speech service'),
    disabled: false,
    expandable: false,
    expandLabel: 'Show all',
    feedback: '',
    filterDelay: 0,
    filterSuggestions: false,
    hint: '',
    label: '',
    listeningLabel: web('Listening'),
    loading: false,
    loadingText: 'Loading',
    maxTags: 0,
    /* A form's, which a phone has none of. */
    name: web(''),
    noResultsText: '',
    open: boolean(),
    placeholder: '',
    required: false,
    restText: '+{count}',
    source: property(
      callback(
        '(request: { field: string; signal: AbortSignal; term: string; text: string }) => unknown',
      ),
    ),
    stoppedListeningLabel: web('Stopped listening'),
    suggestionLabel: string(),
    suggestionsLabel: '{count, plural, one {# suggestion} other {# suggestions}}',
    value: string(),
    valueMissingMessage: string(),
    voice: web(boolean()),
    voiceLabel: web('Dictate'),
    voiceStopLabel: web('Stop dictation'),
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeFacet: cancelable(['arity', 'field', 'label', 'operator', 'operatorLabel', 'values']),
    beforeListen: web(cancelable()),
    beforeOpen: cancelable(['open']),
    beforeSelect: cancelable(['href', 'value']),
    change: bare(),
    /* A token's, which reaches the field as it bubbles on the web. */
    dismiss: cancelable(['label']),
    facet: ['arity', 'field', 'label', 'operator', 'operatorLabel', 'values'],
    input: bare(),
    listen: web([]),
    toggle: bare(['newState', 'oldState']),
  },
  states: [
    'alignedStart',
    'invalid',
    'listening',
    'loading',
    'noResults',
    'open',
    'placedBottom',
    'placedTop',
    'settled',
  ],
  filterInput: {
    busy: 'busy',
    chips: 'chips',
    clearable: 'clearable',
    clearLabel: 'clearLabel',
    clearShown: 'clearShown',
    collapseLabel: 'collapseLabel',
    defaultValue: 'defaultValue',
    disabled: 'disabled',
    expandable: 'expandable',
    expandLabel: 'expandLabel',
    filterDelay: 'filterDelay',
    filterSuggestions: 'filterSuggestions',
    listName: 'listName',
    loading: 'loading',
    loadingText: 'loadingText',
    maxTags: 'maxTags',
    noResultsText: 'noResultsText',
    onBeforeChange: 'beforeChange',
    onBeforeFacet: 'beforeFacet',
    onChange: 'change',
    onDismiss: 'dismiss',
    onFacet: 'facet',
    onInput: 'input',
    placeholder: 'placeholder',
    restLabel: 'restLabel',
    restPress: 'restPress',
    restShown: 'restShown',
    restText: 'restText',
    restWords: 'restWords',
    source: 'source',
    status: 'status',
    suggestionLabel: 'suggestionLabel',
    suggestionsLabel: 'suggestionsLabel',
    unmatched: 'unmatched',
    value: 'value',
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
  render: ({ filterInput, props, slots, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      {/* The fields declared outside a menu, which the grammar reads and nothing draws. */}
      <View
        ariaHidden
        part="held"
        platform="native"
      >
        <Slot platform="native" />
      </View>
      <View part="field">
        <View
          hidden={!slots.start}
          part="lead"
        >
          <Slot name="start" />
        </View>
        <View part="tags">
          <Slot name="tags" />
          {filterInput.restShown && <Text part="rest">{filterInput.restWords}</Text>}
          {filterInput.restPress && (
            <Pressable
              label={filterInput.restLabel}
              part="rest"
              role="button"
            >
              <Text part="rest-words">{filterInput.restWords}</Text>
            </Pressable>
          )}
        </View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          describedby="hint"
          disabled={props.disabled}
          label={props.ariaLabel}
          labelledby="label"
          part="control"
          placeholder={props.placeholder}
          required={props.required}
        />
        <Slot name="end" />
        {filterInput.clearShown && (
          <Pressable
            label={props.clearLabel}
            part="clear"
            role="button"
          >
            <Slot name="clear-icon">
              <View
                ariaHidden
                icon="x"
                part="clear-mark"
                platform="native"
              />
            </Slot>
          </Pressable>
        )}
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
      <Layer
        anchor="field"
        anchorPress="none"
        closedby="any"
        initialFocus="press"
        label={filterInput.listName}
        offset={4}
        open={props.open}
        part="surface"
        placement="bottom-start"
        restoreFocus="held"
      >
        <Wrap
          draws="listbox"
          exports={{ items: true }}
          gives={{
            ariaLabel: filterInput.listName,
            loading: filterInput.busy,
            loadingText: props.loadingText,
            manual: true,
            noResultsText: props.noResultsText,
          }}
          part="listbox"
          platform="native"
        >
          <Slot name="suggestions" />
        </Wrap>
        <Slot
          name="suggestions"
          platform="web"
        />
        <View
          ariaHidden
          hidden={!filterInput.busy}
          part="loading"
          platform="web"
        >
          <Slot name="loading">
            <Text part="loading-text">{props.loadingText}</Text>
          </Slot>
        </View>
        <View
          ariaHidden
          hidden={!filterInput.unmatched}
          part="empty"
          platform="web"
        >
          <Slot name="no-results">
            <Text part="empty-text">{props.noResultsText}</Text>
          </Slot>
        </View>
      </Layer>
      <Announce
        follows="status"
        part="live"
      >
        {filterInput.status}
      </Announce>
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
