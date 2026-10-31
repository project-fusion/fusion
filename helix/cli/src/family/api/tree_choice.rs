//! How the elements of a tree say so, as a source's `treeRoot` and `treeItem`: the
//! props, states, and events each machine reads, and the values an item
//! computes for its parts. The web's elements hold all of it themselves, and a
//! phone hosts the `tree` and `tree-item` machines.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// What the element around the items reads and sends, by the name the machine
/// binds, each value a name of the source.
pub const TREE: &[(&str, Names)] = &[
    ("active", Names::Prop),
    ("canceledLabel", Names::Prop),
    ("chevronPlacement", Names::Prop),
    ("defaultActive", Names::Prop),
    ("droppedLabel", Names::Prop),
    ("label", Names::Prop),
    ("movedIntoLabel", Names::Prop),
    ("movedLabel", Names::Prop),
    ("nesting", Names::Prop),
    ("onBeforeChange", Names::Event),
    ("onBeforeReorder", Names::Event),
    ("onChange", Names::Event),
    ("onReorder", Names::Event),
    ("pickedUpLabel", Names::Prop),
    ("reorderable", Names::Prop),
    ("selectionMode", Names::Prop),
];

/// What an item reads and sends, by the name the machine binds.
pub const TREE_ITEM: &[(&str, Names)] = &[
    ("disabled", Names::Prop),
    ("href", Names::Prop),
    ("lazy", Names::Prop),
    ("onBeforeSelect", Names::Event),
    ("onLoad", Names::Event),
    ("rel", Names::Prop),
    ("target", Names::Prop),
    ("value", Names::Prop),
];

/// What an object inspector reads and sends, by the name the machine binds.
pub const INSPECTOR: &[(&str, Names)] = &[
    ("active", Names::Prop),
    ("copyLabel", Names::Prop),
    ("copyValueLabel", Names::Prop),
    ("defaultDepth", Names::Prop),
    ("emptyText", Names::Prop),
    ("expanded", Names::Prop),
    ("itemsLabel", Names::Prop),
    ("keysLabel", Names::Prop),
    ("label", Names::Prop),
    ("noMatchesLabel", Names::Prop),
    ("onActivate", Names::Event),
    ("onBeforeActivate", Names::Event),
    ("onBeforeClose", Names::Event),
    ("onBeforeOpen", Names::Event),
    ("onCopy", Names::Event),
    ("onToggle", Names::Event),
    ("renderValue", Names::Prop),
    ("resultsLabel", Names::Prop),
    ("treeLabel", Names::Prop),
    ("value", Names::Prop),
    ("windowed", Names::Prop),
];

/// What an object inspector computes for its parts, each read as `inspector.x`.
pub const INSPECTOR_COMPUTED: &[&str] = &[
    "blank", "copyName", "copyText", "list", "named", "said", "topped",
];

/// What log-root reads and sends, by the name the machine binds.
pub const LOG_ROOT: &[(&str, Names)] = &[
    ("collapse", Names::Prop),
    ("done", Names::Prop),
    ("doneLabel", Names::Prop),
    ("droppedLabel", Names::Prop),
    ("emptyText", Names::Prop),
    ("errorLabel", Names::Prop),
    ("fallbackLabel", Names::Prop),
    ("format", Names::Prop),
    ("groupLabel", Names::Prop),
    ("groups", Names::Prop),
    ("label", Names::Prop),
    ("level", Names::Prop),
    ("limit", Names::Prop),
    ("lineHref", Names::Prop),
    ("lineLabel", Names::Prop),
    ("lineNumbers", Names::Prop),
    ("lines", Names::Prop),
    ("loading", Names::Prop),
    ("loadingText", Names::Prop),
    ("markLines", Names::Prop),
    ("matchesLabel", Names::Prop),
    ("onBeforeSelect", Names::Event),
    ("onExpand", Names::Event),
    ("onSelect", Names::Event),
    ("parse", Names::Prop),
    ("query", Names::Prop),
    ("quiet", Names::Prop),
    ("selectable", Names::Prop),
    ("selectedLines", Names::Prop),
    ("source", Names::Prop),
    ("timestamps", Names::Prop),
    ("wrap", Names::Prop),
];

/// What log-root computes for its parts, each read as `logRoot.x`.
pub const LOG_ROOT_COMPUTED: &[&str] = &[
    "blank",
    "busy",
    "digits",
    "droppedHidden",
    "droppedWords",
    "list",
    "named",
    "said",
    "scrolls",
];

/// What log-line reads and sends, by the name the machine binds.
pub const LOG_LINE: &[(&str, Names)] = &[
    ("at", Names::Prop),
    ("level", Names::Prop),
    ("levelWords", Names::Prop),
    ("lineLabel", Names::Prop),
    ("logRow", Names::Prop),
    ("timesLabel", Names::Prop),
];

/// What log-line computes for its parts, each read as `logLine.x`.
pub const LOG_LINE_COMPUTED: &[&str] = &[
    "unwrapped",
    "unnumbered",
    "count",
    "countHidden",
    "countWords",
    "debug",
    "error",
    "grouped",
    "levelHidden",
    "levelWords",
    "linked",
    "marked",
    "heard",
    "digits",
    "numberHidden",
    "numberName",
    "numberWords",
    "plainNumber",
    "pressNumber",
    "runs",
    "selected",
    "textHidden",
    "timeHidden",
    "timeWords",
    "warn",
    "written",
];

/// What log-group reads and sends, by the name the machine binds.
pub const LOG_GROUP: &[(&str, Names)] = &[
    ("duration", Names::Prop),
    ("heading", Names::Prop),
    ("logDrawn", Names::Prop),
    ("status", Names::Prop),
    ("statusLabel", Names::Prop),
];

/// What log-group computes for its parts, each read as `logGroup.x`.
pub const LOG_GROUP_COMPUTED: &[&str] = &[
    "frame",
    "digits",
    "heard",
    "durationHidden",
    "markIcon",
    "spokenHidden",
    "spokenWords",
    "statusHidden",
    "statusIcon",
];

/// What a feed of notifications reads and sends, by the name the machine binds.
pub const NOTIFICATIONS_ROOT: &[(&str, Names)] = &[
    ("arrivedLabel", Names::Prop),
    ("emptyText", Names::Prop),
    ("errorText", Names::Prop),
    ("fallbackLabel", Names::Prop),
    ("label", Names::Prop),
    ("loading", Names::Prop),
    ("loadingText", Names::Prop),
    ("onBeforeRead", Names::Event),
    ("onDismiss", Names::Event),
    ("onLoadMore", Names::Event),
    ("onRead", Names::Event),
    ("separation", Names::Prop),
    ("total", Names::Prop),
];

/// What a feed of notifications computes for its parts, each read as `notificationsRoot.x`.
pub const NOTIFICATIONS_ROOT_COMPUTED: &[&str] = &[
    "blank",
    "errorShown",
    "errorWords",
    "footerEmpty",
    "headerEmpty",
    "loadingShown",
    "marksAll",
    "named",
    "said",
];

/// What a notification reads and sends, by the name the machine binds.
pub const NOTIFICATION_ROW: &[(&str, Names)] = &[
    ("at", Names::Prop),
    ("defaultRead", Names::Prop),
    ("dismissLabel", Names::Prop),
    ("dismissible", Names::Prop),
    ("onBeforeRead", Names::Event),
    ("onDismiss", Names::Event),
    ("onRead", Names::Event),
    ("read", Names::Prop),
    ("separation", Names::Prop),
    ("unreadLabel", Names::Prop),
];

/// What a notification computes for its parts, each read as `notificationRow.x`.
pub const NOTIFICATION_ROW_COMPUTED: &[&str] = &[
    "actionsFilled",
    "dismissName",
    "gone",
    "heard",
    "last",
    "media",
    "stamped",
];

/// What a block of code reads and sends, by the name the machine binds.
pub const CODE_BLOCK: &[(&str, Names)] = &[
    ("addedLines", Names::Prop),
    ("codeLabel", Names::Prop),
    ("codeNameLabel", Names::Prop),
    ("collapseLabel", Names::Prop),
    ("contextLines", Names::Prop),
    ("copyLabel", Names::Prop),
    ("copyNameLabel", Names::Prop),
    ("diff", Names::Prop),
    ("expandLabel", Names::Prop),
    ("expandable", Names::Prop),
    ("file", Names::Prop),
    ("filesLabel", Names::Prop),
    ("hideUnchangedLabel", Names::Prop),
    ("highlight", Names::Prop),
    ("label", Names::Prop),
    ("language", Names::Prop),
    ("lineNumbers", Names::Prop),
    ("markLines", Names::Prop),
    ("noCopy", Names::Prop),
    ("removedLines", Names::Prop),
    ("showUnchangedLabel", Names::Prop),
    ("tokens", Names::Prop),
    ("variant", Names::Prop),
    ("wrap", Names::Prop),
    ("wrapLabel", Names::Prop),
    ("wrappable", Names::Prop),
    ("onBeforeChange", Names::Event),
    ("onBeforeCheck", Names::Event),
    ("onChange", Names::Event),
    ("onCheck", Names::Event),
];

/// What a block of code computes for its parts, each read as `codeBlock.x`.
pub const CODE_BLOCK_COMPUTED: &[&str] =
    &["expandHidden", "expandWords", "panes", "several", "tabs"];

/// What a group of notifications reads and sends, by the name the machine binds.
pub const NOTIFICATION_GROUP: &[(&str, Names)] = &[
    ("collapsible", Names::Prop),
    ("count", Names::Prop),
    ("label", Names::Prop),
];

/// What a group of notifications computes for its parts, each read as `notificationGroup.x`.
pub const NOTIFICATION_GROUP_COMPUTED: &[&str] = &["counted", "countWords"];

/// What a conversation reads and sends, by the name the machine binds.
pub const CHAT_ROOT: &[(&str, Names)] = &[
    ("arrivalLabel", Names::Prop),
    ("authorStyles", Names::Prop),
    ("failedLabel", Names::Prop),
    ("failedTurnLabel", Names::Prop),
    ("fallbackLabel", Names::Prop),
    ("history", Names::Prop),
    ("historyText", Names::Prop),
    ("label", Names::Prop),
    ("meLabel", Names::Prop),
    ("messageLabel", Names::Prop),
    ("onHistory", Names::Event),
    ("onSend", Names::Event),
    ("turnLabel", Names::Prop),
    ("turns", Names::Prop),
    ("typing", Names::Prop),
    ("typingLabel", Names::Prop),
];

/// What a carousel reads and sends, by the name the machine binds.
pub const CAROUSEL: &[(&str, Names)] = &[
    ("autoplay", Names::Prop),
    ("controls", Names::Prop),
    ("controlsPlacement", Names::Prop),
    ("defaultIndex", Names::Prop),
    ("fallbackLabel", Names::Prop),
    ("index", Names::Prop),
    ("indicatorLabel", Names::Prop),
    ("indicatorPlacement", Names::Prop),
    ("indicatorsLabel", Names::Prop),
    ("interval", Names::Prop),
    ("label", Names::Prop),
    ("loop", Names::Prop),
    ("nextLabel", Names::Prop),
    ("orientation", Names::Prop),
    ("perView", Names::Prop),
    ("previousLabel", Names::Prop),
    ("roleLabel", Names::Prop),
    ("slideLabel", Names::Prop),
    ("slideRoleLabel", Names::Prop),
    ("slidesPerMove", Names::Prop),
    ("startLabel", Names::Prop),
    ("stopLabel", Names::Prop),
    ("onActivate", Names::Event),
    ("onBeforeActivate", Names::Event),
];

/// What a carousel computes for its parts, each read as `carousel.x`.
pub const CAROUSEL_COMPUTED: &[&str] = &[
    "arrows",
    "atEnd",
    "atStart",
    "dotted",
    "dotsName",
    "named",
    "panes",
    "rotationIcon",
    "rotationName",
    "rotationFirst",
    "rotationLast",
    "spoken",
    "stops",
];

/// What a conversation computes for its parts, each read as `chatRoot.x`.
pub const CHAT_ROOT_COMPUTED: &[&str] = &[
    "actionsEmpty",
    "blank",
    "busy",
    "composerEmpty",
    "headerEmpty",
    "historyShown",
    "list",
    "loadingShown",
    "named",
    "said",
    "scrolls",
    "statusEmpty",
    "typingWords",
    "windowed",
];

/// What a turn in a conversation reads and sends, by the name the machine binds.
pub const CHAT_MESSAGE: &[(&str, Names)] = &[
    ("at", Names::Prop),
    ("author", Names::Prop),
    ("authorLabel", Names::Prop),
    ("failedLabel", Names::Prop),
    ("locale", Names::Prop),
    ("onSend", Names::Event),
    ("retryLabel", Names::Prop),
    ("sendingLabel", Names::Prop),
    ("state", Names::Prop),
];

/// What a turn in a conversation computes for its parts, each read as `chatMessage.x`.
pub const CHAT_MESSAGE_COMPUTED: &[&str] = &[
    "actionsEmpty",
    "attachmentsEmpty",
    "contentEmpty",
    "failed",
    "inline",
    "named",
    "reading",
    "sending",
    "sourcesEmpty",
    "waiting",
    "workEmpty",
];

/// What a field for writing a turn reads and sends, by the name the machine binds.
pub const CHAT_COMPOSER: &[(&str, Names)] = &[
    ("attached", Names::Prop),
    ("busy", Names::Prop),
    ("onSend", Names::Event),
    ("onStop", Names::Event),
    ("onTyping", Names::Event),
    ("placeholder", Names::Prop),
    ("placeholders", Names::Prop),
    ("queue", Names::Prop),
    ("sendDisabled", Names::Prop),
    ("sendLabel", Names::Prop),
    ("sendReason", Names::Prop),
    ("stopLabel", Names::Prop),
    ("submitOn", Names::Prop),
    ("typingTimeout", Names::Prop),
];

/// What a field for writing a turn computes for its parts, each read as `chatComposer.x`.
pub const CHAT_COMPOSER_COMPUTED: &[&str] = &[
    "attachmentsEmpty",
    "endEmpty",
    "idling",
    "mark",
    "sendHeld",
    "sendName",
    "shownPlaceholder",
    "startEmpty",
];

/// What tail reads and sends, by the name the machine binds.
pub const TAIL: &[(&str, Names)] = &[
    ("defaultPinned", Names::Prop),
    ("onBeforePin", Names::Event),
    ("onPin", Names::Event),
    ("pinned", Names::Prop),
    ("resume", Names::Part),
    ("threshold", Names::Prop),
];

/// What tail computes for its parts, each read as `tail.x`.
pub const TAIL_COMPUTED: &[&str] = &["following", "away"];

/// What an item computes for its parts, each read as `treeItem.x`. The element
/// around them computes `empty`, read as `treeRoot.empty`.
pub const COMPUTED: &[&str] = &[
    "branch",
    "checkable",
    "checkMark",
    "chevronEnd",
    "chevronLabel",
    "chevronStart",
    "dashMark",
    "grip",
    "heading",
    "leaf",
    "level",
    "linked",
    "nested",
    "place",
    "reserved",
    "subordinate",
];

/// What a table reads and sends, by the name the machine binds.
pub const TABLE: &[(&str, Names)] = &[
    ("columns", Names::Prop),
    ("defaultExpanded", Names::Prop),
    ("defaultSelected", Names::Prop),
    ("defaultSort", Names::Prop),
    ("expanded", Names::Prop),
    ("grid", Names::Prop),
    ("label", Names::Prop),
    ("loadMore", Names::Prop),
    ("onBeforeExpand", Names::Event),
    ("onBeforeReorder", Names::Event),
    ("onBeforeSelect", Names::Event),
    ("onBeforeSort", Names::Event),
    ("onExpand", Names::Event),
    ("onLoadMore", Names::Event),
    ("onReorder", Names::Event),
    ("onSelect", Names::Event),
    ("onSort", Names::Event),
    ("reorderable", Names::Prop),
    ("selectable", Names::Prop),
    ("selected", Names::Prop),
    ("selectionBehavior", Names::Prop),
    ("selectionMode", Names::Prop),
    ("sort", Names::Prop),
    ("windowed", Names::Prop),
];

/// What a table computes for its parts, each read as `tableRoot.x`.
pub const TABLE_COMPUTED: &[&str] = &["empty", "every", "heads", "nests", "rows", "waiting"];

/// What a row of a table reads, by the name the machine binds.
pub const TABLE_ROW: &[(&str, Names)] = &[
    ("disabled", Names::Prop),
    ("href", Names::Prop),
    ("parent", Names::Prop),
    ("value", Names::Prop),
];

/// What a row of a table computes for its parts, each read as `tableRow.x`.
pub const TABLE_ROW_COMPUTED: &[&str] = &[
    "branch",
    "cells",
    "grips",
    "gripStill",
    "nests",
    "selectable",
    "selectedCell",
];

/// What a column of a table reads and sends, by the name the machine binds.
pub const TABLE_COLUMN: &[(&str, Names)] = &[
    ("field", Names::Prop),
    ("onBeforeResize", Names::Event),
    ("onResized", Names::Event),
    ("resizable", Names::Prop),
    ("resizeLabel", Names::Prop),
    ("sortable", Names::Prop),
    ("textAlign", Names::Prop),
    ("width", Names::Prop),
    ("widthLabel", Names::Prop),
];

/// What a column of a table computes for its parts, each read as `tableColumn.x`.
pub const TABLE_COLUMN_COMPUTED: &[&str] = &["movable", "sorts", "still"];

/// One element's reading of a tree: each name it binds, by the machine's name
/// for it, and what the element computes.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct TreeChoice {
    /// What the machine binds, by its own name.
    pub bind: BTreeMap<String, String>,
    /// What the element computes, by the field's name.
    pub computed: BTreeMap<String, String>,
}

impl TreeChoice {
    /// Each name the element holds, and what it names, from `table`. What the
    /// element computes is its own, and names nothing.
    pub fn references<'a>(
        &'a self,
        table: &'static [(&'static str, Names)],
    ) -> Vec<(&'static str, &'a str, Names)> {
        table
            .iter()
            .filter_map(|(at, names)| self.bind.get(*at).map(|name| (*at, name.as_str(), *names)))
            .collect()
    }
}

/// Reads one element's fields, by the table of what it binds and whether it
/// computes.
fn read(
    lit: &Lit,
    feature: &str,
    table: &[(&str, Names)],
    computes: &[&str],
) -> Result<TreeChoice, String> {
    let mut choice = TreeChoice::default();
    for (key, name) in fields(lit, feature)? {
        if computes.contains(&key) {
            choice.computed.insert(key.to_owned(), name.to_owned());
        } else if table.iter().any(|(at, _)| *at == key) {
            choice.bind.insert(key.to_owned(), name.to_owned());
        } else {
            return Err(format!("{feature}: `{key}` is not a field it has"));
        }
    }
    Ok(choice)
}

/// `treeRoot({ ... })`, each field a name.
pub fn tree(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "treeRoot", TREE, &["empty"])
}

/// `treeItem({ ... })`, each field a name.
pub fn tree_item(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "treeItem", TREE_ITEM, COMPUTED)
}

/// `inspector({ ... })`, each field a name.
pub fn inspector(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "inspector", INSPECTOR, INSPECTOR_COMPUTED)
}

/// `tableRoot({ ... })`, each field a name.
pub fn table(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableRoot", TABLE, TABLE_COMPUTED)
}

/// `tableRow({ ... })`, each field a name.
pub fn table_row(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableRow", TABLE_ROW, TABLE_ROW_COMPUTED)
}

/// `tableColumn({ ... })`, each field a name.
pub fn table_column(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableColumn", TABLE_COLUMN, TABLE_COLUMN_COMPUTED)
}

/// `logRoot({ ... })`, each field a name.
pub fn log_root(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "logRoot", LOG_ROOT, LOG_ROOT_COMPUTED)
}

/// `logLine({ ... })`, each field a name.
pub fn log_line(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "logLine", LOG_LINE, LOG_LINE_COMPUTED)
}

/// `logGroup({ ... })`, each field a name.
pub fn log_group(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "logGroup", LOG_GROUP, LOG_GROUP_COMPUTED)
}

/// `carousel({ ... })`, each field a name.
pub fn carousel(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "carousel", CAROUSEL, CAROUSEL_COMPUTED)
}

/// `chatRoot({ ... })`, each field a name.
pub fn chat_root(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "chatRoot", CHAT_ROOT, CHAT_ROOT_COMPUTED)
}

/// `chatMessage({ ... })`, each field a name.
pub fn chat_message(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "chatMessage", CHAT_MESSAGE, CHAT_MESSAGE_COMPUTED)
}

/// `chatComposer({ ... })`, each field a name.
pub fn chat_composer(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "chatComposer", CHAT_COMPOSER, CHAT_COMPOSER_COMPUTED)
}

/// `tail({ ... })`, each field a name.
pub fn tail(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tail", TAIL, TAIL_COMPUTED)
}

/// `notificationsRoot({ ... })`, each field a name.
pub fn notifications_root(lit: &Lit) -> Result<TreeChoice, String> {
    read(
        lit,
        "notificationsRoot",
        NOTIFICATIONS_ROOT,
        NOTIFICATIONS_ROOT_COMPUTED,
    )
}

/// `notificationRow({ ... })`, each field a name.
pub fn notification_row(lit: &Lit) -> Result<TreeChoice, String> {
    read(
        lit,
        "notificationRow",
        NOTIFICATION_ROW,
        NOTIFICATION_ROW_COMPUTED,
    )
}

/// `codeBlock({ ... })`, each field a name.
pub fn code_block(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "codeBlock", CODE_BLOCK, CODE_BLOCK_COMPUTED)
}

/// `notificationGroup({ ... })`, each field a name.
pub fn notification_group(lit: &Lit) -> Result<TreeChoice, String> {
    read(
        lit,
        "notificationGroup",
        NOTIFICATION_GROUP,
        NOTIFICATION_GROUP_COMPUTED,
    )
}

/// A tree, an inspector, a part of a table, a part of a log, or a part of a feed, by the key its source writes it under.
pub(super) fn by_key(key: &str, value: &Lit) -> Result<TreeChoice, String> {
    match key {
        "treeRoot" => tree(value),
        "treeItem" => tree_item(value),
        "tableRoot" => table(value),
        "tableRow" => table_row(value),
        "tableColumn" => table_column(value),
        "logRoot" => log_root(value),
        "logLine" => log_line(value),
        "logGroup" => log_group(value),
        "tail" => tail(value),
        "notificationsRoot" => notifications_root(value),
        "notificationRow" => notification_row(value),
        "notificationGroup" => notification_group(value),
        "carousel" => carousel(value),
        "chatRoot" => chat_root(value),
        "chatMessage" => chat_message(value),
        "chatComposer" => chat_composer(value),
        "codeBlock" => code_block(value),
        _ => inspector(value),
    }
}
