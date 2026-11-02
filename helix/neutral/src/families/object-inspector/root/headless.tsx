import {
  Announce,
  bare,
  callback,
  cancelable,
  headless,
  object,
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
 * Object Inspector's headless tier: a structured value shown as a tree of one
 * line rows, with branches that open and close, and a copy of any row.
 *
 * **The value arrives as data, in `value`, and core's arithmetic works out the
 * rows**, the same the web element reads, so a filter, a default depth, and a
 * new value leave the same rows open on both platforms.
 *
 * **The rows stand in the tree, or in a window under `windowed`**, where a
 * phone draws them with `FlatList` in a box of a set height.
 *
 * **Keys read core's arithmetic**: Up and Down move between the rows, Right
 * opens a shut branch and then moves into it, Left shuts an open one and then
 * moves to its parent, the two swapping on a right-to-left page, Home, End,
 * Page Up, and Page Down move further, Enter and Space open and close, `*`
 * opens every branch beside the row, a typed letter goes to the next key it
 * starts, and Control or Command with C copies the row. On a phone they are a
 * hardware keyboard's.
 *
 * **A press on a row makes it the active row and opens or closes a branch.**
 * The copy button beside the tree copies the active row.
 *
 * **What a screen reader hears.** The web says `treegrid`, `row`, `gridcell`,
 * `aria-level`, `aria-posinset`, and `aria-setsize`. iOS and Android have no
 * trait for those, so a phone says the level and the place in the row's value,
 * under the words `treeItemPlace` in `helix-tree`, and the row says whether it
 * is expanded. How many entries a filter matched is announced on a phone, where
 * the web has a live region.
 *
 * **The web's**: `for`, which reads a script element a phone has no document to
 * find, and the old names `empty-label`, `item-label`, `key-label`, and
 * `result-label`, each for one release or major version.
 *
 * **Held to `helix-object-inspector`.** `helix system check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('object-inspector', {
  props: {
    active: string(),
    copyLabel: 'Copy {name}',
    copyValueLabel: 'Copy value',
    defaultDepth: 1,
    /* The old name of `empty-text`, the web's for one release. */
    emptyLabel: web(''),
    emptyText: 'Nothing to show',
    expanded: property(object()),
    filter: '',
    filterable: false,
    filterLabel: 'Filter',
    /* The id of a script element, and a phone has no document to find one in. */
    for: web(''),
    /* The old singular words, the web's until the next major version. */
    itemLabel: web(''),
    itemsLabel: '{count, plural, one {# item} other {# items}}',
    keyLabel: web(''),
    keysLabel: '{count, plural, one {# key} other {# keys}}',
    label: '',
    noCopy: false,
    noMatchesLabel: 'No matches',
    renderValue: callback(
      '(value: unknown, entry: { depth: number; key: string | undefined; path: string; type: string }) => ReactNode',
    ),
    resultLabel: web(''),
    resultsLabel: '{count, plural, one {# result} other {# results}}',
    treeLabel: 'Value',
    value: property(object()),
    windowed: false,
  },
  events: {
    activate: ['value'],
    beforeActivate: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeFilter: cancelable(['value']),
    beforeOpen: cancelable(['open']),
    copy: ['value'],
    filter: ['value'],
    toggle: bare(['newState', 'oldState']),
  },
  states: ['empty', 'filtered', 'matched', 'settled'],
  text: {
    onBeforeChange: 'beforeFilter',
    onInput: 'filter',
    prop: 'filter',
  },
  inspector: {
    active: 'active',
    blank: 'blank',
    copyLabel: 'copyLabel',
    copyName: 'copyName',
    copyText: 'copyText',
    copyValueLabel: 'copyValueLabel',
    defaultDepth: 'defaultDepth',
    emptyText: 'emptyText',
    expanded: 'expanded',
    itemsLabel: 'itemsLabel',
    keysLabel: 'keysLabel',
    label: 'label',

    list: 'rows',
    named: 'named',
    noMatchesLabel: 'noMatchesLabel',
    onActivate: 'activate',
    onBeforeActivate: 'beforeActivate',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onCopy: 'copy',
    onToggle: 'toggle',
    renderValue: 'renderValue',
    resultsLabel: 'resultsLabel',
    said: 'said',
    topped: 'topped',
    treeLabel: 'treeLabel',
    value: 'value',
    windowed: 'windowed',
  },
  render: ({ entry, inspector, props }) => (
    <>
      {props.label && (
        <View part="header">
          <View part="label">
            <Text part="label-words">{props.label}</Text>
          </View>
        </View>
      )}
      {props.filterable && (
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          label={props.filterLabel}
          part="search-field"
          placeholder={props.filterLabel}
          type="search"
        />
      )}
      <View part="frame">
        <View
          data-topped={inspector.topped}
          label={inspector.named}
          part="tree"
        >
          <View
            part="before"
            platform="web"
          />
          {/* The first thing a windowed repeat holds is a copy for each row, and
              what follows stands after the rows, inside what scrolls. */}
          <Repeat
            each={inspector.list}
            key="key"
            part="rows"
            windowed
          >
            <Pressable
              also={{ 'row-active': entry.active, 'row-match': entry.match }}
              data-branch={entry.branch}
              part="row"
              style={{ '--object-inspector-level': entry.depth }}
            >
              <View
                ariaHidden
                hidden={entry.leaf}
                icon={entry.caret}
                part="toggle"
              />
              <View
                data-matched={entry.match}
                hidden={entry.unkeyed}
                part="key"
              >
                <Text part="key-words">{entry.name}</Text>
              </View>
              <View
                hidden={entry.unkeyed}
                part="colon"
                platform="native"
              >
                <Text part="colon-words">{entry.colon}</Text>
              </View>
              <Wrap
                part="value"
                passes={entry.value}
                renders={props.renderValue}
                when={entry.drawn}
              />
              <View
                hidden={entry.notBranch}
                part="summary"
              >
                <Text part="summary-words">{entry.summaryWords}</Text>
              </View>
              <View
                hidden={entry.notBranch}
                part="count"
              >
                <Text part="count-words">{entry.counted}</Text>
              </View>
              <View
                hidden={entry.notString}
                part="string"
              >
                <Text
                  lines={1}
                  part="string-words"
                >
                  {entry.stringWords}
                </Text>
              </View>
              <View
                hidden={entry.notNumber}
                part="number"
              >
                <Text part="number-words">{entry.numberWords}</Text>
              </View>
              <View
                hidden={entry.notBoolean}
                part="boolean"
              >
                <Text part="boolean-words">{entry.booleanWords}</Text>
              </View>
              <View
                hidden={entry.notNull}
                part="null"
              >
                <Text part="null-words">{entry.nullWords}</Text>
              </View>
            </Pressable>
            {inspector.blank && (
              <View part="empty">
                <Slot name="empty">
                  <Text part="empty-words">{inspector.said}</Text>
                </Slot>
              </View>
            )}
          </Repeat>
          <View
            part="after"
            platform="web"
          />
        </View>
        {!props.noCopy && (
          <View
            bubbles="copy"
            draws="copy-button"
            exports={{
              button: true,
              live: true,
              mark: true,
              spinner: true,
              text: true,
              tooltip: true,
              'tooltip-arrow': true,
              'tooltip-arrow-bottom': true,
              'tooltip-arrow-left': true,
              'tooltip-arrow-right': true,
              'tooltip-arrow-top': true,
              'tooltip-surface': true,
              'tooltip-surface-bottom': true,
              'tooltip-surface-left': true,
              'tooltip-surface-right': true,
              'tooltip-surface-top': true,
            }}
            gives={{ label: inspector.copyName, value: inspector.copyText }}
            part="copy"
          />
        )}
      </View>
      <Announce
        part="live"
        platform="web"
      />
    </>
  ),
})
