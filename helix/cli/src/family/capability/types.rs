//! The data the capability contracts pass, as structs, so the TypeScript is
//! generated from one definition like the intermediate form's.

#![allow(dead_code)]

use serde::Serialize;
use ts_rs::TS;

use crate::family::ir::Direction;

/// A part's box in its viewport's coordinates, as `getBoundingClientRect`
/// gives it on the web and on React Native's element nodes.
#[derive(Serialize, TS)]
pub struct Rect {
    height: f64,
    width: f64,
    x: f64,
    y: f64,
}

/// A point, or a distance along both axes.
#[derive(Serialize, TS)]
pub struct Point {
    x: f64,
    y: f64,
}

/// Whether a part that scrolls stands at each end of one axis: at its
/// start, and at its end, with nothing more past it.
#[derive(Serialize, TS)]
pub struct Ends {
    end: bool,
    start: bool,
}

/// Where a part that scrolls stands: how far it is scrolled, whether it is
/// at each end of each axis, and whether it has come to rest.
#[derive(Serialize, TS)]
pub struct Scrolled {
    offset: Point,
    /// Whether the scroll has come to rest, as the web's `scrollend` says.
    settled: bool,
    x: Ends,
    y: Ends,
}

/// How soon a screen reader says a message: after what it is saying, or at
/// once.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Urgency {
    Assertive,
    Polite,
}

/// A touch the device plays. The web has none, by design.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Haptic {
    Cancel,
    Drop,
    Lift,
    Notify,
    Pass,
    Select,
}

/// Whether the reader's system is set to light or dark.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum ColorScheme {
    Dark,
    Light,
}

/// Where the components run.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Android,
    Ios,
    Server,
    Web,
}

/// A width and a height, in CSS pixels on the web and points on a phone.
#[derive(Serialize, TS)]
pub struct Size {
    height: f64,
    width: f64,
}

/// How far in from each edge of the window the content stays clear of the
/// device's notch, rounded corners, and system bars.
#[derive(Serialize, TS)]
pub struct Insets {
    bottom: f64,
    left: f64,
    right: f64,
    top: f64,
}

/// What the reader's system says about how to draw: what the environment
/// capability reads.
#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct Conditions {
    color_scheme: ColorScheme,
    direction: Direction,
    /// The reader's text size, as a multiple of the default.
    font_scale: f64,
    /// The safe area's distance from each edge of the window.
    insets: Insets,
    platform: Platform,
    reduced_motion: bool,
    /// Whether a screen reader is on. The web cannot tell, and says `false`.
    screen_reader: bool,
    /// The size of the window the app is drawn in.
    window: Size,
}

/// A key pressed on a part with keyboard focus, with the modifiers held.
#[allow(clippy::struct_excessive_bools)]
#[derive(Serialize, TS)]
pub struct KeyPress {
    alt: bool,
    /// Whether something nearer the key took it first, as the web's
    /// `defaultPrevented` says, so a host leaves it alone.
    claimed: bool,
    control: bool,
    /// The key's value, as the web's `KeyboardEvent.key` names it.
    key: String,
    meta: bool,
    /// Whether the key is held down and repeating.
    repeat: bool,
    shift: bool,
}

/// One way a value fails, as the web's validity flags name it.
#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub enum Flag {
    BadInput,
    CustomError,
    PatternMismatch,
    RangeOverflow,
    RangeUnderflow,
    StepMismatch,
    TooLong,
    TooShort,
    TypeMismatch,
    ValueMissing,
}

/// Where a part is drawn, and how far it shows: each field a motion moves,
/// and none it leaves as it is.
#[derive(Serialize, TS)]
#[ts(optional_fields)]
pub struct Frame {
    height: Option<f64>,
    opacity: Option<f64>,
    width: Option<f64>,
    /// Across, from where the part's place is.
    x: Option<f64>,
    /// Down, from where the part's place is.
    y: Option<f64>,
}

/// How a motion runs: its length in milliseconds and its curve, as the motion
/// tokens name them.
#[derive(Serialize, TS)]
pub struct Transition {
    duration: f64,
    easing: Easing,
}

/// A motion's curve, by the name its token has.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Easing {
    Accelerate,
    Decelerate,
    Emphasized,
    Linear,
    Spring,
    Standard,
}

/// The line a drag follows.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Axis {
    X,
    Y,
}

/// What a drag listens for: the line it follows, how far a pointer travels
/// from where it went down, in a straight line, before it lifts the part, and
/// the places along the line where passing one is told.
#[derive(Serialize, TS)]
pub struct DragSetup {
    axis: Axis,
    slop: f64,
    /// Positions along the axis, in screen coordinates, in order.
    stops: Vec<f64>,
}

/// One moment of a drag.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum DragKind {
    /// The pointer went down on the part.
    Down,
    /// It traveled past the slop, and the part lifted to follow it.
    Lift,
    /// It passed one of the stops.
    Pass,
    /// It let go.
    Drop,
    /// The system took the gesture, or the drag stopped otherwise.
    Cancel,
}

/// A moment of a drag, with where the pointer was.
#[derive(Serialize, TS)]
pub struct Dragged {
    /// The pointer's position along the axis, in screen coordinates.
    at: f64,
    kind: DragKind,
    /// The pointer's identity, the same for every moment of one drag.
    pointer: f64,
    x: f64,
    y: f64,
}

/// A file the platform hands over: its name, its media type, its size in
/// bytes, and the address it is read from, an object URL on the web and a
/// file URI on a phone.
#[derive(Serialize, TS)]
pub struct DeviceFile {
    name: String,
    /// Its size in bytes, or 0 where the platform does not say.
    size: f64,
    /// Its media type, such as `image/jpeg`, or empty where the platform does
    /// not say.
    #[serde(rename = "type")]
    kind: String,
    uri: String,
}

/// Which files a file chooser offers, and whether it takes more than one.
#[derive(Serialize, TS)]
pub struct FilePick {
    /// Media types such as `image/*` and extensions such as `.pdf`, or none
    /// for any file.
    accept: Vec<String>,
    multiple: bool,
}

/// A file to save: the name it is saved under, its media type, and the
/// address its content is read from, a `data:` URL, an object URL, a web
/// address, or a file URI on a phone.
#[derive(Serialize, TS)]
pub struct FileSave {
    name: String,
    #[serde(rename = "type")]
    kind: String,
    uri: String,
}

/// What became of a request for files: they were chosen, the reader closed
/// the chooser, the reader or the system refused the permission it needs,
/// or the device cannot do it.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Outcome {
    Chosen,
    Dismissed,
    Refused,
    Unavailable,
}

/// The files a chooser gave, in the order chosen, and what became of the
/// request. Only a request that is `chosen` gives files.
#[derive(Serialize, TS)]
pub struct Picked {
    files: Vec<DeviceFile>,
    outcome: Outcome,
}

/// What the share sheet is handed: words, an address, a file, or several of
/// them, and a title for the sheet where the platform shows one.
#[derive(Serialize, TS)]
#[ts(optional_fields)]
pub struct Shareable {
    file: Option<DeviceFile>,
    text: Option<String>,
    title: Option<String>,
    url: Option<String>,
}

/// What became of a share: the sheet took it, the sheet opened and the
/// platform does not say whether it took it, the clipboard took the address
/// or the words where there is no sheet, the reader closed the sheet, or the
/// platform can share nothing.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Shared {
    Copied,
    Dismissed,
    /// The sheet opened and closed, and the platform does not say whether
    /// it took the item, as `expo-sharing`'s does not.
    Opened,
    /// The sheet took it.
    #[serde(rename = "shared")]
    Taken,
    Unavailable,
}

/// What became of a save: the platform took the file, the sheet a phone
/// saves through opened and the platform does not say whether it took it, or
/// the platform cannot save it.
#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Saved {
    /// The sheet opened and closed, and the platform does not say whether
    /// it took the file, as `expo-sharing`'s does not.
    Opened,
    /// The platform took the file, as a browser's download does.
    #[serde(rename = "saved")]
    Taken,
    Unavailable,
}
