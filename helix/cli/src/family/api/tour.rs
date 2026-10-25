//! How a guided tour holds its stops, and how one stop stands in it, as a
//! tour holds the stops passed into it.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// The stops passed into the element, which it shows one at a time.
///
/// **Its stops are the elements drawn inside it whose source declares a
/// `stop`**, in the order they were first drawn. It moves among them as
/// `index` says, asks `before` first, tells `moves` once a move stands, and
/// ends with `completes` on the last.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Tour {
    /// The event its stops send as a control of theirs is pressed, which it
    /// answers by moving on, going back, or ending.
    pub asks: String,
    /// The prop that holds the label of each stop's way back.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub back: Option<String>,
    /// The cancelable event a move sends first, its `value` the new index.
    pub before: String,
    /// The event sent once the last stop is finished.
    pub completes: String,
    /// The prop that holds the label of the last stop's way on.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub done: Option<String>,
    /// The prop that holds the index of the stop shown.
    pub index: String,
    /// The prop that seeds the index where nothing else writes one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The value it computes, whether the spotlight lights a target.
    pub lit: String,
    /// The event sent once a move stands, its `value` the new index.
    pub moves: String,
    /// The prop that holds the label of each stop's way on.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
    /// The prop that says what a press outside the stop and its target does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outside: Option<String>,
    /// The prop that holds the room around a target inside the spotlight.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub padding: Option<String>,
    /// The prop that holds each stop's place in words, `{index} of {count}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub place: Option<String>,
    /// The state that holds while a stop's `effect` settles.
    pub preparing: String,
    /// The prop that draws each stop's place as well as saying it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<String>,
    /// The event sent as it waits, is skipped, or is completed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reports: Option<String>,
    /// The prop that holds the label of each stop's way out.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skip: Option<String>,
    /// The start of the names of the four lengths it computes for the lit
    /// box: `-x`, `-y`, `-width`, and `-height`.
    pub spot: String,
    /// The value it computes, whether a stop with nothing to light shows.
    pub veiled: String,
    /// The state that holds while a `wait` stop waits for its target.
    pub waiting: String,
    /// The names of what it computes, made as it is read.
    #[serde(skip)]
    #[schemars(skip)]
    #[ts(skip)]
    pub(crate) computes: Vec<String>,
}

/// The four lengths of the lit box, after the tour's `spot`.
const SPOT: [&str; 4] = ["x", "y", "width", "height"];

impl Tour {
    /// What an element's tour and its place in one compute, as a `bind()`
    /// reads them.
    pub fn of(api: &super::Api) -> impl Iterator<Item = &str> {
        let tour = api.tour.iter().flat_map(Self::computed);
        tour.chain(api.stop.iter().flat_map(Stop::computed))
    }

    /// What the tour computes: whether it lights a target, whether it shows
    /// a stop over its backdrop, and the lit box's lengths.
    pub fn computed(&self) -> impl Iterator<Item = &str> {
        self.computes.iter().map(String::as_str)
    }

    fn named(mut self) -> Self {
        let mut computes = vec![self.lit.clone(), self.veiled.clone()];
        computes.extend(SPOT.iter().map(|one| format!("{}-{one}", self.spot)));
        self.computes = computes;
        self
    }

    /// Each name the tour holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut found = vec![
            ("asks", self.asks.as_str(), Names::Event),
            ("before", self.before.as_str(), Names::Event),
            ("completes", self.completes.as_str(), Names::Event),
            ("index", self.index.as_str(), Names::Prop),
            ("moves", self.moves.as_str(), Names::Event),
            ("preparing", self.preparing.as_str(), Names::State),
            ("waiting", self.waiting.as_str(), Names::State),
        ];
        for (at, name, names) in [
            ("back", &self.back, Names::Prop),
            ("done", &self.done, Names::Prop),
            ("initial", &self.initial, Names::Prop),
            ("next", &self.next, Names::Prop),
            ("outside", &self.outside, Names::Prop),
            ("padding", &self.padding, Names::Prop),
            ("place", &self.place, Names::Prop),
            ("progress", &self.progress, Names::Prop),
            ("reports", &self.reports, Names::Event),
            ("skip", &self.skip, Names::Prop),
        ] {
            if let Some(name) = name {
                found.push((at, name.as_str(), names));
            }
        }
        found
    }
}

/// One stop of the tour around it: its target, its controls, and what it
/// computes from its place in the tour.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Stop {
    /// The event a press on one of its controls sends, `what` it asks.
    pub asks: String,
    /// The part whose press goes back.
    pub back: String,
    /// The value it computes, whether its place is drawn.
    pub counted: String,
    /// The prop the tour writes while the stop is shown.
    pub current: String,
    /// The prop that holds what runs as the tour reaches it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effect: Option<String>,
    /// The prop the tour writes on its first stop.
    pub first: String,
    /// The prop the tour writes on its last stop.
    pub last: String,
    /// The value it computes, the words its panel is named by.
    pub name: String,
    /// The part whose press goes on.
    pub next: String,
    /// The value it computes, its place in words, such as "2 of 5".
    pub place: String,
    /// The value it computes, how far its panel stands from its target.
    pub reach: String,
    /// The value it computes, the words said as it shows.
    pub said: String,
    /// The value it computes, whether its panel shows.
    pub shown: String,
    /// The part whose press ends the tour.
    pub skip: String,
    /// The prop that holds the id of what it points at.
    pub target: String,
    /// The prop that says what kind of stop it is.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    pub kind: Option<String>,
    /// The start of the names of the words its controls say: `back-`,
    /// `next-`, and `skip-` before it.
    pub words: String,
    /// The names of what it computes, made as it is read.
    #[serde(skip)]
    #[schemars(skip)]
    #[ts(skip)]
    pub(crate) computes: Vec<String>,
}

impl Stop {
    /// What the stop computes from its place in the tour.
    pub fn computed(&self) -> impl Iterator<Item = &str> {
        self.computes.iter().map(String::as_str)
    }

    fn named(mut self) -> Self {
        let mut computes = vec![
            self.counted.clone(),
            self.name.clone(),
            self.place.clone(),
            self.reach.clone(),
            self.said.clone(),
            self.shown.clone(),
        ];
        computes.extend(["back", "next", "skip"].map(|one| format!("{one}-{}", self.words)));
        self.computes = computes;
        self
    }

    /// Each name the stop holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut found = vec![
            ("asks", self.asks.as_str(), Names::Event),
            ("back", self.back.as_str(), Names::Part),
            ("current", self.current.as_str(), Names::Prop),
            ("first", self.first.as_str(), Names::Prop),
            ("last", self.last.as_str(), Names::Prop),
            ("next", self.next.as_str(), Names::Part),
            ("skip", self.skip.as_str(), Names::Part),
            ("target", self.target.as_str(), Names::Prop),
        ];
        for (at, name) in [("effect", &self.effect), ("type", &self.kind)] {
            if let Some(name) = name {
                found.push((at, name.as_str(), Names::Prop));
            }
        }
        found
    }
}

/// `tour({ asks, before, completes, index, lit, moves, preparing, spot,
/// veiled, waiting, ... })`, each field a name.
pub fn tour(lit: &Lit) -> Result<Tour, String> {
    let mut tour = Tour::default();
    for (key, name) in fields(lit, "tour")? {
        let named = Some(name.to_owned());
        let field = match key {
            "asks" => &mut tour.asks,
            "before" => &mut tour.before,
            "completes" => &mut tour.completes,
            "index" => &mut tour.index,
            "lit" => &mut tour.lit,
            "moves" => &mut tour.moves,
            "preparing" => &mut tour.preparing,
            "spot" => &mut tour.spot,
            "veiled" => &mut tour.veiled,
            "waiting" => &mut tour.waiting,
            key => {
                let optional = match key {
                    "back" => &mut tour.back,
                    "done" => &mut tour.done,
                    "initial" => &mut tour.initial,
                    "next" => &mut tour.next,
                    "outside" => &mut tour.outside,
                    "padding" => &mut tour.padding,
                    "place" => &mut tour.place,
                    "progress" => &mut tour.progress,
                    "reports" => &mut tour.reports,
                    "skip" => &mut tour.skip,
                    key => return Err(format!("tour: `{key}` is not a field it has")),
                };
                *optional = named;
                continue;
            }
        };
        name.clone_into(field);
    }
    let required = [
        ("asks", &tour.asks),
        ("before", &tour.before),
        ("completes", &tour.completes),
        ("index", &tour.index),
        ("lit", &tour.lit),
        ("moves", &tour.moves),
        ("preparing", &tour.preparing),
        ("spot", &tour.spot),
        ("veiled", &tour.veiled),
        ("waiting", &tour.waiting),
    ];
    if let Some((key, _)) = required.iter().find(|(_, name)| name.is_empty()) {
        return Err(format!("tour: a tour names its `{key}`"));
    }
    Ok(tour.named())
}

/// `stop({ asks, back, counted, current, first, last, name, next, place,
/// reach, said, shown, skip, target, words, effect?, type? })`, each field a
/// name.
pub fn stop(lit: &Lit) -> Result<Stop, String> {
    let mut stop = Stop::default();
    for (key, name) in fields(lit, "stop")? {
        let field = match key {
            "asks" => &mut stop.asks,
            "back" => &mut stop.back,
            "counted" => &mut stop.counted,
            "current" => &mut stop.current,
            "first" => &mut stop.first,
            "last" => &mut stop.last,
            "name" => &mut stop.name,
            "next" => &mut stop.next,
            "place" => &mut stop.place,
            "reach" => &mut stop.reach,
            "said" => &mut stop.said,
            "shown" => &mut stop.shown,
            "skip" => &mut stop.skip,
            "target" => &mut stop.target,
            "words" => &mut stop.words,
            "effect" => {
                stop.effect = Some(name.to_owned());
                continue;
            }
            "type" => {
                stop.kind = Some(name.to_owned());
                continue;
            }
            key => return Err(format!("stop: `{key}` is not a field it has")),
        };
        name.clone_into(field);
    }
    let required = [
        ("asks", &stop.asks),
        ("back", &stop.back),
        ("counted", &stop.counted),
        ("current", &stop.current),
        ("first", &stop.first),
        ("last", &stop.last),
        ("name", &stop.name),
        ("next", &stop.next),
        ("place", &stop.place),
        ("reach", &stop.reach),
        ("said", &stop.said),
        ("shown", &stop.shown),
        ("skip", &stop.skip),
        ("target", &stop.target),
        ("words", &stop.words),
    ];
    if let Some((key, _)) = required.iter().find(|(_, name)| name.is_empty()) {
        return Err(format!("stop: a stop names its `{key}`"));
    }
    Ok(stop.named())
}

#[cfg(test)]
#[path = "tour_tests.rs"]
mod tests;
