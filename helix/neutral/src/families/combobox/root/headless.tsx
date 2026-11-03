import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
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
 * Combobox's headless tier: a text field that filters a list of options as a reader
 * types.
 *
 * **The typed text and the value are separate.** The text narrows the list and is
 * then discarded, and the value is the option chosen, whose words the field then
 * shows. **Focus stays in the field**, so a phone's keyboard stays up, and the keys
 * that move in the list go to the list.
 *
 * **`suggest` finishes the word**, selected past the caret, so the next letter
 * replaces it. **`creatable` offers a row** that sends `create` and takes what was
 * typed, and **`allows-custom-value` takes the text** as the answer with no row.
 * **`multiple` draws each choice as a tag**, and the panel stays open between picks.
 *
 * **On a phone, the highlight has no `aria-activedescendant`.** The field says the
 * highlight and the count on iOS, as the web says them on Apple devices, and every
 * option takes a screen reader's own focus.
 *
 * **The web's**: a form's `name` and `form-value`, `autocomplete`'s hidden select, the
 * deprecated `load-error` and `result-label`, and the arrows that step between a tag's
 * remove controls, since a phone's tags each take a screen reader's own focus.
 *
 * **Held to `helix-combobox`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('combobox', {
  props: {
    allowsCustomValue: false,
    ariaLabel: string(),
    autocomplete: web('off'),
    collapseLabel: 'Show fewer',
    creatable: false,
    createLabel: 'Add "{value}"',
    defaultOpen: false,
    defaultValue: '',
    disabled: false,
    emptyText: 'No matches',
    errorText: '',
    expandable: false,
    expandLabel: 'Show all',
    feedback: '',
    filterDelay: 0,
    formValue: web(oneOf(['key', 'text'])),
    hint: '',
    label: '',
    listLabel: 'Options',
    loadError: web(string()),
    loading: false,
    loadingText: 'Loading',
    locale: '',
    maxTags: 0,
    multiple: false,
    /* A form's, which a phone has none of. */
    name: web(''),
    noResultsText: string(),
    open: boolean(),
    openOn: oneOf(['focus', 'input', 'manual'], 'input'),
    placeholder: '',
    readonly: false,
    removeLabel: 'Remove {name}',
    required: false,
    restText: '+{count}',
    resultLabel: web(string()),
    resultsLabel: '{count, plural, one {# result} other {# results}}',
    selectedLabel: '{name}, selected',
    suggest: false,
    value: string(),
    valueMissingMessage: 'Choose one to continue.',
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeFilter: cancelable(['value']),
    beforeOpen: cancelable(['open']),
    change: bare(),
    create: cancelable(['value']),
    filter: ['value'],
    input: bare(),
    loadMore: [],
    toggle: bare(['newState', 'oldState']),
  },
  states: [
    'alignedStart',
    'blank',
    'error',
    'invalid',
    'loading',
    'noResults',
    'open',
    'placedBottom',
    'placedTop',
    'settled',
  ],
  combobox: {
    allowsCustomValue: 'allowsCustomValue',
    collapseLabel: 'collapseLabel',
    creatable: 'creatable',
    createActive: 'createActive',
    createLabel: 'createLabel',
    createShown: 'createShown',
    createWords: 'createWords',
    defaultValue: 'defaultValue',
    disabled: 'disabled',
    expandable: 'expandable',
    expandLabel: 'expandLabel',
    fieldPlaceholder: 'fieldPlaceholder',
    filterDelay: 'filterDelay',
    listLabel: 'listLabel',
    listName: 'listName',
    maxTags: 'maxTags',
    multiple: 'multiple',
    onBeforeChange: 'beforeChange',
    onBeforeFilter: 'beforeFilter',
    onChange: 'change',
    onCreate: 'create',
    onFilter: 'filter',
    onInput: 'input',
    openOn: 'openOn',
    placeholder: 'placeholder',
    readonly: 'readonly',
    removeLabel: 'removeLabel',
    restLabel: 'restLabel',
    restPress: 'restPress',
    restShown: 'restShown',
    restText: 'restText',
    restWords: 'restWords',
    resultsLabel: 'resultsLabel',
    selectedLabel: 'selectedLabel',
    status: 'status',
    suggest: 'suggest',
    tags: 'tags',
    tagsShown: 'tagsShown',
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
  render: ({ combobox, entry, props, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      {/* The options, joined for the field's words while the list is closed. */}
      <View
        ariaHidden
        part="held"
        platform="native"
      >
        <Slot />
        {/* What a list says, richer than its words, which the web hands on. */}
        <Slot name="empty" />
        <Slot name="error" />
        <Slot name="loading" />
        <Slot name="no-results" />
      </View>
      <View
        data-grown={combobox.tagsShown}
        part="field"
      >
        <Slot name="start" />
        {combobox.tagsShown && (
          <View part="tags">
            <Repeat
              each={combobox.tags}
              key="key"
              part="tag-list"
            >
              <Wrap
                draws="tag"
                exports={{
                  cell: true,
                  dismiss: true,
                  'dismiss-mark': true,
                  label: true,
                  link: true,
                  start: true,
                }}
                gives={{ dismissLabel: entry.dismissLabel, dismissible: entry.dismissible }}
                part="tag"
              >
                <Text part="tag-words">{entry.words}</Text>
              </Wrap>
            </Repeat>
            {combobox.restShown && <Text part="rest">{combobox.restWords}</Text>}
            {combobox.restPress && (
              <Pressable
                label={combobox.restLabel}
                part="rest"
                role="button"
              >
                <Text part="rest-words">{combobox.restWords}</Text>
              </Pressable>
            )}
          </View>
        )}
        <TextInput
          autoCorrect={false}
          describedby="hint"
          disabled={props.disabled}
          label={props.ariaLabel}
          labelledby="label"
          part="control"
          placeholder={combobox.fieldPlaceholder}
          readonly={props.readonly}
          required={props.required}
        />
        <Slot name="end" />
        <Slot name="indicator">
          <View
            ariaHidden
            icon="caret-down"
            part="indicator"
          />
        </Slot>
      </View>
      <Layer
        anchor="field"
        anchorPress="none"
        closedby="any"
        initialFocus="press"
        label={combobox.listName}
        offset={4}
        open={props.open}
        part="surface"
        placement="bottom-start"
        restoreFocus="held"
      >
        <Wrap
          bubbles="load-more"
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
            ariaLabel: combobox.listName,
            emptyText: props.emptyText,
            errorText: props.errorText,
            loading: props.loading,
            loadingText: props.loadingText,
            manual: true,
            multiple: props.multiple,
            noResultsText: props.noResultsText,
            resultsLabel: props.resultsLabel,
          }}
          part="listbox"
        >
          <Slot />
        </Wrap>
        {combobox.createShown && (
          <Pressable
            also={{ 'create-active': combobox.createActive }}
            part="create"
            role="button"
          >
            <Text part="create-words">{combobox.createWords}</Text>
          </Pressable>
        )}
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
        {combobox.status}
      </Announce>
    </>
  ),
})
