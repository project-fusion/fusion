/**
 * How a family's elements find each other: the collection one element holds,
 * and the item each of the others joins it as. Read as syntax, as `tree.ts`
 * says.
 */

/**
 * What the items that join an element share. Tabs and their panels join a
 * tab set, which holds the value of the one chosen.
 */
export interface Collection {
  /**
   * The box a set whose items turn draws above them, which turns every
   * enabled item on, or every one off once all of them are, as a checkbox
   * group's select-all: the prop that draws it, the prop that holds its
   * words, `label`, and the part it is drawn as, a box that `draws` the
   * item's element. `prop` is the one that draws it.
   */
  readonly selectAll?: { readonly label: string; readonly part: string; readonly prop: string }
  /**
   * The event sent once the chosen item has changed, or several in the order
   * they are sent, as a radio group sends `input` and then `change`.
   */
  readonly onChange?: string | readonly string[]
  /**
   * The event sent before it changes, which a handler can cancel.
   */
  readonly onBeforeChange?: string
  /**
   * The prop that holds the chosen item's value. A set whose items open may
   * have none, as an accordion holds no value.
   */
  readonly prop?: string
  /**
   * The prop that lets a press on the chosen item take it back, so the set
   * holds no choice, as a toggle group's `allow-empty-selection` does.
   */
  readonly allowEmptySelection?: string
  /**
   * The item's event that closes the element's toggle once it stands, in a
   * set that mixes, as a menu and a speed dial close as an item is chosen. A
   * choice of a row that opens a page closes nothing.
   */
  readonly closeOn?: string
  /**
   * The element's prop that must hold for `closeOn` to close it, as a menu's
   * `close-on-select`. An item's own `closeWhen` prop wins where it holds a
   * value.
   */
  readonly closeWhen?: string
  /**
   * The prop that disables every item while it holds, as a disabled radio
   * group does, and gives each its own state back once it does not.
   */
  readonly disabled?: string
  /**
   * The state the element is in while an element drawn among its items
   * stands open, as a navigation is `open` while a megamenu among its
   * destinations is: on the web, while the `toggle` last sent inside it of
   * each element said `open`, and on a phone, while an element drawn inside
   * it is in its own `open` state.
   */
  readonly itemOpen?: string
  /**
   * The prop that seeds it where nothing sets it.
   */
  readonly defaultProp?: string
  /**
   * The prop that refuses a press that would leave nothing chosen, as a
   * button group's `disallow-empty-selection` does.
   */
  readonly disallowEmptySelection?: string
  /**
   * The prop that names the set, which a phone announces on the element
   * itself where no part carries the set's role, as a button group's
   * `label`: a radio group where its items are radios, a toolbar where they
   * are toggle buttons and no toolbar is around it, and a group otherwise.
   */
  readonly label?: string
  /**
   * The prop that stops an item from being chosen when focus arrives on it,
   * so the keys move focus and Enter or Space chooses.
   */
  readonly manualActivation?: string
  /**
   * Whether the items say themselves which of them is current, each by the
   * prop its `memberOf`'s `current` names, as a navigation's destinations do. The
   * set holds no chosen value and a press chooses nothing: the page moves the
   * mark by writing the flag, and a mark the tree draws stands at the item
   * flagged, the one flagged `page` where several are.
   */
  readonly currentFromItems?: true
  /**
   * The prop that says how many items a reader can choose: `none`, `single`,
   * or `multiple`. Absent, one item is always chosen, as a tab is.
   */
  readonly selectionMode?: string
  /**
   * Whether the set mixes commands, choices that turn on and off, and runs
   * of choices of which one is on, as a menu's rows do. It holds no chosen
   * value: each item that is a choice holds whether it is checked, as its
   * `item()` names it, and a press on an item of a run turns the rest of its
   * run off. Its keys move focus among the items, and Space and Enter press
   * the item focus is on. Its `after` events are sent as a press turns a
   * choice, as a menu sends `change`.
   */
  readonly mixes?: true
  /**
   * The prop that says how many of the set's opening items stand open, as
   * an accordion's `mode`: any number where it holds nothing or `multiple`,
   * one under `single`, and one or none under `single-collapsible`. The set
   * says `itemsToggle: true` too.
   */
  readonly openMode?: string
  /**
   * Whether the set may hold no choice, as a radio group does until a reader
   * answers, where a tab set always has one. It opens on the item whose
   * `selected` its markup writes, and on nothing where none does.
   */
  readonly optional?: true
  /**
   * The order the chosen prop holds the values in. `pressed` puts the value
   * of an item a press adds after the others, and leaves the rest as they
   * were where a press takes one out, as a tag group writes its value: a
   * press on Late and then on Open is `late,open`. A Shift range and Control
   * or Command with A write the values in the order the items stand. Absent,
   * every change writes them in that order, as a list's does.
   */
  readonly order?: 'pressed'
  /**
   * The prop that says how the items are pressed, as a toggle group's and a
   * button group's `selection-mode`. Where it says `multiple`, each item is a
   * toggle button that presses on its own: the chosen prop holds the pressed
   * values, separated by commas, the keys move focus without pressing, and
   * no item is marked. Under any other value each item is a radio, and the
   * set is a radio group. Where `roves` names a prop that holds nothing, each
   * item is a control of its own and is neither.
   */
  readonly pressMode?: string
  /**
   * Whether the items turn on their own, as a checkbox group's boxes do. The
   * chosen prop holds the values of those that are on, separated by commas,
   * in the order they stand. An item's turn asks its own `before` event and
   * then the set's, and either refusal keeps the item as it was. Each item is
   * a stop of its own, so the set says nothing of keys.
   */
  readonly itemsToggle?: true
  /**
   * The prop that keeps a reader from changing the choice, while the keys
   * still move focus among the items, as a read-only radio group does.
   */
  readonly readonly?: string
  /**
   * The prop that must hold a value for the set to be one stop whose arrow
   * keys move among its items. Until it does, each item is a control of its
   * own, as a button group's buttons are without a `selection-mode`. A set
   * whose items take Space and Enter as their own press, as `keys.selects:
   * false` says, moves nothing inside a toolbar either: its items are the
   * toolbar's controls, and the toolbar's arrow keys walk them.
   */
  readonly roves?: string
  /**
   * The prop that says what a press does to the items already chosen:
   * `toggle` adds or takes out the item, and `replace` chooses it alone.
   */
  readonly selectionBehavior?: string
  /**
   * The state set while no item has joined.
   */
  readonly empty?: string
  /**
   * How the keys move among the items: whether arriving on an item selects
   * it, `selectionFollowsFocus`, where `manualActivation` does not say otherwise and the item is no link,
   * whether a move past the last item comes round to the first, `loop`, the
   * moving keys the items keep for themselves, `itemKeys`, whether a typed
   * letter moves focus, which it does unless `typeahead` is `false`, as on a radio group, and
   * whether Space and Enter go to the set's selection, which they do unless
   * `selects` is `false`. A button group's buttons take Space and Enter as
   * their own press, which chooses them as a tap does. `enter: 'selects'`
   * has Enter on an item that is no link select it as Space does, as a tag
   * group's does, where a list's Enter acts on the row. `adds: 'replace'`
   * has Control or Command with Space add or take out an item only under
   * the `replace` selection behavior in a set that chooses many, as a tag
   * group's does, where a list's adds or takes out the row wherever Space
   * presses it. `escape: 'plain'` has Escape let go of the selection only
   * with neither Control nor Command held, as a tag group's does, where a
   * list's lets go with either held too. Where `orientation` names
   * the prop that says which way the items run, only the arrows along it
   * move focus: Up and Down under `vertical`, and Left and Right otherwise.
   * The arrows across it are left to the page, as a sequence of steps leaves
   * them. A set whose items turn on their own says nothing of keys.
   */
  readonly keys?: {
    readonly adds?: 'replace'
    readonly orientation?: string
    readonly selectionFollowsFocus: boolean
    readonly enter?: 'selects'
    readonly escape?: 'plain'
    readonly typeahead?: false
    readonly selects?: false
    readonly itemKeys?: readonly (
      | 'ArrowDown'
      | 'ArrowLeft'
      | 'ArrowRight'
      | 'ArrowUp'
      | 'End'
      | 'Home'
    )[]
    readonly loop: boolean
  }
  /**
   * How a reader removes an item, as a tag group's tags are removed: the
   * event the item's press sends to ask for it, which Delete and Backspace
   * on the item send as well where that press is drawn, and the part that
   * takes focus once no item is left. The set removes nothing itself: the
   * page takes the item out. **Once it does, focus that was on the item
   * moves to the next item, or to the one before after the last**, passing
   * over a disabled one, to the first where only disabled ones are left, and
   * to the `focusWhenEmpty` part where none is.
   */
  readonly removeOn?: string
  /** The part that takes focus once no item is left, in a set whose items a reader removes. */
  readonly focusWhenEmpty?: string
  /**
   * How the items are numbered: the props that say where the count starts
   * and whether it runs down, and the values the items read the first number
   * and the step as.
   */
  readonly numbering?: {
    readonly first: string
    readonly reversed?: string
    readonly start?: string
    readonly step: string
  }
  /**
   * How a reader moves an item to a new place, where the set allows it: the
   * prop that turns it on, the events a move sends, the words a screen reader
   * hears at each step, and the part a lifted item looks like.
   */
  readonly reorder?: {
    readonly onReorder: string
    readonly onBeforeReorder: string
    readonly canceled?: string
    readonly dropped?: string
    readonly enabled: string
    readonly move: string
    readonly moved?: string
    readonly picked?: string
    readonly preview?: string
  }
}

/** The collection an element joins, by the family that holds it. */
export interface Item {
  /**
   * The cancelable event an item of a set that `mixes` sends before a press
   * turns it, its detail the `checked` the press asks for, as a menu item's
   * `before-check`. A refusal keeps the item and its run as they were.
   */
  readonly onBeforeChange?: string
  /**
   * The prop that makes the item a choice that turns on and off where it is
   * not checked yet, in a set that `mixes`, as a menu item's `checkable`.
   */
  readonly checkable?: string
  /**
   * The prop that holds whether the item is checked, in a set that `mixes`.
   * It seeds the item, which a press then turns, and an item it names is a
   * choice. An item that names `checkable` or `exclusive` names it too.
   */
  readonly checked?: string
  /**
   * The item's own prop that says whether its event closes the element its
   * set's `closeOn` closes, where it holds a value, as a menu row's
   * `close-on-select` keeps the menu open after it is chosen.
   */
  readonly closeWhen?: string
  /**
   * The prop that makes the item one of a run, in a set that `mixes`: the
   * items next to it that say it too, up to the first that does not. A press
   * turns the item on and the rest of its run off, and a press on the item
   * that is on leaves it on.
   */
  readonly exclusive?: string
  /**
   * The prop that says the item is the one its set chooses, where it is not
   * `selected`: a step is `current` while its sequence is on it. Its markup
   * writes it to open the set there, and the set holds it as a state of the
   * same name. A flag that holds a word flags the item while it holds any
   * but `false`, as a destination is `current` as `page` or `location`.
   */
  readonly current?: string
  /**
   * The prop its set fills with the name of the item's grip while items can
   * move, which is also the name of the press that moves it.
   */
  readonly grip?: string
  /**
   * The regions whose words name the item, in order, where its default
   * region alone does not: the words typeahead matches, and what the item
   * stands for in its set's value where it has no `value`, as a tag's
   * category and label are, `['start', 'default']`.
   */
  readonly labelledby?: readonly string[]
  /**
   * The family whose collection it joins.
   */
  readonly of: string
  /**
   * The region that holds the item's own page, where the element it joins
   * shows a `stack` of pages: the rows passed into it are that page's rows,
   * and a press on the item shows them, as a drilldown row's `page`.
   */
  readonly pageSlot?: string
  /**
   * The item's own state that holds while its set chooses it, where the set
   * is in a selection mode, as a Button in a Button Group is `pressed`.
   */
  readonly selectedState?: string
  /**
   * The prop that holds what the item stands for in its set, where it has no
   * `value`, as a navigation's destination stands for its `href`: the value
   * its events carry, and the one a phone knows it by.
   */
  readonly value?: string
}
