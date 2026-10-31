//! How a headless source spells each feature's fields, and the intermediate
//! form's name for each.
//!
//! **The source and the intermediate form name the same fields two ways.**
//! The source takes words a React, React Native, or ARIA reader knows,
//! `onChange`, `defaultProp`, `selectionMode`, and the intermediate form keeps
//! the names the native runtime reads, `after`, `initial`, `mode`, so a
//! change of spelling changes nothing a platform draws. Each feature's table
//! below is the one place the two meet: [`feature`] reads a source's field
//! into the intermediate form's, and [`written`] turns an intermediate name
//! back into the source's for a sentence.
//!
//! **Every name a source declares is written in camelCase**, as it declares
//! it and as a render reads it: `prop: 'defaultOpen'`, `onBeforeClose:
//! 'beforeClose'`. The intermediate form holds the web's hyphenated name,
//! `default-open`. A part, a region, an element's tag, and a derivation keep
//! their hyphens, since they are names the web writes as they are.
//!
//! **A field that names an event starts with `on`**, as a React handler's
//! prop does, and names what the event announces: `onBeforeOpen`,
//! `onChange`, `onScrollEnd`. A field that names the prop holding a feature's
//! state is `prop`, and the one that seeds it `defaultProp`, as Radix's
//! controllable state names them.

use crate::family::read::{kebab, Lit};

/// What a field's value is.
#[derive(Clone, Copy)]
pub enum Spell {
    /// A name the source declares: a prop, an event, a state, or a value the
    /// element computes, in camelCase.
    Name,
    /// A name, or an array of names.
    Names,
    /// A part or a region, as the tree names it.
    Part,
    /// A word the vocabulary gives, kept as written: `'replace'`, `'pressed'`.
    Literal,
    /// `true` or `false`.
    Flag,
    /// An object of fields, by its own table.
    Nested(&'static [Field]),
    /// An object whose keys and values are both names, as a stack's
    /// `writes`.
    NameMap,
}

/// One field: as the source writes it, as the intermediate form names it,
/// which may be a field of an object inside, `closes.event`, and its value.
pub type Field = (&'static str, &'static str, Spell);

use Spell::{Flag, Literal, Name, NameMap, Names, Nested, Part};

const TOGGLE: &[Field] = &[
    ("closeOnEscape", "escapes", Flag),
    ("defaultProp", "initial", Name),
    ("indeterminate", "mixed", Name),
    ("onBeforeChange", "before", Name),
    ("onBeforeClose", "closes", Name),
    ("onBeforeOpen", "opens", Name),
    ("onChange", "after", Names),
    ("onClose", "closed", Name),
    ("onToggle", "changes", Name),
    ("prop", "checked", Name),
    ("readonly", "readonly", Name),
    ("shared", "held", Literal),
];

const SELECT_ALL: &[Field] = &[
    ("label", "label", Name),
    ("part", "part", Part),
    ("prop", "enabled", Name),
];

const NUMBERING: &[Field] = &[
    ("first", "first", Name),
    ("reversed", "reversed", Name),
    ("start", "start", Name),
    ("step", "step", Name),
];

const KEYS: &[Field] = &[
    ("adds", "adds", Literal),
    ("enter", "enter", Literal),
    ("escape", "escape", Literal),
    ("itemKeys", "keeps", Literal),
    ("loop", "wrap", Flag),
    ("orientation", "along", Name),
    ("selectionFollowsFocus", "chooses", Flag),
    ("selects", "selects", Flag),
    ("typeahead", "letters", Flag),
];

const REORDER: &[Field] = &[
    ("canceled", "canceled", Name),
    ("dropped", "dropped", Name),
    ("enabled", "enabled", Name),
    ("move", "move", Name),
    ("moved", "moved", Name),
    ("onBeforeReorder", "before", Name),
    ("onReorder", "after", Name),
    ("picked", "picked", Name),
    ("preview", "preview", Part),
];

const COLLECTION: &[Field] = &[
    ("allowEmptySelection", "clears", Name),
    ("closeOn", "closes.event", Name),
    ("closeWhen", "closes.while", Name),
    ("currentFromItems", "marked", Flag),
    ("defaultProp", "initial", Name),
    ("disabled", "disabled", Name),
    ("disallowEmptySelection", "keeps", Name),
    ("empty", "empty", Name),
    ("focusWhenEmpty", "removes.empty", Part),
    ("itemOpen", "disclosed", Name),
    ("itemsToggle", "toggles", Flag),
    ("keys", "keys", Nested(KEYS)),
    ("label", "label", Name),
    ("manualActivation", "manual", Name),
    ("mixes", "mixes", Flag),
    ("numbering", "counts", Nested(NUMBERING)),
    ("onBeforeChange", "before", Name),
    ("onChange", "after", Names),
    ("openMode", "opens", Name),
    ("optional", "optional", Flag),
    ("order", "order", Literal),
    ("pressMode", "presses", Name),
    ("prop", "chosen", Name),
    ("readonly", "readonly", Name),
    ("removeOn", "removes.event", Name),
    ("reorder", "reorder", Nested(REORDER)),
    ("roves", "roves", Name),
    ("selectAll", "all", Nested(SELECT_ALL)),
    ("selectionBehavior", "behavior", Name),
    ("selectionMode", "mode", Name),
];

/// What `memberOf: set(family, { ... })` takes after the family.
pub const ITEM: &[Field] = &[
    ("checkable", "checkable", Name),
    ("checked", "checked", Name),
    /* Read from the render's `<Pressable selects>`, and refused written here. */
    ("chooses", "chooses", Flag),
    ("closeWhen", "closes", Name),
    ("current", "flag", Name),
    ("exclusive", "exclusive", Name),
    ("grip", "grip", Name),
    ("labelledby", "named", Names),
    ("onBeforeChange", "before", Name),
    ("pageSlot", "page", Name),
    ("selectedState", "state", Name),
    ("value", "value", Name),
];

const TOOLBAR: &[Field] = &[
    ("orientation", "orientation", Name),
    ("stopAtEnds", "ends", Name),
];

const STACK: &[Field] = &[
    ("back", "back", Part),
    ("backward", "left", Name),
    ("drilled", "drilled", Name),
    ("forward", "entered", Name),
    ("onBeforeChange", "before", Name),
    ("prop", "page", Name),
    ("title", "label", Name),
    ("topTitle", "top", Name),
    ("writes", "writes", NameMap),
];

const COPY_LABELS: &[Field] = &[
    ("copied", "copied", Name),
    ("failed", "failed", Name),
    ("idle", "resting", Name),
];

const COPY: &[Field] = &[
    ("copied", "copied", Name),
    ("duration", "after", Name),
    ("failed", "failed", Name),
    ("label", "says", Name),
    ("labels", "words", Nested(COPY_LABELS)),
    ("onCopy", "sends", Name),
    ("onError", "fails", Name),
    ("prop", "text", Name),
    ("status", "told", Name),
];

const COUNTDOWN: &[Field] = &[
    ("duration", "after", Name),
    ("onDone", "done", Name),
    ("paused", "paused", Name),
    ("waitWhile", "waits", Name),
];

const QUEUE: &[Field] = &[("prop", "queued", Name), ("queued", "waiting", Name)];

const DELAY: &[Field] = &[
    ("duration", "after", Name),
    ("idleWhen", "restarts", Name),
    ("pending", "waiting", Name),
    ("restartOn", "again", Name),
];

const CLOCK: &[Field] = &[
    ("expires", "expires", Literal),
    ("restartOn", "restarts", Names),
];

const MIDDLE: &[Field] = &[
    ("count", "count", Name),
    ("items", "items", Name),
    ("label", "label", Name),
    ("words", "words", Name),
];

const MAX_VISIBLE: &[Field] = &[("middle", "middle", Nested(MIDDLE)), ("prop", "max", Name)];

const PAGE_SCROLL: &[Field] = &[
    ("hidden", "hidden", Name),
    ("hideOnScroll", "hides", Name),
    ("keepInView", "stays", Name),
    ("onScrolledChange", "sends", Name),
    ("scrolled", "scrolled", Name),
    ("scroller", "scroller", Name),
];

const SCROLL: &[Field] = &[
    ("blockEnd", "block-end", Name),
    ("blockStart", "block-start", Name),
    ("inlineEnd", "inline-end", Name),
    ("inlineStart", "inline-start", Name),
    ("onScroll", "moves", Name),
    ("onScrollEnd", "settles", Name),
    ("overflows", "overflows", Name),
    ("part", "part", Part),
];

const SECTIONS: &[Field] = &[
    ("follow", "follow", Name),
    ("indicator", "mark", Part),
    ("link", "link", Part),
    ("list", "list", Name),
    ("marks", "marks", Name),
    ("offset", "offset", Name),
    ("onChange", "changes", Name),
    ("scrollBehavior", "behavior", Name),
];

const COLOR: &[Field] = &[
    ("alpha", "alpha", Name),
    ("brightness", "brightness", Name),
    ("channels", "channels", Name),
    ("defaultProp", "seed", Name),
    ("fields", "fields", Name),
    ("format", "format", Name),
    ("formatLabel", "formatLabel", Name),
    ("formatWord", "formatWord", Name),
    ("hue", "hue", Name),
    ("markX", "markX", Name),
    ("markY", "markY", Name),
    ("onBeforeChange", "before", Name),
    ("onChange", "change", Name),
    ("onCopy", "copied", Name),
    ("onInput", "input", Name),
    ("painted", "painted", Name),
    ("presets", "presets", Name),
    ("prop", "value", Name),
    ("reading", "reading", Name),
    ("readonly", "readonly", Name),
    ("sampleLabel", "sampleLabel", Name),
    ("saturation", "saturation", Name),
    ("square", "square", Name),
    ("squareReversed", "squareReversed", Name),
    ("swatches", "swatches", Name),
    ("tint", "tint", Name),
    ("wheelGrid", "wheelGrid", Name),
    ("wheelX", "wheelX", Name),
    ("wheelY", "wheelY", Name),
];

const COLOR_FIELD: &[Field] = &[
    ("painted", "painted", Name),
    ("picked", "picked", Name),
    ("said", "said", Name),
];

const TREE: &[Field] = &[
    ("active", "active", Name),
    ("canceledLabel", "canceledLabel", Name),
    ("chevronPlacement", "chevronPlacement", Name),
    ("defaultActive", "defaultActive", Name),
    ("droppedLabel", "droppedLabel", Name),
    ("empty", "empty", Name),
    ("label", "label", Name),
    ("movedIntoLabel", "movedIntoLabel", Name),
    ("movedLabel", "movedLabel", Name),
    ("nesting", "nesting", Name),
    ("onBeforeChange", "onBeforeChange", Name),
    ("onBeforeReorder", "onBeforeReorder", Name),
    ("onChange", "onChange", Name),
    ("onReorder", "onReorder", Name),
    ("pickedUpLabel", "pickedUpLabel", Name),
    ("reorderable", "reorderable", Name),
    ("selectionMode", "selectionMode", Name),
];

const TABLE: &[Field] = &[
    ("columns", "columns", Name),
    ("defaultExpanded", "defaultExpanded", Name),
    ("defaultSelected", "defaultSelected", Name),
    ("defaultSort", "defaultSort", Name),
    ("empty", "empty", Name),
    ("every", "every", Name),
    ("expanded", "expanded", Name),
    ("grid", "grid", Name),
    ("heads", "heads", Name),
    ("label", "label", Name),
    ("loadMore", "loadMore", Name),
    ("nests", "nests", Name),
    ("onBeforeExpand", "onBeforeExpand", Name),
    ("onBeforeReorder", "onBeforeReorder", Name),
    ("onBeforeSelect", "onBeforeSelect", Name),
    ("onBeforeSort", "onBeforeSort", Name),
    ("onExpand", "onExpand", Name),
    ("onLoadMore", "onLoadMore", Name),
    ("onReorder", "onReorder", Name),
    ("onSelect", "onSelect", Name),
    ("onSort", "onSort", Name),
    ("reorderable", "reorderable", Name),
    ("rows", "rows", Name),
    ("selectable", "selectable", Name),
    ("selected", "selected", Name),
    ("selectionBehavior", "selectionBehavior", Name),
    ("selectionMode", "selectionMode", Name),
    ("sort", "sort", Name),
    ("waiting", "waiting", Name),
    ("windowed", "windowed", Name),
];

const TABLE_ROW: &[Field] = &[
    ("branch", "branch", Name),
    ("cells", "cells", Name),
    ("disabled", "disabled", Name),
    ("grips", "grips", Name),
    ("gripStill", "gripStill", Name),
    ("href", "href", Name),
    ("nests", "nests", Name),
    ("parent", "parent", Name),
    ("selectable", "selectable", Name),
    ("selectedCell", "selectedCell", Name),
    ("value", "value", Name),
];

const LOG_ROOT: &[Field] = &[
    ("blank", "blank", Name),
    ("busy", "busy", Name),
    ("collapse", "collapse", Name),
    ("digits", "digits", Name),
    ("done", "done", Name),
    ("doneLabel", "doneLabel", Name),
    ("droppedHidden", "droppedHidden", Name),
    ("droppedLabel", "droppedLabel", Name),
    ("droppedWords", "droppedWords", Name),
    ("emptyText", "emptyText", Name),
    ("errorLabel", "errorLabel", Name),
    ("fallbackLabel", "fallbackLabel", Name),
    ("format", "format", Name),
    ("groupLabel", "groupLabel", Name),
    ("groups", "groups", Name),
    ("label", "label", Name),
    ("level", "level", Name),
    ("limit", "limit", Name),
    ("lineHref", "lineHref", Name),
    ("lineLabel", "lineLabel", Name),
    ("lineNumbers", "lineNumbers", Name),
    ("lines", "lines", Name),
    ("list", "list", Name),
    ("loading", "loading", Name),
    ("loadingText", "loadingText", Name),
    ("markLines", "markLines", Name),
    ("matchesLabel", "matchesLabel", Name),
    ("named", "named", Name),
    ("onBeforeSelect", "onBeforeSelect", Name),
    ("onExpand", "onExpand", Name),
    ("onSelect", "onSelect", Name),
    ("parse", "parse", Name),
    ("query", "query", Name),
    ("quiet", "quiet", Name),
    ("said", "said", Name),
    ("scrolls", "scrolls", Name),
    ("selectable", "selectable", Name),
    ("selectedLines", "selectedLines", Name),
    ("source", "source", Name),
    ("timestamps", "timestamps", Name),
    ("wrap", "wrap", Name),
];

const LOG_LINE: &[Field] = &[
    ("unwrapped", "unwrapped", Name),
    ("unnumbered", "unnumbered", Name),
    ("at", "at", Name),
    ("count", "count", Name),
    ("countHidden", "countHidden", Name),
    ("countWords", "countWords", Name),
    ("debug", "debug", Name),
    ("error", "error", Name),
    ("grouped", "grouped", Name),
    ("level", "level", Name),
    ("levelHidden", "levelHidden", Name),
    ("levelWords", "levelWords", Name),
    ("lineLabel", "lineLabel", Name),
    ("linked", "linked", Name),
    ("logRow", "logRow", Name),
    ("marked", "marked", Name),
    ("heard", "heard", Name),
    ("digits", "digits", Name),
    ("numberHidden", "numberHidden", Name),
    ("numberName", "numberName", Name),
    ("numberWords", "numberWords", Name),
    ("plainNumber", "plainNumber", Name),
    ("pressNumber", "pressNumber", Name),
    ("runs", "runs", Name),
    ("selected", "selected", Name),
    ("textHidden", "textHidden", Name),
    ("timeHidden", "timeHidden", Name),
    ("timeWords", "timeWords", Name),
    ("timesLabel", "timesLabel", Name),
    ("warn", "warn", Name),
    ("written", "written", Name),
];

const NOTIFICATIONS_ROOT: &[Field] = &[
    ("arrivedLabel", "arrivedLabel", Name),
    ("blank", "blank", Name),
    ("emptyText", "emptyText", Name),
    ("errorShown", "errorShown", Name),
    ("errorText", "errorText", Name),
    ("errorWords", "errorWords", Name),
    ("fallbackLabel", "fallbackLabel", Name),
    ("footerEmpty", "footerEmpty", Name),
    ("headerEmpty", "headerEmpty", Name),
    ("label", "label", Name),
    ("loading", "loading", Name),
    ("loadingShown", "loadingShown", Name),
    ("loadingText", "loadingText", Name),
    ("marksAll", "marksAll", Name),
    ("named", "named", Name),
    ("onBeforeRead", "onBeforeRead", Name),
    ("onDismiss", "onDismiss", Name),
    ("onLoadMore", "onLoadMore", Name),
    ("onRead", "onRead", Name),
    ("said", "said", Name),
    ("separation", "separation", Name),
    ("total", "total", Name),
];

const NOTIFICATION_ROW: &[Field] = &[
    ("actionsFilled", "actionsFilled", Name),
    ("at", "at", Name),
    ("defaultRead", "defaultRead", Name),
    ("dismissLabel", "dismissLabel", Name),
    ("dismissName", "dismissName", Name),
    ("dismissible", "dismissible", Name),
    ("gone", "gone", Name),
    ("heard", "heard", Name),
    ("last", "last", Name),
    ("media", "media", Name),
    ("onBeforeRead", "onBeforeRead", Name),
    ("onDismiss", "onDismiss", Name),
    ("onRead", "onRead", Name),
    ("read", "read", Name),
    ("separation", "separation", Name),
    ("stamped", "stamped", Name),
    ("unreadLabel", "unreadLabel", Name),
];

const CODE_BLOCK: &[Field] = &[
    ("addedLines", "addedLines", Name),
    ("codeLabel", "codeLabel", Name),
    ("codeNameLabel", "codeNameLabel", Name),
    ("collapseLabel", "collapseLabel", Name),
    ("contextLines", "contextLines", Name),
    ("copyLabel", "copyLabel", Name),
    ("copyNameLabel", "copyNameLabel", Name),
    ("diff", "diff", Name),
    ("expandHidden", "expandHidden", Name),
    ("expandLabel", "expandLabel", Name),
    ("expandWords", "expandWords", Name),
    ("expandable", "expandable", Name),
    ("file", "file", Name),
    ("filesLabel", "filesLabel", Name),
    ("hideUnchangedLabel", "hideUnchangedLabel", Name),
    ("highlight", "highlight", Name),
    ("label", "label", Name),
    ("language", "language", Name),
    ("lineNumbers", "lineNumbers", Name),
    ("markLines", "markLines", Name),
    ("noCopy", "noCopy", Name),
    ("onBeforeChange", "onBeforeChange", Name),
    ("onBeforeCheck", "onBeforeCheck", Name),
    ("onChange", "onChange", Name),
    ("onCheck", "onCheck", Name),
    ("panes", "panes", Name),
    ("removedLines", "removedLines", Name),
    ("several", "several", Name),
    ("showUnchangedLabel", "showUnchangedLabel", Name),
    ("tabs", "tabs", Name),
    ("tokens", "tokens", Name),
    ("variant", "variant", Name),
    ("wrap", "wrap", Name),
    ("wrapLabel", "wrapLabel", Name),
    ("wrappable", "wrappable", Name),
];

const NOTIFICATION_GROUP: &[Field] = &[
    ("collapsible", "collapsible", Name),
    ("count", "count", Name),
    ("countWords", "countWords", Name),
    ("counted", "counted", Name),
    ("label", "label", Name),
];

const LOG_GROUP: &[Field] = &[
    ("frame", "frame", Name),
    ("digits", "digits", Name),
    ("heard", "heard", Name),
    ("duration", "duration", Name),
    ("durationHidden", "durationHidden", Name),
    ("heading", "heading", Name),
    ("logDrawn", "logDrawn", Name),
    ("markIcon", "markIcon", Name),
    ("spokenHidden", "spokenHidden", Name),
    ("spokenWords", "spokenWords", Name),
    ("status", "status", Name),
    ("statusHidden", "statusHidden", Name),
    ("statusIcon", "statusIcon", Name),
    ("statusLabel", "statusLabel", Name),
];

const TAIL: &[Field] = &[
    ("following", "following", Name),
    ("away", "away", Name),
    ("defaultPinned", "defaultPinned", Name),
    ("onBeforePin", "onBeforePin", Name),
    ("onPin", "onPin", Name),
    ("pinned", "pinned", Name),
    ("resume", "resume", Name),
    ("threshold", "threshold", Name),
];

const TABLE_COLUMN: &[Field] = &[
    ("field", "field", Name),
    ("movable", "movable", Name),
    ("onBeforeResize", "onBeforeResize", Name),
    ("onResized", "onResized", Name),
    ("resizable", "resizable", Name),
    ("resizeLabel", "resizeLabel", Name),
    ("sortable", "sortable", Name),
    ("sorts", "sorts", Name),
    ("still", "still", Name),
    ("textAlign", "textAlign", Name),
    ("width", "width", Name),
    ("widthLabel", "widthLabel", Name),
];

const INSPECTOR: &[Field] = &[
    ("active", "active", Name),
    ("blank", "blank", Name),
    ("copyLabel", "copyLabel", Name),
    ("copyName", "copyName", Name),
    ("copyText", "copyText", Name),
    ("copyValueLabel", "copyValueLabel", Name),
    ("defaultDepth", "defaultDepth", Name),
    ("emptyText", "emptyText", Name),
    ("expanded", "expanded", Name),
    ("itemsLabel", "itemsLabel", Name),
    ("keysLabel", "keysLabel", Name),
    ("label", "label", Name),
    ("list", "list", Name),
    ("named", "named", Name),
    ("noMatchesLabel", "noMatchesLabel", Name),
    ("onActivate", "onActivate", Name),
    ("onBeforeActivate", "onBeforeActivate", Name),
    ("onBeforeClose", "onBeforeClose", Name),
    ("onBeforeOpen", "onBeforeOpen", Name),
    ("onCopy", "onCopy", Name),
    ("onToggle", "onToggle", Name),
    ("renderValue", "renderValue", Name),
    ("resultsLabel", "resultsLabel", Name),
    ("said", "said", Name),
    ("topped", "topped", Name),
    ("treeLabel", "treeLabel", Name),
    ("value", "value", Name),
    ("windowed", "windowed", Name),
];

const TREE_ITEM: &[Field] = &[
    ("branch", "branch", Name),
    ("checkable", "checkable", Name),
    ("checkMark", "checkMark", Name),
    ("chevronEnd", "chevronEnd", Name),
    ("chevronLabel", "chevronLabel", Name),
    ("chevronStart", "chevronStart", Name),
    ("dashMark", "dashMark", Name),
    ("disabled", "disabled", Name),
    ("grip", "grip", Name),
    ("heading", "heading", Name),
    ("href", "href", Name),
    ("lazy", "lazy", Name),
    ("leaf", "leaf", Name),
    ("level", "level", Name),
    ("linked", "linked", Name),
    ("nested", "nested", Name),
    ("onBeforeSelect", "onBeforeSelect", Name),
    ("onLoad", "onLoad", Name),
    ("place", "place", Name),
    ("rel", "rel", Name),
    ("reserved", "reserved", Name),
    ("subordinate", "subordinate", Name),
    ("target", "target", Name),
    ("value", "value", Name),
];

const WINDOW: &[Field] = &[
    ("columns", "columns", Name),
    ("disabledKeys", "disabledKeys", Name),
    ("empty", "empty", Name),
    ("estimate", "estimate", Name),
    ("gap", "gap", Name),
    ("horizontal", "horizontal", Name),
    ("items", "items", Name),
    ("keyField", "keyField", Name),
    ("layout", "layout", Name),
    ("list", "list", Name),
    ("loading", "loading", Name),
    ("loadingState", "loadingState", Name),
    ("minColumnWidth", "minColumnWidth", Name),
    ("onBeforeChange", "onBeforeChange", Name),
    ("onBeforeReorder", "onBeforeReorder", Name),
    ("onChange", "onChange", Name),
    ("onLoadMore", "onLoadMore", Name),
    ("onRangeChange", "onRangeChange", Name),
    ("onReorder", "onReorder", Name),
    ("orientation", "orientation", Name),
    ("reorderable", "reorderable", Name),
    ("sectionField", "sectionField", Name),
    ("selectionBehavior", "selectionBehavior", Name),
    ("selectionMode", "selectionMode", Name),
    ("textField", "textField", Name),
    ("value", "value", Name),
];

const FILES: &[Field] = &[
    ("accept", "accept", Name),
    ("bytesLabel", "bytes", Name),
    ("hasFiles", "filled", Name),
    ("list", "list", Name),
    ("locale", "locale", Name),
    ("maxFileSize", "largest", Name),
    ("maxFiles", "most", Name),
    ("multiple", "multiple", Name),
    ("onBeforeChange", "before", Name),
    ("onChange", "change", Name),
    ("onInput", "input", Name),
    ("onReject", "reject", Name),
    ("rejectedText", "refused", Name),
    ("removeLabel", "naming", Name),
    ("removedText", "removed", Name),
];

const SECTION: &[Field] = &[
    ("id", "id", Name),
    ("label", "label", Name),
    ("level", "level", Name),
];

const NOTICES: &[Field] = &[
    ("bubbles", "hears", Name),
    ("maxVisible", "max", Name),
    ("showing", "showing", Name),
    ("swipeDirection", "toward", Name),
];

const NOTICE: &[Field] = &[("deferred", "waiting", Name), ("part", "part", Part)];

const TOTAL: &[Field] = &[
    ("holds", "holds", Name),
    ("itemProp", "prop", Name),
    ("of", "of", Literal),
    ("prop", "into", Name),
];

const TOUR: &[Field] = &[
    ("backLabel", "back", Name),
    ("defaultProp", "initial", Name),
    ("doneLabel", "done", Name),
    ("lit", "lit", Name),
    ("nextLabel", "next", Name),
    ("onAsk", "asks", Name),
    ("onBeforeChange", "before", Name),
    ("onChange", "moves", Name),
    ("onComplete", "completes", Name),
    ("onStatus", "reports", Name),
    ("outsidePress", "outside", Name),
    ("preparing", "preparing", Name),
    ("progress", "progress", Name),
    ("progressLabel", "place", Name),
    ("prop", "index", Name),
    ("skipLabel", "skip", Name),
    ("spotlight", "spot", Name),
    ("spotlightPadding", "padding", Name),
    ("veiled", "veiled", Name),
    ("waiting", "waiting", Name),
];

const STOP: &[Field] = &[
    ("back", "back", Part),
    ("counted", "counted", Name),
    ("current", "current", Name),
    ("effect", "effect", Name),
    ("first", "first", Name),
    ("last", "last", Name),
    ("name", "name", Name),
    ("next", "next", Part),
    ("onAsk", "asks", Name),
    ("place", "place", Name),
    ("reach", "reach", Name),
    ("said", "said", Name),
    ("shown", "shown", Name),
    ("skip", "skip", Part),
    ("target", "target", Name),
    ("type", "type", Name),
    ("words", "words", Name),
];

const VALIDATION: &[Field] = &[
    ("badInput", "bad", Name),
    ("feedback", "feedback", Name),
    ("maxLength", "maxlength", Name),
    ("message", "message", Name),
    ("minLength", "minlength", Name),
    ("pattern", "pattern", Name),
    ("rangeOverflow", "over", Name),
    ("rangeUnderflow", "under", Name),
    ("required", "required", Name),
    ("stepMismatch", "off", Name),
    ("tooShort", "short", Name),
    ("type", "type", Name),
    ("valueMissing", "missing", Name),
];

const RANGE: &[Field] = &[
    ("atMax", "ceiling", Name),
    ("atMin", "floor", Name),
    ("basis", "basis", Name),
    ("clearable", "clearable", Name),
    ("collapsed", "collapsed", Name),
    ("collapsedLabel", "closed", Name),
    ("collapsedSize", "sliver", Name),
    ("collapsedState", "folded", Name),
    ("collapsible", "collapsible", Name),
    ("defaultCollapsed", "shut", Name),
    ("defaultProp", "initial", Name),
    ("dragging", "dragging", Name),
    ("endMin", "reserve", Name),
    ("fillFrom", "from", Name),
    ("fillSpan", "span", Name),
    ("fillTo", "to", Name),
    ("flush", "flush", Name),
    ("focusVisible", "ringed", Name),
    ("formatOptions", "format", Name),
    ("fraction", "fraction", Name),
    ("full", "full", Name),
    ("highest", "highest", Name),
    ("largeStep", "large", Name),
    ("locale", "locale", Name),
    ("lowest", "lowest", Name),
    ("max", "max", Name),
    ("min", "min", Name),
    ("onBeforeChange", "before", Name),
    ("onBeforeCollapse", "closing", Name),
    ("onChange", "change", Name),
    ("onClear", "clear", Name),
    ("onCollapse", "collapse", Name),
    ("onInput", "input", Name),
    ("onPreview", "preview", Name),
    ("optionLabel", "option", Name),
    ("orientation", "orientation", Name),
    ("origin", "origin", Name),
    ("pageStep", "page", Name),
    ("part", "share", Name),
    ("primary", "primary", Name),
    ("prop", "value", Name),
    ("reading", "reading", Name),
    ("readonly", "readonly", Name),
    ("said", "said", Name),
    ("snap", "snap", Name),
    ("snapThreshold", "threshold", Name),
    ("spoken", "spoken", Name),
    ("step", "step", Name),
    ("valueText", "template", Name),
    ("several", "several", Name),
    ("scrub", "scrub", Name),
    ("grip", "grip", Literal),
    ("scrubbing", "scrubbing", Name),
    ("minStepsBetween", "apart", Name),
    ("rangeText", "joins", Name),
    ("minimumLabel", "least", Name),
    ("maximumLabel", "most", Name),
    ("thumbLabel", "between", Name),
    ("label", "named", Name),
    ("formatter", "writes", Name),
    ("thumbs", "stops", Name),
    ("vertical", "stacked", Name),
];

const ENTRY: &[Field] = &[
    ("blank", "blank", Name),
    ("max", "highest", Name),
    ("min", "lowest", Name),
    ("reveal", "reveal", Name),
    ("revealShown", "unveils", Name),
    ("revealed", "bared", Name),
    ("step", "stride", Name),
    ("type", "kind", Name),
    ("caret", "caret", Name),
    ("cell", "cell", Literal),
    ("clean", "cleans", Literal),
    ("clearShown", "shows", Name),
    ("clearable", "offers", Name),
    ("defaultProp", "initial", Name),
    ("onBeforeChange", "before", Name),
    ("onChange", "change", Name),
    ("onClear", "clear", Name),
    ("length", "length", Name),
    ("onComplete", "complete", Name),
    ("onInput", "input", Name),
    ("prop", "value", Name),
    ("readonly", "readonly", Name),
    ("typed", "typed", Name),
];

/// Each feature a source declares: its key, the intermediate form's key and
/// the helper its reader takes, and its fields.
pub const FEATURES: &[(&str, &str, &[Field])] = &[
    ("clock", "clock", CLOCK),
    ("collection", "collection", COLLECTION),
    ("copy", "copy", COPY),
    ("color", "color", COLOR),
    ("colorField", "colorField", COLOR_FIELD),
    ("countdown", "countdown", COUNTDOWN),
    ("delay", "delay", DELAY),
    ("text", "entry", ENTRY),
    ("files", "files", FILES),
    ("window", "window", WINDOW),
    ("inspector", "inspector", INSPECTOR),
    ("tableRoot", "tableRoot", TABLE),
    ("tableRow", "tableRow", TABLE_ROW),
    ("tableColumn", "tableColumn", TABLE_COLUMN),
    ("logRoot", "logRoot", LOG_ROOT),
    ("logLine", "logLine", LOG_LINE),
    ("logGroup", "logGroup", LOG_GROUP),
    ("tail", "tail", TAIL),
    ("notificationsRoot", "notificationsRoot", NOTIFICATIONS_ROOT),
    ("notificationRow", "notificationRow", NOTIFICATION_ROW),
    ("notificationGroup", "notificationGroup", NOTIFICATION_GROUP),
    ("codeBlock", "codeBlock", CODE_BLOCK),
    ("treeRoot", "treeRoot", TREE),
    ("treeItem", "treeItem", TREE_ITEM),
    ("maxVisible", "fold", MAX_VISIBLE),
    ("notice", "notice", NOTICE),
    ("notices", "notices", NOTICES),
    ("pageScroll", "page", PAGE_SCROLL),
    ("queue", "queue", QUEUE),
    ("range", "range", RANGE),
    ("scroll", "scroll", SCROLL),
    ("section", "section", SECTION),
    ("sections", "sections", SECTIONS),
    ("stack", "stack", STACK),
    ("stop", "stop", STOP),
    ("toggle", "toggle", TOGGLE),
    ("toolbar", "toolbar", TOOLBAR),
    ("total", "total", TOTAL),
    ("tour", "tour", TOUR),
    ("validation", "validation", VALIDATION),
];

/// The intermediate form's key and its reader's call for a feature the
/// source declares as `key: { ... }`, or `None` where `key` is no feature.
///
/// # Errors
///
/// A sentence naming a field the feature does not have, one written the
/// intermediate form's way, a value of the wrong shape, and a name written
/// with hyphens.
pub fn feature(key: &str, value: &Lit) -> Result<Option<(String, Lit)>, String> {
    if let Some((written, ..)) = FEATURES
        .iter()
        .find(|(written, ir, _)| ir == &key && written != &key)
    {
        return Err(format!("`{key}` is written `{written}`"));
    }
    let Some((_, ir, fields)) = FEATURES.iter().find(|(written, ..)| *written == key) else {
        return Ok(None);
    };
    let Lit::Object(entries) = value else {
        return Err(format!(
            "`{key}` is an object of its fields, as `{key}: {{ ... }}`"
        ));
    };
    let spelled = object(key, fields, entries)?;
    Ok(Some((
        (*ir).to_owned(),
        Lit::Call((*ir).to_owned(), vec![spelled]),
    )))
}

/// An object's fields in the intermediate form's names.
///
/// # Errors
///
/// As [`feature`] says.
pub fn object(at: &str, fields: &[Field], entries: &[(String, Lit)]) -> Result<Lit, String> {
    let mut read: Vec<(String, Lit)> = Vec::new();
    for (key, value) in entries {
        let Some((_, ir, spell)) = fields.iter().find(|(written, ..)| written == key) else {
            if let Some((written, ..)) = fields
                .iter()
                .find(|(written, ir, _)| leaf(ir) == key && written != key)
            {
                return Err(format!("`{at}.{key}` is written `{written}`"));
            }
            return Err(format!(
                "`{at}.{key}` is not a field it has: {}",
                fields
                    .iter()
                    .map(|(written, ..)| format!("`{written}`"))
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        };
        let value = spelled(&format!("{at}.{key}"), *spell, value)?;
        match ir.split_once('.') {
            Some((outer, inner)) => {
                if !read.iter().any(|(held, _)| held == outer) {
                    read.push((outer.to_owned(), Lit::Object(Vec::new())));
                }
                for (held, slot) in &mut read {
                    if let (true, Lit::Object(inside)) = (held == outer, slot) {
                        inside.push((inner.to_owned(), value.clone()));
                    }
                }
            }
            None => read.push(((*ir).to_owned(), value)),
        }
    }
    Ok(Lit::Object(read))
}

/// The last part of a dotted name.
fn leaf(ir: &str) -> &str {
    ir.rsplit_once('.').map_or(ir, |(_, last)| last)
}

/// One value, as its field says.
fn spelled(at: &str, spell: Spell, value: &Lit) -> Result<Lit, String> {
    match (spell, value) {
        (Name | Names, Lit::Text(name)) => name_of(at, name).map(Lit::Text),
        (Names, Lit::Array(names)) => names
            .iter()
            .map(|one| match one {
                Lit::Text(name) => name_of(at, name).map(Lit::Text),
                _ => Err(format!("`{at}` is a name or an array of names")),
            })
            .collect::<Result<_, _>>()
            .map(Lit::Array),
        (Nested(fields), Lit::Object(entries)) => object(at, fields, entries),
        (NameMap, Lit::Object(entries)) => entries
            .iter()
            .map(|(key, value)| match value {
                Lit::Text(name) => Ok((name_of(at, key)?, Lit::Text(name_of(at, name)?))),
                _ => Err(format!("`{at}` is an object of names")),
            })
            .collect::<Result<_, _>>()
            .map(Lit::Object),
        (Part | Literal, _) | (Flag, Lit::Bool(_)) => Ok(value.clone()),
        (Name, _) => Err(format!("`{at}` is a name")),
        (Names, _) => Err(format!("`{at}` is a name or an array of names")),
        (Nested(_) | NameMap, _) => Err(format!("`{at}` is an object")),
        (Flag, _) => Err(format!("`{at}` is `true` or `false`")),
    }
}

/// A value of `host` or `derived`: `bind()` and `not()` name a prop, a
/// computed value, or a region in camelCase, as the web spells it.
///
/// # Errors
///
/// As [`name_of`] says.
pub fn bound(at: &str, value: &Lit) -> Result<Lit, String> {
    match value {
        Lit::Call(helper, arguments) if helper == "bind" || helper == "not" => {
            match arguments.as_slice() {
                [Lit::Text(name)] => Ok(Lit::Call(
                    helper.clone(),
                    vec![Lit::Text(name_of(at, name)?)],
                )),
                _ => Ok(value.clone()),
            }
        }
        _ => Ok(value.clone()),
    }
}

/// A name the source declares, written in camelCase, as the web spells it.
///
/// # Errors
///
/// A sentence naming one written with hyphens, and how to write it.
pub fn name_of(at: &str, name: &str) -> Result<String, String> {
    if name.contains('-') {
        return Err(format!(
            "`{at}` names `{name}` in camelCase, as `{}`",
            camel(name)
        ));
    }
    Ok(kebab(name))
}

/// `default-open` as `defaultOpen`.
pub fn camel(name: &str) -> String {
    let mut written = String::with_capacity(name.len());
    let mut upper = false;
    for character in name.chars() {
        if character == '-' {
            upper = true;
        } else if upper {
            written.extend(character.to_uppercase());
            upper = false;
        } else {
            written.push(character);
        }
    }
    written
}

/// A feature's field as the source writes it, from the intermediate form's
/// name, for a sentence: `after` in a toggle is `onChange`.
pub fn written(feature: &str, ir: &str) -> String {
    let fields = FEATURES
        .iter()
        .find(|(_, held, _)| *held == feature)
        .map(|(.., fields)| *fields);
    let source = FEATURES
        .iter()
        .find(|(_, held, _)| *held == feature)
        .map_or(feature, |(written, ..)| *written);
    fields.and_then(|fields| find(fields, ir)).map_or_else(
        || format!("{source}.{ir}"),
        |found| format!("{source}.{found}"),
    )
}

/// The source's spelling of a dotted intermediate name inside `fields`.
fn find(fields: &[Field], ir: &str) -> Option<String> {
    if let Some((written, ..)) = fields.iter().find(|(_, held, _)| *held == ir) {
        return Some((*written).to_owned());
    }
    let (outer, inner) = ir.split_once('.')?;
    fields
        .iter()
        .find_map(|(written, held, spell)| match spell {
            Nested(inside) if *held == outer => {
                find(inside, inner).map(|found| format!("{written}.{found}"))
            }
            _ => None,
        })
}

#[cfg(test)]
mod tests {
    use super::{feature, written};
    use crate::family::read::Lit;

    fn text(value: &str) -> Lit {
        Lit::Text(value.to_owned())
    }

    #[test]
    fn a_feature_is_read_in_the_intermediate_forms_names_with_each_name_hyphenated() {
        let (key, read) = feature(
            "collection",
            &Lit::Object(vec![
                ("prop".to_owned(), text("defaultValue")),
                ("closeOn".to_owned(), text("beforeSelect")),
                ("closeWhen".to_owned(), text("closeOnSelect")),
                (
                    "keys".to_owned(),
                    Lit::Object(vec![("loop".to_owned(), Lit::Bool(true))]),
                ),
            ]),
        )
        .unwrap()
        .unwrap();
        assert_eq!(key, "collection");
        assert_eq!(
            read,
            Lit::Call(
                "collection".to_owned(),
                vec![Lit::Object(vec![
                    ("chosen".to_owned(), text("default-value")),
                    (
                        "closes".to_owned(),
                        Lit::Object(vec![
                            ("event".to_owned(), text("before-select")),
                            ("while".to_owned(), text("close-on-select")),
                        ])
                    ),
                    (
                        "keys".to_owned(),
                        Lit::Object(vec![("wrap".to_owned(), Lit::Bool(true))])
                    ),
                ])]
            )
        );
    }

    #[test]
    fn an_old_spelling_and_a_hyphenated_name_are_refused_with_the_one_to_write() {
        let old = feature(
            "toggle",
            &Lit::Object(vec![("after".to_owned(), text("change"))]),
        )
        .unwrap_err();
        assert!(
            old.contains("`toggle.after` is written `onChange`"),
            "{old}"
        );
        let hyphens = feature(
            "toggle",
            &Lit::Object(vec![("prop".to_owned(), text("default-open"))]),
        )
        .unwrap_err();
        assert!(
            hyphens.contains("in camelCase, as `defaultOpen`"),
            "{hyphens}"
        );
        let key = feature("fold", &Lit::Object(Vec::new())).unwrap_err();
        assert!(key.contains("`fold` is written `maxVisible`"), "{key}");
    }

    #[test]
    fn an_intermediate_name_is_said_as_the_source_writes_it() {
        assert_eq!(written("toggle", "after"), "toggle.onChange");
        assert_eq!(written("collection", "keys.wrap"), "collection.keys.loop");
        assert_eq!(
            written("collection", "closes.while"),
            "collection.closeWhen"
        );
        assert_eq!(written("fold", "max"), "maxVisible.prop");
    }
}
