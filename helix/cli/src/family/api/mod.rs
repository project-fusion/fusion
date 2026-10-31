//! A family's API and part tree, read from its headless source, and held to
//! what the web element declares.
//!
//! **The manifest is the record until the source replaces the element.** The
//! web element is still written by hand, so a headless source that drops a
//! prop, invents a part or renames a slot would compile and say something the
//! element does not. [`parity`] compares the two in the manifest's own terms:
//! attributes, events, slots, parts and states.

mod clock;
mod collection;
mod collection_fields;
mod color;
pub mod computed;
mod copy;
mod countdown;
mod delay;
mod entry;
mod files;
mod fold;
mod host;
mod item;
mod members;
mod notices;
mod page;
mod parity;
mod range;
pub mod rendered;
mod scroll;
mod sections;
pub mod spelling;
mod stack;
mod toggle;
mod toggling;
mod toolbar;
mod total;
mod tour;
mod tree;
mod validation;

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::read::Lit;
use members::event;
use tree::node;
use tree_choice::table_column as column_of;

pub use clock::Clock;
pub use collection::{Collection, Names};
pub use color::{ColorChoice, ColorField};
pub use copy::Copy;
pub use countdown::{Countdown, Queue};
pub use delay::Delay;
pub use entry::TextEntry;
pub use files::FileChoice;
pub use fold::Fold;
pub use item::Item;
pub use members::{props, Event, Literal, Platform, Primitive, PropType, Tier};
pub use notices::{Notice, Notices};
pub use page::Page;
pub use parity::{exported, parity, parts};
pub use range::ValueRange;
pub use scroll::Scroll;
pub use sections::{Section, Sections};
pub use stack::Stack;
pub use toggle::Toggle;
pub use toolbar::Toolbar;
pub use total::Total;
pub use tour::{Stop, Tour};
pub use tree::{Attribute, Binding, NodeKind};
pub use tree_choice::{
    TreeChoice, INSPECTOR, LOG_GROUP, LOG_LINE, LOG_ROOT, TABLE, TABLE_COLUMN, TABLE_ROW, TAIL,
    TREE, TREE_ITEM,
};
pub use validation::Validation;
pub use window::WindowChoice;

/// What a family takes, sends, and sets, and how its elements find each other.
#[derive(Debug, Default, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Api {
    /// A tick on the time of day, and the derivation that says when what is
    /// drawn from it goes stale, as a relative time's.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clock: Option<Clock>,
    /// What the items that join this element share: the prop that holds the
    /// chosen one's value, the prop that seeds it, and the events a change
    /// sends.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection: Option<Collection>,
    /// A copy to the clipboard as its pressable that `copies` is pressed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub copy: Option<Copy>,
    /// A time the element spends once it is drawn, and the event it sends
    /// once the time is spent, as an announcement's `duration`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub countdown: Option<Countdown>,
    /// A wait the element starts as it is drawn, and the state that holds
    /// while it runs, as a loader waits out its `delay`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delay: Option<Delay>,
    /// The values the element computes from its props, by name: a function
    /// in core's derivations, `{ "derive": "<function>" }`, or a prop or a
    /// region, `{ "bind": "<name>" }`. A `bind()`, a `not()`, a `when()` and
    /// a state read one by its name, as they read a prop.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, Attribute>>")]
    #[schemars(default)]
    pub derived: BTreeMap<String, Attribute>,
    /// What the element holds where a reader types into it: the prop that
    /// holds the text, and the events an edit sends.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entry: Option<TextEntry>,
    pub events: Vec<Event>,
    /// What the element holds where a reader builds a color in it: the props
    /// that hold it, the events a move sends, and what it computes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<ColorChoice>,
    /// What a field that opens a color picker computes from its text.
    #[serde(rename = "colorField", skip_serializing_if = "Option::is_none")]
    pub color_field: Option<ColorField>,
    /// What the element holds where a reader picks files into it: the props
    /// that say which files it takes, the events a change sends, and the
    /// list of chosen files its rows are drawn from.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files: Option<FileChoice>,
    /// What the element reads and sends where it windows a long set of items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window: Option<WindowChoice>,
    /// What the element reads and sends where it holds the items of a tree.
    #[serde(rename = "treeRoot", skip_serializing_if = "Option::is_none")]
    pub tree: Option<TreeChoice>,
    /// What the element reads, sends, and computes where it is an item of a tree.
    #[serde(rename = "treeItem", skip_serializing_if = "Option::is_none")]
    pub tree_item: Option<TreeChoice>,
    /// What the element reads, sends, and computes where it shows a value as a
    /// tree of rows, as an object inspector.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inspector: Option<TreeChoice>,
    /// What the element reads, sends, and computes where it is a table.
    #[serde(rename = "tableRoot", skip_serializing_if = "Option::is_none")]
    pub table: Option<TreeChoice>,
    /// What the element reads and computes where it is a row of a table.
    #[serde(rename = "tableRow", skip_serializing_if = "Option::is_none")]
    pub table_row: Option<TreeChoice>,
    /// What the element reads, sends, and computes where it is a column of a table.
    #[serde(rename = "tableColumn", skip_serializing_if = "Option::is_none")]
    pub table_column: Option<TreeChoice>,
    /// What the element reads, sends, and computes where it is a log.
    #[serde(rename = "logRoot", skip_serializing_if = "Option::is_none")]
    pub log_root: Option<TreeChoice>,
    /// What the element reads and computes where it is a line of a log.
    #[serde(rename = "logLine", skip_serializing_if = "Option::is_none")]
    pub log_line: Option<TreeChoice>,
    /// What the element reads and computes where it is a step of a log.
    #[serde(rename = "logGroup", skip_serializing_if = "Option::is_none")]
    pub log_group: Option<TreeChoice>,
    /// What the element reads, sends, and computes where a box follows its
    /// newest content, as a log and a chat do.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tail: Option<TreeChoice>,
    /// The prop that says how many of the elements passed in are drawn, as an
    /// avatar group folds the people past its `max` into a count.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fold: Option<Fold>,
    /// What a screen reader hears of the host, as a box's `role` and `label`
    /// say it. A phone gives no group a role while it has no name.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, Attribute>>")]
    #[schemars(default)]
    pub host: BTreeMap<String, Attribute>,
    /// The collection this element joins as an item, and whether pressing it
    /// chooses it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item: Option<Item>,
    /// The message the element is in the `notices` around it, as a toast item
    /// in its region.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notice: Option<Notice>,
    /// The messages passed into the element, which it stacks and holds, as a
    /// toast's region holds its items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notices: Option<Notices>,
    /// The page the element follows as it scrolls, as an app header lifts off it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<Page>,
    /// `web` for an element only the web has, such as a skip link: a phone
    /// gets a component that draws nothing, and no native form of its own.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    pub props: Vec<Prop>,
    /// A turn the element waits for behind the queued elements of its kind
    /// before it, as a queued announcement does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue: Option<Queue>,
    /// What the element holds where a reader moves it along a track: the
    /// prop that holds the value, the props that bound and step it, and the
    /// events a move sends.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub range: Option<ValueRange>,
    /// A part that scrolls, the states the element is in as it stands, and
    /// the events it sends as it moves and comes to rest.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scroll: Option<Scroll>,
    /// The section of the page the element is, which an outline links to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<Section>,
    /// The sections of the page the element follows as it scrolls, as an
    /// outline marks the one being read.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sections: Option<Sections>,
    /// The stack of pages the element shows one at a time, whose rows hold
    /// pages of their own, as a drilldown's.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<Stack>,
    pub states: Vec<String>,
    /// The stop the element is of the tour around it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Stop>,
    /// What the element holds where it turns on and off: the prop that says
    /// whether it is checked, and the events a press sends.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toggle: Option<Toggle>,
    /// What a toolbar holds: the props that turn it and that stop its arrow
    /// keys at the ends. The controls inside it are one tab stop.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toolbar: Option<Toolbar>,
    /// A prop the element reads as the sum of a prop of the elements of
    /// another family passed into it, while it holds any of them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<Total>,
    /// The stops passed into the element, which it shows one at a time.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tour: Option<Tour>,
    /// What a form control's verdict reads: the prop that makes an answer
    /// required and the messages it shows.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation: Option<Validation>,
}

/// A prop, its type and its default, and the tier that declares it.
#[derive(Clone, Debug, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Prop {
    /// Whether the web element has it as an attribute.
    pub attribute: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<Literal>,
    pub name: String,
    /// `web` for a prop only the web element has.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    /// The tier that declares it.
    pub tier: Tier,
    /// What it holds.
    #[serde(rename = "type")]
    pub kind: PropType,
}

/// A node of the part tree.
#[derive(Debug, Serialize, JsonSchema, TS)]
pub struct Node {
    /// Literal values, or `{ "bind": "<prop>" }` for one a prop drives, by
    /// name. Each name and value is one the vocabulary allows.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, Attribute>>")]
    #[schemars(default)]
    pub attributes: BTreeMap<String, Attribute>,
    /// The nodes inside it, in order.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<Node>>")]
    #[schemars(default)]
    pub children: Vec<Node>,
    pub kind: NodeKind,
    /// The part it exposes, the region it is, or the prop a `when` reads.
    pub name: String,
}

impl Api {
    /// Whether it holds nothing, as on an element with no headless source.
    pub fn is_empty(&self) -> bool {
        self.clock.is_none()
            && self.collection.is_none()
            && self.copy.is_none()
            && self.derived.is_empty()
            && self.entry.is_none()
            && self.countdown.is_none()
            && self.delay.is_none()
            && self.events.is_empty()
            && self.color.is_none()
            && self.color_field.is_none()
            && self.files.is_none()
            && self.window.is_none()
            && self.tree.is_none()
            && self.tree_item.is_none()
            && self.inspector.is_none()
            && self.table.is_none()
            && self.table_row.is_none()
            && self.table_column.is_none()
            && self.log_root.is_none()
            && self.log_line.is_none()
            && self.log_group.is_none()
            && self.tail.is_none()
            && self.fold.is_none()
            && self.host.is_empty()
            && self.item.is_none()
            && self.notice.is_none()
            && self.notices.is_none()
            && self.page.is_none()
            && self.props.is_empty()
            && self.queue.is_none()
            && self.range.is_none()
            && self.scroll.is_none()
            && self.section.is_none()
            && self.sections.is_none()
            && self.stack.is_none()
            && self.states.is_empty()
            && self.stop.is_none()
            && self.toggle.is_none()
            && self.toolbar.is_none()
            && self.total.is_none()
            && self.tour.is_none()
            && self.validation.is_none()
    }
}

/// Attributes by their names.
type Attributes = BTreeMap<String, Attribute>;

/// What an element computes from its props, and what its host says.
fn derived_and_host(
    derived: Option<&Lit>,
    host: Option<&Lit>,
) -> Result<(Attributes, Attributes), String> {
    Ok((
        derived.map(host::computed).transpose()?.unwrap_or_default(),
        host.map(host::host).transpose()?.unwrap_or_default(),
    ))
}

/// A headless source, read.
#[derive(Debug)]
pub struct Headless {
    pub api: Api,
    pub name: String,
    pub tree: Vec<Node>,
}

/// The fields a headless source has.
const FIELDS: &[&str] = &[
    "clock",
    "collection",
    "copy",
    "countdown",
    "delay",
    "color",
    "colorField",
    "derived",
    "entry",
    "events",
    "files",
    "window",
    "treeRoot",
    "treeItem",
    "inspector",
    "tableRoot",
    "tableRow",
    "tableColumn",
    "logRoot",
    "logLine",
    "logGroup",
    "tail",
    "fold",
    "host",
    "item",
    "notice",
    "notices",
    "page",
    "platform",
    "props",
    "queue",
    "range",
    "scroll",
    "section",
    "sections",
    "stack",
    "states",
    "stop",
    "toggle",
    "toolbar",
    "total",
    "tour",
    "tree",
    "validation",
];

/// What an element reads where it is a log, a part of one, or a box that follows
/// its newest content, with nothing else of an `Api` set.
fn logged<'a>(field: &impl Fn(&str) -> Option<&'a Lit>) -> Result<Api, String> {
    Ok(Api {
        log_root: field("logRoot").map(tree_choice::log_root).transpose()?,
        log_line: field("logLine").map(tree_choice::log_line).transpose()?,
        log_group: field("logGroup").map(tree_choice::log_group).transpose()?,
        tail: field("tail").map(tree_choice::tail).transpose()?,
        ..Api::default()
    })
}

/// Reads a headless source in the compiler's own shape, which
/// [`rendered::rewrite`] writes from a `headless.tsx` and the compiler's
/// tests write directly.
///
/// # Errors
///
/// A sentence saying what in the source is not in the vocabulary.
pub fn headless(export: &Lit) -> Result<Headless, String> {
    let Lit::Call(helper, arguments) = export else {
        return Err("the default export is not a call to `headless()`".to_owned());
    };
    let [Lit::Text(name), Lit::Object(written)] = arguments.as_slice() else {
        return Err(format!("`{helper}()` takes a family's name and an object"));
    };
    let body = &spelled(written)?;
    if let Some((key, _)) = body.iter().find(|(key, _)| !FIELDS.contains(&key.as_str())) {
        return Err(format!("`{key}` is not a field a headless source has"));
    }
    let field = |key: &str| {
        body.iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value)
    };
    let array = |key: &str| -> Result<&[Lit], String> {
        match field(key) {
            None => Ok(&[]),
            Some(Lit::Array(items)) => Ok(items),
            Some(_) => Err(format!("`{key}` is an array")),
        }
    };
    let events = array("events")?
        .iter()
        .map(event)
        .collect::<Result<_, _>>()?;
    let props = props(array("props")?, Tier::Headless)?;
    let states = array("states")?
        .iter()
        .map(|state| match state {
            Lit::Text(state) => Ok(state.clone()),
            _ => Err("a state is a name".to_owned()),
        })
        .collect::<Result<_, _>>()?;
    let tree: Vec<Node> = array("tree")?.iter().map(node).collect::<Result<_, _>>()?;
    /* Where a node may stand, as a shape only inside a vector. */
    crate::family::vocabulary::tree(&tree)?;
    let collection = field("collection")
        .map(collection::collection)
        .transpose()?;
    let item = field("item").map(item::item).transpose()?;
    let toggle = field("toggle").map(toggle::toggle).transpose()?;
    let toolbar = field("toolbar").map(toolbar::toolbar).transpose()?;
    let countdown = field("countdown").map(countdown::countdown).transpose()?;
    let fold = field("fold").map(fold::fold).transpose()?;
    let page = field("page").map(page::page).transpose()?;
    let scroll = field("scroll").map(scroll::scroll).transpose()?;
    let section = field("section").map(sections::section).transpose()?;
    let sections = field("sections").map(sections::sections).transpose()?;
    let stack = field("stack").map(stack::stack).transpose()?;
    let validation = field("validation")
        .map(validation::validation)
        .transpose()?;
    let (derived, host) = derived_and_host(field("derived"), field("host"))?;
    let platform = platform_of(field("platform"))?;
    Ok(Headless {
        api: Api {
            clock: field("clock").map(clock::clock).transpose()?,
            collection,
            copy: field("copy").map(copy::copy).transpose()?,
            countdown,
            delay: field("delay").map(delay::delay).transpose()?,
            derived,
            entry: field("entry").map(entry::entry).transpose()?,
            events,
            color: field("color").map(color::color).transpose()?,
            color_field: field("colorField").map(color::color_field).transpose()?,
            files: field("files").map(files::files).transpose()?,
            window: field("window").map(window::window).transpose()?,
            tree: field("treeRoot").map(tree_choice::tree).transpose()?,
            tree_item: field("treeItem").map(tree_choice::tree_item).transpose()?,
            inspector: field("inspector").map(tree_choice::inspector).transpose()?,
            table: field("tableRoot").map(tree_choice::table).transpose()?,
            table_row: field("tableRow").map(tree_choice::table_row).transpose()?,
            table_column: field("tableColumn").map(column_of).transpose()?,
            fold,
            host,
            item,
            notice: field("notice").map(notices::notice).transpose()?,
            notices: field("notices").map(notices::notices).transpose()?,
            page,
            platform,
            props,
            queue: field("queue").map(countdown::queue).transpose()?,
            range: field("range").map(range::range).transpose()?,
            scroll,
            section,
            sections,
            stack,
            states,
            stop: field("stop").map(tour::stop).transpose()?,
            toggle,
            toolbar,
            total: field("total").map(total::total).transpose()?,
            tour: field("tour").map(tour::tour).transpose()?,
            validation,
            ..logged(&field)?
        },
        name: name.clone(),
        tree,
    })
}

/// The platform a source says it is only for, `'web'`, where it says one.
fn platform_of(written: Option<&Lit>) -> Result<Option<Platform>, String> {
    match written {
        None => Ok(None),
        Some(Lit::Text(platform)) if platform == "web" => Ok(Some(Platform::Web)),
        Some(_) => Err("`platform` is `'web'`".to_owned()),
    }
}

/// A headless source's fields with each feature in the intermediate form's
/// names, as [`spelling`] reads it.
fn spelled(written: &[(String, Lit)]) -> Result<Vec<(String, Lit)>, String> {
    written
        .iter()
        .map(|(key, value)| {
            Ok(spelling::feature(key, value)?.unwrap_or_else(|| (key.clone(), value.clone())))
        })
        .collect()
}

#[cfg(test)]
#[path = "headless_tests.rs"]
mod tests;
mod tree_choice;
mod window;
