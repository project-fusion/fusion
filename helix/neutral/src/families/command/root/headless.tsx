import {
  Announce,
  bare,
  boolean,
  callback,
  cancelable,
  headless,
  object,
  oneOf,
  property,
  Slot,
  string,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Command's headless tier: a palette of commands that filters as a reader types.
 *
 * **The palette is a dialog holding a filterable Listbox.** The list filters, says
 * how many commands are left, and moves the highlight, and the palette hears each
 * choice: it asks `before-select`, says `select`, and closes. **A command keeps no
 * value**, so the same command runs again. **The filter is cleared as it closes**,
 * and each opening starts with no command highlighted. **`inline` draws the list in
 * the page** with no dialog, and a choice leaves it where it stands.
 *
 * **The web's**: the hotkey, which a phone reaches only with a hardware keyboard,
 * `controls`, which lists the controls on the page, an option's `alternate`
 * destination, which a modifier takes, `home-end`, dictation, the pages an option
 * `opens` with its `page:` regions, and the deprecated `load-error` and
 * `result-label`.
 *
 * **Held to `helix-command`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('command', {
  props: {
    controls: web(false),
    controlsLabel: web('On this screen'),
    defaultOpen: false,
    emptyText: 'No commands',
    errorText: '',
    fallbackLabel: 'Commands',
    filterDelay: 0,
    filterMatch: callback('(text: string, filter: string) => boolean'),
    homeEnd: web(oneOf(['list'])),
    hotkey: web('mod+k'),
    hotkeyLabel: web('Open {label}'),
    inline: false,
    items: property(object()),
    label: '',
    layout: oneOf(['grid', 'stack']),
    loadError: web(string()),
    loading: false,
    loadingText: 'Loading',
    noResultsText: string(),
    open: boolean(),
    page: web(''),
    placeholder: 'Search commands',
    resultLabel: web(string()),
    resultsLabel: '{count, plural, one {# command} other {# commands}}',
    voice: web(false),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeFilter: cancelable(['value']),
    beforeOpen: cancelable(['open']),
    beforeSelect: cancelable(['value']),
    filter: ['value'],
    loadMore: [],
    select: ['value'],
    toggle: bare(['newState', 'oldState']),
  },
  states: ['empty', 'error', 'loading', 'noResults', 'open', 'settled'],
  commandRoot: {
    fallbackLabel: 'fallbackLabel',
    footed: 'footed',
    inline: 'inline',
    label: 'label',
    listName: 'listName',
    modal: 'modal',
    onBeforeSelect: 'beforeSelect',
    onSelect: 'select',
    status: 'status',
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ commandRoot, props }) => (
    <Wrap
      draws="dialog"
      exports={{
        body: true,
        dismiss: true,
        'dismiss-mark': true,
        footer: true,
        header: true,
        surface: true,
      }}
      gives={{ fallbackLabel: props.fallbackLabel, label: props.label }}
      part="dialog"
      when={commandRoot.modal}
    >
      {/* Above the list, which in the dialog is the dialog's own header. */}
      <View
        into="header"
        part="header"
        platform="native"
      >
        <Slot name="header" />
      </View>
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
          ariaLabel: commandRoot.listName,
          emptyText: props.emptyText,
          errorText: props.errorText,
          filterable: true,
          filterDelay: props.filterDelay,
          filterLabel: props.placeholder,
          filterMatch: props.filterMatch,
          items: props.items,
          layout: props.layout,
          loading: props.loading,
          loadingText: props.loadingText,
          noResultsText: props.noResultsText,
          resultsLabel: props.resultsLabel,
        }}
        part="listbox"
      >
        <Slot />
        {/* The controls on the page, under `controls`, as a group of options. */}
        <Wrap
          draws="option-group"
          exports={{ items: true, label: true }}
          part="controls"
          platform="web"
        >
          <Wrap
            draws="option"
            exports={{
              description: true,
              item: true,
              'item-active': true,
              'item-selected': true,
              label: true,
              text: true,
            }}
            part="control"
          />
        </Wrap>
        <Slot name="empty" />
        <Slot name="error" />
        <Slot name="filter-icon" />
        <Slot name="loading" />
        <Slot name="no-results" />
      </Wrap>
      <Announce
        follows="status"
        part="live"
      >
        {commandRoot.status}
      </Announce>
      {/* Under the list, which in the dialog is the dialog's own footer. */}
      <Wrap
        into="footer"
        part="footer"
        when={commandRoot.footed}
      >
        <Slot name="footer" />
      </Wrap>
    </Wrap>
  ),
})
