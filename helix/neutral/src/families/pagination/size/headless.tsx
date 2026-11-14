import { bare, cancelable, headless, number, View, Wrap, web } from '../../../render.js'

/**
 * Pagination Size's headless tier: a Select of how many items a page holds, on
 * one row with its label, for a footer beside a row of pages.
 *
 * **It holds the size in force**, the first it offers where its value is not one
 * of them, and moves through a request a handler may refuse. With nothing to
 * choose from it draws nothing.
 *
 * **Held to `helix-pagination-size`.** `helix system check` compares what it
 * declares with what the manifest says the element has.
 */
export default headless('pagination-size', {
  props: {
    defaultValue: 0,
    disabled: false,
    fallbackLabel: 'Per page',
    label: '',
    locale: '',
    name: web(''),
    sizes: '10,25,50,100',
    value: number(),
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['empty', 'settled'],
  paginationSize: {
    defaultValue: 'defaultValue',
    disabled: 'disabled',
    empty: 'empty',
    fallbackLabel: 'fallbackLabel',
    label: 'label',
    locale: 'locale',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    options: 'options',
    shown: 'shown',
    sizes: 'sizes',
    value: 'value',
  },
  render: ({ paginationSize, props }) => (
    <Wrap
      draws="select"
      exports={{
        feedback: true,
        hint: true,
        indicator: true,
        label: true,
        listbox: true,
        'listbox-empty': true,
        'listbox-error': true,
        'listbox-feedback': true,
        'listbox-filter-icon': true,
        'listbox-filter-mark': true,
        'listbox-hint': true,
        'listbox-items': true,
        'listbox-label': true,
        'listbox-live': true,
        'listbox-loading': true,
        'listbox-search': true,
        'listbox-search-field': true,
        'listbox-voice': true,
        'listbox-voice-level': true,
        'listbox-voice-level-canvas': true,
        'listbox-voice-listening': true,
        'listbox-voice-status': true,
        live: true,
        surface: true,
        trigger: true,
        value: true,
      }}
      gives={{
        disabled: props.disabled,
        items: paginationSize.options,
        label: props.label,
        value: paginationSize.shown,
      }}
      part="control"
    >
      <View
        draws="option"
        exports={{
          description: true,
          item: true,
          'item-active': true,
          'item-selected': true,
          label: true,
          text: true,
        }}
        part="option"
        platform="web"
      />
    </Wrap>
  ),
})
