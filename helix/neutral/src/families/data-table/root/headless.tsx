import {
  Announce,
  headless,
  Pressable,
  Repeat,
  Slot,
  Svg,
  Text,
  View,
  Wrap,
} from '../../../render.js'
import { events, props } from './api.js'

/**
 * A table drawn from an array, in its headless tier: columns written as
 * `TableColumn` children, rows passed as data, and what a reader searches, sorts,
 * pages through, selects, opens, moves, and hides. Core's arithmetic decides what
 * shows, on either platform.
 *
 * **On a phone each row is a `TableRow` of `TableCell`s**, which Table's machine
 * lines up and draws. The web draws its rows in its own root.
 *
 * **The web's**: the rows a page serves, `estimate`, `cellStyles`, the drag's
 * preview, a column moved by its grip, `row-parts`, the view a page saves and
 * restores, the export, the `selection` region, and the cells a reader edits
 * in place, with their rules, saves, and `batch-edits`.
 *
 * **Held to `helix-data-table`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says.
 */
export default headless('data-table', {
  props,
  events,
  states: ['empty', 'error', 'loading', 'settled'],
  dataTableRoot: {
    data: 'rows',
    empty: 'empty',
    every: 'every',
    heads: 'heads',
    more: 'more',
    nests: 'nests',
    pagination: 'pagination',
    rows: 'rows',
    waiting: 'waiting',
  },
  render: ({ dataTableRoot, entry, props }) => (
    <>
      <View part="toolbar">
        <Slot name="toolbar" />
        <Slot
          name="selection"
          platform="web"
        />
      </View>
      <View
        busy={props.loading}
        label={props.label}
        part="table"
        role="table"
      >
        <View
          part="head"
          role="row"
        >
          {props.reorderableRows && (
            <View
              label={props.rowGripsLabel}
              part="grip-head"
              role="columnheader"
            />
          )}
          {props.selectable && (
            <View
              part="select-all"
              role="columnheader"
            >
              <Wrap
                draws="checkbox"
                exports={{
                  box: true,
                  control: true,
                  feedback: true,
                  field: true,
                  hint: true,
                  label: true,
                  mark: true,
                  'mark-checked': true,
                  'mark-dash': true,
                  'mark-indeterminate': true,
                }}
                part="checkbox"
              />
            </View>
          )}
          <Slot platform="web" />
          <Repeat
            each={dataTableRoot.heads}
            key="key"
            part="heads"
          >
            <View
              data-pinned={entry.pinned}
              part="head-box"
              platform="native"
            >
              <Wrap
                part="head-content"
                passes={entry.key}
                platform="native"
                renders={entry.draw}
              />
            </View>
          </Repeat>
        </View>
        <View
          part="before"
          platform="web"
        />
        <View
          also={{
            'row-dragging': props.reorderableRows,
            'row-drop-after': props.reorderableRows,
            'row-drop-before': props.reorderableRows,
            'row-last': props.reorderableRows,
          }}
          part="row"
          platform="web"
        >
          <View
            part="row-grip"
            role="cell"
          >
            <Pressable part="row-grip-button">
              <View
                ariaHidden
                icon="dots-six-vertical"
                part="row-grip-mark"
              />
            </Pressable>
          </View>
          <View
            also={{ 'select-selected': props.selectable }}
            part="select"
            role="cell"
          />
          <View
            also={{
              'cell-boolean': props.batchEdits,
              'cell-editable': props.batchEdits,
              'cell-editing': props.batchEdits,
              'cell-field': props.batchEdits,
              'cell-header': props.rowLink,
              'cell-invalid': props.batchEdits,
              'cell-pinned-end': props.batchEdits,
              'cell-pinned-start': props.batchEdits,
              'cell-saving': props.batchEdits,
              'cell-selected': props.selectable,
              'cell-unsaved': props.batchEdits,
            }}
            part="cell"
            role="cell"
          >
            <Pressable
              also={{ 'toggle-open': props.selectable }}
              part="toggle"
            >
              <Svg
                ariaHidden
                part="toggle-mark"
                viewBox="0 0 256 256"
              />
            </Pressable>
            {/* An open cell's field, a Select for a column of choices. */}
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
              part="editor"
            />
            <View
              part="cell-saving-mark"
              role="status"
            />
            <View
              part="cell-message"
              role="alert"
            />
          </View>
        </View>
        <Slot platform="web" />
        <View
          part="after"
          platform="web"
        />
        {/* The first thing a windowed repeat holds is a copy for each row, and
            what follows stands after the rows, inside what scrolls. */}
        <Repeat
          each={dataTableRoot.rows}
          key="key"
          part="rows"
          windowed
        >
          <Wrap
            part="row-content"
            passes={entry.key}
            platform="native"
            renders={entry.draw}
          />
          {dataTableRoot.more && (
            <View
              part="more"
              role="row"
            >
              <View part="more-cell">
                <Pressable part="more-button">
                  <Text part="more-words">{props.loadMoreLabel}</Text>
                </Pressable>
              </View>
            </View>
          )}
          {props.errorText && (
            <View
              part="error"
              role="row"
            >
              <Slot name="error">
                <Text part="error-words">{props.errorText}</Text>
              </Slot>
            </View>
          )}
          {dataTableRoot.waiting && (
            <View part="loading">
              <Slot name="loading">
                <Text part="loading-words">{props.loadingText}</Text>
              </Slot>
            </View>
          )}
          {dataTableRoot.empty && (
            <View part="empty">
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          )}
        </Repeat>
      </View>
      <Announce
        part="live"
        platform="web"
      />
      {/* The bar that saves or discards every unsaved change. */}
      <View
        part="edits"
        platform="web"
      >
        <View part="edits-count" />
        <Pressable
          part="edits-save"
          role="button"
        />
        <Pressable
          part="edits-discard"
          role="button"
        />
      </View>
      <View part="footer">
        <Slot name="footer" />
        {dataTableRoot.pagination && (
          <Wrap
            draws="pagination"
            exports={{
              first: true,
              gap: true,
              indicator: true,
              item: true,
              last: true,
              list: true,
              live: true,
              mark: true,
              next: true,
              page: true,
              'page-current': true,
              previous: true,
              status: true,
            }}
            part="pagination"
          />
        )}
      </View>
      {/* A column draws its menu in its own root, and the table names its parts. */}
      <View
        also={{
          'menu-back': props.selectable,
          'menu-back-mark': props.selectable,
          'menu-empty': props.selectable,
          'menu-header': props.selectable,
          'menu-live': props.selectable,
          'menu-loading': props.selectable,
          'menu-search-field': props.selectable,
          'menu-title': props.selectable,
        }}
        part="menu-surface"
        platform="web"
      >
        <Wrap
          draws="menu-item"
          exports={{
            end: true,
            item: true,
            mark: true,
            shortcut: true,
            'shortcut-kbd': true,
            'shortcut-key': true,
            'shortcut-separator': true,
            start: true,
            surface: true,
          }}
          part="menu-entry"
          platform="web"
        />
        <Wrap
          draws="divider"
          exports={{ content: true, line: true }}
          part="menu-divider"
          platform="web"
        />
      </View>
      {/* A phone's column draws its menu from these, which the element brings in. */}
      <View
        draws="menu"
        hidden
        part="column-menu"
        platform="native"
      />
      <View
        draws="divider"
        hidden
        part="column-menu-line"
        platform="native"
      />
      <View
        draws="icon-button"
        hidden
        part="column-menu-button"
        platform="native"
      />
      <View
        draws="icon"
        hidden
        part="column-menu-mark"
        platform="native"
      />
      <View
        ariaHidden
        part="drag-preview"
        platform="web"
      />
    </>
  ),
})
