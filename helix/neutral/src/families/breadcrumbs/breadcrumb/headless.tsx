import {
  cancelable,
  headless,
  number,
  object,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A crumb's headless tier: a separator, then the crumb's link or its words.
 *
 * **The separator comes before the crumb**, and the first crumb draws none.
 * It is decorative, so a screen reader reads the crumbs alone.
 *
 * **A crumb with an `href` is a link** that asks with `before-select`, with
 * the `href` as its value, says `select` once it stands, and opens unless
 * the request was refused: on the web the
 * browser follows it, and on a phone the app's open-link, its router where
 * it set one. **The current page is words, whatever its `href`**, and a
 * phone says it is the current page after its words, since React Native has
 * no state for it. A crumb with neither is its words, or what is passed in,
 * such as a link or a menu of your own.
 *
 * **`end` holds a control after the label**, outside the link, such as a
 * switcher's menu button. The crumb is in its `end` state while it holds
 * something, and draws the two as one split control.
 *
 * **The first crumb of a trail that folds draws the fold after its label**:
 * a separator, and a menu its button opens, named by `fold-label` with the
 * count it folded, whose rows are the crumbs folded away, each a link to
 * its crumb's `href`. Choosing a row sends the crumb's `before-select` and
 * `select`, with the row's `href` as its value, and a refused one keeps its
 * link closed. The
 * trail hands the crumb what it folded.
 *
 * **What the trail writes is the web's**: the last crumb of a trail with
 * none marked `current` is said to be the current page there.
 *
 * **Held to `helix-breadcrumb`.** `helix system check` compares the props,
 * the event, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('breadcrumb', {
  props: {
    current: false,
    /* What a trail that folds hands its first crumb: how many it folded,
       the crumbs it folded, and the words that name the fold. */
    fold: property(number()),
    foldCrumbs: property(object()),
    foldLabel: property(string()),
    href: string(),
    rel: web(''),
    target: web(''),
  },
  events: {
    beforeSelect: cancelable(['value']),
    select: ['value'],
  },
  states: ['current', 'end', 'folded', 'settled'],
  derived: {
    foldEmphasis: derive('breadcrumb-fold-emphasis'),
    foldMark: derive('breadcrumb-fold-mark'),
    foldName: derive('breadcrumb-fold-name'),
  },
  host: { role: 'listitem' },
  render: ({ derived, entry, props, send }) => (
    <>
      <View
        ariaHidden
        part="separator"
      >
        <Slot name="separator">
          <View
            ariaHidden
            icon="caret-right"
            part="separator-mark"
          />
        </Slot>
      </View>
      {/* A press that goes nowhere draws as words, so a crumb with no `href`
          holds a control of your own as a control. */}
      {!props.current ? (
        <Pressable
          href={props.href}
          onPress={send.beforeSelect}
          part="link"
        >
          <Slot name="start" />
          <Slot />
        </Pressable>
      ) : (
        <View
          current="page"
          part="link"
        >
          <Slot name="start" />
          <Slot />
        </View>
      )}
      <Slot name="end" />
      {props.fold && (
        <View
          ariaHidden
          part="fold-separator"
        >
          <View
            ariaHidden
            icon="caret-right"
            part="fold-separator-mark"
          />
        </View>
      )}
      {/* The menu of the crumbs folded away, which its button opens. */}
      {props.fold && (
        <Wrap
          bubbles="before-select select"
          draws="menu"
          exports={{
            back: true,
            'back-mark': true,
            empty: true,
            header: true,
            live: true,
            loading: true,
            'search-field': true,
            surface: true,
            title: true,
          }}
          gives={{ label: derived.foldName }}
          part="fold"
        >
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ emphasis: derived.foldEmphasis, label: derived.foldName }}
            into="trigger"
            part="expand"
          >
            <View
              draws="icon"
              gives={{ name: derived.foldMark }}
              part="expand-mark"
            />
          </Wrap>
          <Repeat
            each={derive('breadcrumb-fold-items')}
            key="at"
            part="fold-crumbs"
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
              gives={{ href: entry.href, value: entry.href }}
              part="fold-item"
            >
              <Text part="fold-words">{entry.label}</Text>
            </Wrap>
          </Repeat>
        </Wrap>
      )}
    </>
  ),
})
