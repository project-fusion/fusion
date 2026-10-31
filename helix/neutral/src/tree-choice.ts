/**
 * How the elements of a tree say so in their headless sources. Read as syntax,
 * as `tree.ts` says.
 */

/**
 * What the element around a tree's items reads and sends. **The web's element
 * walks its own items**, and a phone's items join it through a context, each
 * saying which item it stands in.
 */
export interface TreeChoice {
  /** The prop that holds the chosen value, or under `multiple`, the checked values. */
  readonly active?: string
  /** The prop that holds what a reader hears when a held item is put back. */
  readonly canceledLabel?: string
  /** The prop that says which end of a row the chevron sits at. */
  readonly chevronPlacement?: string
  /** The prop that seeds the chosen value. */
  readonly defaultActive?: string
  /** The prop that holds what a reader hears when a held item is dropped. */
  readonly droppedLabel?: string
  /** Whether the element holds no items, the name a render binds. */
  readonly empty?: string
  /** The prop that names the tree. */
  readonly label?: string
  /** The prop that holds what a reader hears when an item moves into another branch. */
  readonly movedIntoLabel?: string
  /** The prop that holds what a reader hears when an item moves among its siblings. */
  readonly movedLabel?: string
  /** The prop that says what a deeper level means. */
  readonly nesting?: string
  /** The event sent before the chosen value changes, which a handler can cancel. */
  readonly onBeforeChange?: string
  /** The event sent before an item moves, which a handler can cancel. */
  readonly onBeforeReorder?: string
  /** The event sent once the chosen value changed. */
  readonly onChange?: string
  /** The event sent once an item moved. */
  readonly onReorder?: string
  /** The prop that holds what a reader hears when an item is picked up. */
  readonly pickedUpLabel?: string
  /** The prop that lets a reader move items. */
  readonly reorderable?: string
  /** The prop that says whether a reader checks many items, or chooses only the ends. */
  readonly selectionMode?: string
}

/** What an item of a tree reads, sends, and computes. Each computed value is the name a render binds. */
export interface TreeItemChoice {
  /** Whether the item holds items. */
  readonly branch?: string
  /** Whether the item draws a check mark. */
  readonly checkable?: string
  /** Whether the check mark draws its check. */
  readonly checkMark?: string
  /** Whether the chevron stands past the `end` region. */
  readonly chevronEnd?: string
  /** Whether the chevron stands against the item's words. */
  readonly chevronLabel?: string
  /** Whether the chevron stands at the start of the row. */
  readonly chevronStart?: string
  /** Whether the check mark draws its bar, while some of a branch's items are checked. */
  readonly dashMark?: string
  /** The prop that keeps the item from being chosen, opened, or followed. */
  readonly disabled?: string
  /** Whether the row draws a grip. */
  readonly grip?: string
  /** Whether the item is a branch that names the list under it. */
  readonly heading?: string
  /** The prop that makes the row a link. */
  readonly href?: string
  /** The prop that says the item's children load as it opens. */
  readonly lazy?: string
  /** Whether the item holds no items. */
  readonly leaf?: string
  /** How deep the row sits, counting from one. */
  readonly level?: string
  /** Whether the row is a link. */
  readonly linked?: string
  /** Whether the item sits inside another. */
  readonly nested?: string
  /** The event sent as the item is chosen, which a handler can cancel. */
  readonly onBeforeSelect?: string
  /** The event sent as a lazy item opens. */
  readonly onLoad?: string
  /** What a reader hears of the item's level and its place among its siblings. */
  readonly place?: string
  /** The prop that holds a link's relation to this page. */
  readonly rel?: string
  /** Whether a leaf leaves a gutter where a chevron would stand. */
  readonly reserved?: string
  /** Whether a nested row takes the smaller size. */
  readonly subordinate?: string
  /** The prop that says where a link opens. */
  readonly target?: string
  /** The prop that holds the item's value. */
  readonly value?: string
}

/**
 * What an element that shows a value as a tree of rows reads, sends, and
 * computes. **The web's element draws its own rows**, and a phone hosts the
 * `inspector` machine, whose rows core's arithmetic works out for both.
 */
export interface InspectorChoice {
  /** The prop that holds the active row's path. */
  readonly active?: string
  /** Whether the tree has no entries to show, the name a render binds. */
  readonly blank?: string
  /** The prop that holds the copy button's name on a row with a key. */
  readonly copyLabel?: string
  /** What the copy button is named, the name a render binds. */
  readonly copyName?: string
  /** What the copy button copies, the name a render binds. */
  readonly copyText?: string
  /** The prop that holds the copy button's name on a row with no key. */
  readonly copyValueLabel?: string
  /** The prop that says how many levels start open. */
  readonly defaultDepth?: string
  /** The prop that holds what the tree says while it has no value. */
  readonly emptyText?: string
  /** The prop that holds the open branches by path. */
  readonly expanded?: string
  /** The prop that holds how an array counts its entries. */
  readonly itemsLabel?: string
  /** The prop that holds how an object counts its keys. */
  readonly keysLabel?: string
  /** The prop that names the tree and draws the header. */
  readonly label?: string
  /** The rows a repeat's `each` reads as `inspector.list`, the name a render binds. */
  readonly list?: string
  /** What names the tree, the name a render binds. */
  readonly named?: string
  /** The prop that holds what the tree says while a filter matched nothing. */
  readonly noMatchesLabel?: string
  /** The event sent once the active row moved. */
  readonly onActivate?: string
  /** The event sent before the active row moves, which a handler can cancel. */
  readonly onBeforeActivate?: string
  /** The event sent before a branch closes, which a handler can cancel. */
  readonly onBeforeClose?: string
  /** The event sent before a branch opens, which a handler can cancel. */
  readonly onBeforeOpen?: string
  /** The event sent once a key copied the active row. */
  readonly onCopy?: string
  /** The event sent once a branch opened or closed. */
  readonly onToggle?: string
  /** The prop that holds a function drawing a value. */
  readonly renderValue?: string
  /** The prop that holds what a screen reader hears of a filter's matches. */
  readonly resultsLabel?: string
  /** What the tree says while it has no entries, the name a render binds. */
  readonly said?: string
  /** Whether a header or a field stands above the tree, the name a render binds. */
  readonly topped?: string
  /** The prop that names the tree where `label` is empty. */
  readonly treeLabel?: string
  /** The prop that holds the value. */
  readonly value?: string
  /** The prop that says the rows are drawn in a window. */
  readonly windowed?: string
}

/** What a table reads, sends, and computes. Each computed value is the name a render binds. */
export interface TableChoice {
  readonly columns?: string
  readonly defaultExpanded?: string
  readonly defaultSelected?: string
  readonly defaultSort?: string
  readonly empty?: string
  readonly every?: string
  readonly expanded?: string
  readonly grid?: string
  readonly heads?: string
  readonly label?: string
  readonly loadMore?: string
  readonly nests?: string
  readonly onBeforeExpand?: string
  readonly onBeforeReorder?: string
  readonly onBeforeSelect?: string
  readonly onBeforeSort?: string
  readonly onExpand?: string
  readonly onLoadMore?: string
  readonly onReorder?: string
  readonly onSelect?: string
  readonly onSort?: string
  readonly reorderable?: string
  readonly rows?: string
  readonly selectable?: string
  readonly selected?: string
  readonly selectionBehavior?: string
  readonly selectionMode?: string
  readonly sort?: string
  readonly waiting?: string
  readonly windowed?: string
}

/** What a row of a table reads and computes. Each computed value is the name a render binds. */
export interface TableRowChoice {
  readonly branch?: string
  readonly cells?: string
  readonly disabled?: string
  readonly grips?: string
  readonly gripStill?: string
  readonly href?: string
  readonly nests?: string
  readonly parent?: string
  readonly selectable?: string
  readonly selectedCell?: string
  readonly value?: string
}

/** What a column of a table reads, sends, and computes. Each computed value is the name a render binds. */
export interface TableColumnChoice {
  readonly field?: string
  readonly movable?: string
  readonly onBeforeResize?: string
  readonly onResized?: string
  readonly resizable?: string
  readonly resizeLabel?: string
  readonly sortable?: string
  readonly sorts?: string
  readonly still?: string
  readonly textAlign?: string
  readonly width?: string
  readonly widthLabel?: string
}

/** What log-root reads, sends, and computes, each a name the source holds. */
export interface LogRootChoice {
  readonly blank?: string
  readonly busy?: string
  readonly collapse?: string
  readonly digits?: string
  readonly done?: string
  readonly doneLabel?: string
  readonly droppedHidden?: string
  readonly droppedLabel?: string
  readonly droppedWords?: string
  readonly emptyText?: string
  readonly errorLabel?: string
  readonly fallbackLabel?: string
  readonly format?: string
  readonly groupLabel?: string
  readonly groups?: string
  readonly label?: string
  readonly level?: string
  readonly limit?: string
  readonly lineHref?: string
  readonly lineLabel?: string
  readonly lineNumbers?: string
  readonly lines?: string
  readonly list?: string
  readonly loading?: string
  readonly loadingText?: string
  readonly markLines?: string
  readonly matchesLabel?: string
  readonly named?: string
  readonly onBeforeSelect?: string
  readonly onExpand?: string
  readonly onSelect?: string
  readonly parse?: string
  readonly query?: string
  readonly quiet?: string
  readonly said?: string
  readonly scrolls?: string
  readonly selectable?: string
  readonly selectedLines?: string
  readonly source?: string
  readonly timestamps?: string
  readonly wrap?: string
}

/** What log-line reads, sends, and computes, each a name the source holds. */
export interface LogLineChoice {
  readonly unwrapped?: string
  readonly unnumbered?: string
  readonly at?: string
  readonly count?: string
  readonly countHidden?: string
  readonly countWords?: string
  readonly debug?: string
  readonly error?: string
  readonly grouped?: string
  readonly level?: string
  readonly levelHidden?: string
  readonly levelWords?: string
  readonly lineLabel?: string
  readonly linked?: string
  readonly logRow?: string
  readonly marked?: string
  readonly digits?: string
  readonly heard?: string
  readonly numberHidden?: string
  readonly numberName?: string
  readonly numberWords?: string
  readonly plainNumber?: string
  readonly pressNumber?: string
  readonly runs?: string
  readonly selected?: string
  readonly textHidden?: string
  readonly timeHidden?: string
  readonly timeWords?: string
  readonly timesLabel?: string
  readonly warn?: string
  readonly written?: string
}

/** What log-group reads, sends, and computes, each a name the source holds. */
export interface LogGroupChoice {
  readonly frame?: string
  readonly digits?: string
  readonly heard?: string
  readonly duration?: string
  readonly durationHidden?: string
  readonly heading?: string
  readonly logDrawn?: string
  readonly markIcon?: string
  readonly spokenHidden?: string
  readonly spokenWords?: string
  readonly status?: string
  readonly statusHidden?: string
  readonly statusIcon?: string
  readonly statusLabel?: string
}

/** What tail reads, sends, and computes, each a name the source holds. */
export interface TailChoice {
  readonly following?: string
  readonly away?: string
  readonly defaultPinned?: string
  readonly onBeforePin?: string
  readonly onPin?: string
  readonly pinned?: string
  readonly resume?: string
  readonly threshold?: string
}

/** What a conversation binds, by the name the machine reads. */
export interface ChatRootChoice {
  readonly actionsEmpty?: string
  readonly arrivalLabel?: string
  readonly authorStyles?: string
  readonly blank?: string
  readonly busy?: string
  readonly composerEmpty?: string
  readonly failedLabel?: string
  readonly failedTurnLabel?: string
  readonly fallbackLabel?: string
  readonly headerEmpty?: string
  readonly history?: string
  readonly historyShown?: string
  readonly historyText?: string
  readonly label?: string
  readonly list?: string
  readonly meLabel?: string
  readonly messageLabel?: string
  readonly named?: string
  readonly onHistory?: string
  readonly onSend?: string
  readonly loadingShown?: string
  readonly said?: string
  readonly scrolls?: string
  readonly statusEmpty?: string
  readonly windowed?: string
  readonly turnLabel?: string
  readonly turns?: string
  readonly typing?: string
  readonly typingLabel?: string
  readonly typingWords?: string
}

/** What a turn in a conversation binds, by the name the machine reads. */
export interface ChatMessageChoice {
  readonly actionsEmpty?: string
  readonly at?: string
  readonly attachmentsEmpty?: string
  readonly author?: string
  readonly authorLabel?: string
  readonly contentEmpty?: string
  readonly failed?: string
  readonly failedLabel?: string
  readonly inline?: string
  readonly locale?: string
  readonly named?: string
  readonly onSend?: string
  readonly reading?: string
  readonly retryLabel?: string
  readonly sending?: string
  readonly sendingLabel?: string
  readonly sourcesEmpty?: string
  readonly state?: string
  readonly waiting?: string
  readonly workEmpty?: string
}

/** What a field for writing a turn binds, by the name the machine reads. */
export interface ChatComposerChoice {
  readonly attached?: string
  readonly attachmentsEmpty?: string
  readonly busy?: string
  readonly endEmpty?: string
  readonly idling?: string
  readonly mark?: string
  readonly onSend?: string
  readonly onStop?: string
  readonly onTyping?: string
  readonly placeholder?: string
  readonly placeholders?: string
  readonly queue?: string
  readonly sendDisabled?: string
  readonly sendHeld?: string
  readonly sendLabel?: string
  readonly sendName?: string
  readonly sendReason?: string
  readonly shownPlaceholder?: string
  readonly startEmpty?: string
  readonly stopLabel?: string
  readonly submitOn?: string
  readonly typingTimeout?: string
}

/** What a feed of notifications binds, by the name the machine reads. */
export interface NotificationsRootChoice {
  readonly arrivedLabel?: string
  readonly blank?: string
  readonly emptyText?: string
  readonly errorShown?: string
  readonly errorText?: string
  readonly errorWords?: string
  readonly fallbackLabel?: string
  readonly footerEmpty?: string
  readonly headerEmpty?: string
  readonly label?: string
  readonly loading?: string
  readonly loadingShown?: string
  readonly loadingText?: string
  readonly marksAll?: string
  readonly named?: string
  readonly onBeforeRead?: string
  readonly onDismiss?: string
  readonly onLoadMore?: string
  readonly onRead?: string
  readonly said?: string
  readonly separation?: string
  readonly total?: string
}

/** What a notification binds, by the name the machine reads. */
export interface NotificationRowChoice {
  readonly actionsFilled?: string
  readonly at?: string
  readonly defaultRead?: string
  readonly dismissLabel?: string
  readonly dismissName?: string
  readonly dismissible?: string
  readonly gone?: string
  readonly heard?: string
  readonly last?: string
  readonly media?: string
  readonly onBeforeRead?: string
  readonly onDismiss?: string
  readonly onRead?: string
  readonly read?: string
  readonly separation?: string
  readonly stamped?: string
  readonly unreadLabel?: string
}

/** What a block of code binds, by the name the machine reads. */
export interface CodeBlockChoice {
  readonly addedLines?: string
  readonly codeLabel?: string
  readonly codeNameLabel?: string
  readonly collapseLabel?: string
  readonly contextLines?: string
  readonly copyLabel?: string
  readonly copyNameLabel?: string
  readonly diff?: string
  readonly expandHidden?: string
  readonly expandLabel?: string
  readonly expandWords?: string
  readonly expandable?: string
  readonly file?: string
  readonly filesLabel?: string
  readonly hideUnchangedLabel?: string
  readonly highlight?: string
  readonly label?: string
  readonly language?: string
  readonly lineNumbers?: string
  readonly markLines?: string
  readonly noCopy?: string
  readonly onBeforeChange?: string
  readonly onBeforeCheck?: string
  readonly onChange?: string
  readonly onCheck?: string
  readonly panes?: string
  readonly removedLines?: string
  readonly several?: string
  readonly showUnchangedLabel?: string
  readonly tabs?: string
  readonly tokens?: string
  readonly variant?: string
  readonly wrap?: string
  readonly wrapLabel?: string
  readonly wrappable?: string
}

/** What a group of notifications binds, by the name the machine reads. */
export interface NotificationGroupChoice {
  readonly collapsible?: string
  readonly count?: string
  readonly countWords?: string
  readonly counted?: string
  readonly label?: string
}
