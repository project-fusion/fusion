//! The capabilities the native runtime provides, as the spec's layer 3 lists
//! them: the eleven wave 0 needs, and those later waves add.
//! The text of each `doc` becomes the interface's comment, so it says what a
//! caller gets, on every platform.

use super::{Capability, Member, Param, Ty};

const NODE: Param = Param {
    name: "node",
    ty: Ty::Node,
};

const DONE: Ty = Ty::Callback(&[], &Ty::Void);

/// Every contract, in the order the files are written.
pub const CAPABILITIES: &[Capability] = &[
    ANNOUNCE,
    CAMERA,
    CLIPBOARD,
    ENVIRONMENT,
    FILES,
    FOCUS,
    FORM,
    GESTURE,
    HAPTICS,
    KEYS,
    LOCALE,
    MEASURE,
    MOTION,
    OPEN_LINK,
    SCROLL,
    SHARE,
    TIMERS,
];

const ANNOUNCE: Capability = Capability {
    name: "announce",
    interface: "Announce",
    doc: "Says a message to a screen reader without moving its focus: through a live region on the web, and through the platform's announcement on iOS and Android.",
    members: &[Member {
        name: "say",
        doc: "Says `message`. A polite message waits until the reader has heard what is being said, and an assertive one interrupts it.",
        params: &[
            Param { name: "message", ty: Ty::Text },
            Param { name: "urgency", ty: Ty::Named("Urgency") },
        ],
        returns: Ty::Void,
    }],
};

const CAMERA: Capability = Capability {
    name: "camera",
    interface: "Camera",
    doc: "Takes a photo with the device's camera, or chooses photos from its library: through a file input that asks for an image on the web, and through expo-image-picker on iOS and Android. A device without a camera says so, and the server takes none.",
    members: &[
        Member {
            name: "capture",
            doc: "Opens the camera, and gives the photo taken, or why there is none. A browser without a camera offers its file chooser.",
            params: &[],
            returns: Ty::Promise(&Ty::Named("Picked")),
        },
        Member {
            name: "choose",
            doc: "Opens the photo library, and gives the photos chosen, one unless `multiple`, or why there are none.",
            params: &[Param { name: "multiple", ty: Ty::Boolean }],
            returns: Ty::Promise(&Ty::Named("Picked")),
        },
    ],
};

const CLIPBOARD: Capability = Capability {
    name: "clipboard",
    interface: "Clipboard",
    doc: "Puts text on the system clipboard: through the browser's clipboard on the web, and through expo-clipboard on iOS and Android. A platform that refuses the write says so, and the server writes nothing.",
    members: &[Member {
        name: "write",
        doc: "Puts `text` on the clipboard, and gives whether it is there.",
        params: &[Param { name: "text", ty: Ty::Text }],
        returns: Ty::Promise(&Ty::Boolean),
    }],
};

const ENVIRONMENT: Capability = Capability {
    name: "environment",
    interface: "Environment",
    doc: "Reads how the reader's system asks to be drawn: reduced motion, the color scheme, the direction, the text size, and the platform, with the window's size, its safe area, and whether a screen reader is on. On the server it answers what the request states, so the first render in the browser matches.",
    members: &[
        Member {
            name: "read",
            doc: "What the system says now.",
            params: &[],
            returns: Ty::Named("Conditions"),
        },
        Member {
            name: "observe",
            doc: "Calls `changed` with what the system says each time any of it changes, until stopped.",
            params: &[Param {
                name: "changed",
                ty: Ty::Callback(&[Param { name: "conditions", ty: Ty::Named("Conditions") }], &Ty::Void),
            }],
            returns: Ty::Stop,
        },
    ],
};

const FILES: Capability = Capability {
    name: "files",
    interface: "Files",
    doc: "Picks files from the device and saves a file to it: through the browser's file chooser and a download on the web, and through expo-document-picker, expo-file-system, and expo-sharing on iOS and Android. The server picks and saves nothing.",
    members: &[
        Member {
            name: "pick",
            doc: "Opens the file chooser with the types `options` accepts, and gives the files chosen, or why there are none.",
            params: &[Param { name: "options", ty: Ty::Named("FilePick") }],
            returns: Ty::Promise(&Ty::Named("Picked")),
        },
        Member {
            name: "save",
            doc: "Saves `file` under its name: as a download on the web, and through the share sheet on a phone, where Save to Files is one of its choices. Gives what became of it: `saved` on the web, and `opened` on a phone, whose sheet does not say whether you saved it.",
            params: &[Param { name: "file", ty: Ty::Named("FileSave") }],
            returns: Ty::Promise(&Ty::Named("Saved")),
        },
    ],
};

const FOCUS: Capability = Capability {
    name: "focus",
    interface: "Focus",
    doc: "Moves keyboard focus to a part and reads where it is. On iOS and Android it moves a screen reader's focus too, which cannot be read back, so restoring it there is a best effort.",
    members: &[
        Member {
            name: "focus",
            doc: "Moves focus to `node`. With `preventScroll`, nothing scrolls to show it.",
            params: &[NODE, Param { name: "preventScroll", ty: Ty::Boolean }],
            returns: Ty::Void,
        },
        Member {
            name: "focused",
            doc: "The part with keyboard focus, or `null` where none has it.",
            params: &[],
            returns: Ty::Maybe(&Ty::Node),
        },
    ],
};

const FORM: Capability = Capability {
    name: "form",
    interface: "Form",
    doc: "Hands a control's value and validity to the form around it, which the web reads through ElementInternals. On iOS and Android the app owns its forms, so it does nothing there.",
    members: &[
        Member {
            name: "value",
            doc: "Gives the form `value` as the control's value, or no value where it is `null`.",
            params: &[NODE, Param { name: "value", ty: Ty::Maybe(&Ty::Text) }],
            returns: Ty::Void,
        },
        Member {
            name: "validity",
            doc: "Gives the form the ways the value fails and the message a reader is told, pointing at `anchor` where the form reports them. No flags means nothing is wrong, and a value that fails has a message.",
            params: &[
                NODE,
                Param { name: "flags", ty: Ty::List(&Ty::Named("Flag")) },
                Param { name: "message", ty: Ty::Text },
                Param { name: "anchor", ty: Ty::Maybe(&Ty::Node) },
            ],
            returns: Ty::Void,
        },
        Member {
            name: "submit",
            doc: "Submits the form `node` belongs to, as Enter in a text field does.",
            params: &[NODE],
            returns: Ty::Void,
        },
    ],
};

const HAPTICS: Capability = Capability {
    name: "haptics",
    interface: "Haptics",
    doc: "Plays a touch on the device, such as a tick as a dragged row passes another. The web plays none, by design.",
    members: &[Member {
        name: "play",
        doc: "Plays the touch `kind` names.",
        params: &[Param { name: "kind", ty: Ty::Named("Haptic") }],
        returns: Ty::Void,
    }],
};

const HEARD_KEY: Param = Param {
    name: "heard",
    ty: Ty::Callback(
        &[Param {
            name: "press",
            ty: Ty::Named("KeyPress"),
        }],
        &Ty::Boolean,
    ),
};

const KEYS: Capability = Capability {
    name: "keys",
    interface: "Keys",
    doc: "Hears the keys pressed on a part with keyboard focus, or anywhere in the window that shows a part: `keydown` on the web, and a native module on iPad and Android, where React Native has no key events.",
    members: &[
        Member {
            name: "listen",
            doc: "Calls `heard` with each key pressed while `node` has focus, until stopped. Where `heard` answers `true`, the key is taken, and the platform does nothing else with it.",
            params: &[NODE, HEARD_KEY],
            returns: Ty::Stop,
        },
        Member {
            name: "listenAnywhere",
            doc: "Calls `heard` with each key pressed in the window that shows `node`, whatever part has focus, before that part hears it, until stopped. Where `heard` answers `true`, the key is taken: the part with focus does not hear it, and the platform does nothing else with it.",
            params: &[NODE, HEARD_KEY],
            returns: Ty::Stop,
        },
    ],
};

const LOCALE: Capability = Capability {
    name: "locale",
    interface: "Locale",
    doc: "The reader's locale, for the words registry and the formatters. On the server it answers what the request states. On native it also installs the Intl pieces Hermes lacks.",
    members: &[
        Member {
            name: "read",
            doc: "The locale, as a language tag such as `en-US`.",
            params: &[],
            returns: Ty::Text,
        },
        Member {
            name: "observe",
            doc: "Calls `changed` with the locale each time it changes, until stopped.",
            params: &[Param {
                name: "changed",
                ty: Ty::Callback(&[Param { name: "locale", ty: Ty::Text }], &Ty::Void),
            }],
            returns: Ty::Stop,
        },
    ],
};

const MEASURE: Capability = Capability {
    name: "measure",
    interface: "Measure",
    doc: "Reads a part's box, and hears when it changes.",
    members: &[
        Member {
            name: "box",
            doc: "The box `node` has, or `null` before it is laid out.",
            params: &[NODE],
            returns: Ty::Maybe(&Ty::Named("Rect")),
        },
        Member {
            name: "observe",
            doc:
                "Calls `changed` with the box `node` has each time its size changes, until stopped.",
            params: &[
                NODE,
                Param {
                    name: "changed",
                    ty: Ty::Callback(
                        &[Param {
                            name: "box",
                            ty: Ty::Named("Rect"),
                        }],
                        &Ty::Void,
                    ),
                },
            ],
            returns: Ty::Stop,
        },
    ],
};

const OPEN_LINK: Capability = Capability {
    name: "open-link",
    interface: "OpenLink",
    doc: "Follows a destination: as a link on the web, and through the app's router and then the system on iOS and Android.",
    members: &[Member {
        name: "open",
        doc: "Follows `destination`, a URL or a path.",
        params: &[Param { name: "destination", ty: Ty::Text }],
        returns: Ty::Void,
    }],
};

const SCROLL: Capability = Capability {
    name: "scroll",
    interface: "Scroll",
    doc: "Scrolls the parts that scroll: by a distance while a row is dragged near an edge, to an offset, the least that shows a part, and not at all while a layer holds the page. It tells where a part that scrolls stands, and when it comes to rest.",
    members: &[
        Member {
            name: "by",
            doc: "Scrolls `node` by `x` and `y` at once.",
            params: &[
                NODE,
                Param { name: "x", ty: Ty::Number },
                Param { name: "y", ty: Ty::Number },
            ],
            returns: Ty::Void,
        },
        Member {
            name: "to",
            doc: "Scrolls `node` to the offset `x` and `y`, gliding where `smooth` is `true` and at once otherwise.",
            params: &[
                NODE,
                Param { name: "x", ty: Ty::Number },
                Param { name: "y", ty: Ty::Number },
                Param { name: "smooth", ty: Ty::Boolean },
            ],
            returns: Ty::Void,
        },
        Member {
            name: "observe",
            doc: "Calls `changed` with where `node` stands each time it scrolls, and again with `settled` once it comes to rest, until stopped.",
            params: &[
                NODE,
                Param {
                    name: "changed",
                    ty: Ty::Callback(&[Param { name: "scrolled", ty: Ty::Named("Scrolled") }], &Ty::Void),
                },
            ],
            returns: Ty::Stop,
        },
        Member {
            name: "reveal",
            doc: "Scrolls whatever holds `node` the least that shows it.",
            params: &[NODE],
            returns: Ty::Void,
        },
        Member {
            name: "offset",
            doc: "How far `node` is scrolled along each axis.",
            params: &[NODE],
            returns: Ty::Named("Point"),
        },
        Member {
            name: "lock",
            doc: "Keeps the page or the screen from scrolling while `node`, the layer that holds it, is open, until stopped.",
            params: &[NODE],
            returns: Ty::Stop,
        },
    ],
};

const SHARE: Capability = Capability {
    name: "share",
    interface: "Share",
    doc: "Hands words, an address, or a file to the system share sheet: through the browser's share where it has one, and through React Native's share and expo-sharing on iOS and Android. A browser without a share sheet copies the address or the words to the clipboard, and the server shares nothing.",
    members: &[Member {
        name: "share",
        doc: "Opens the share sheet with `item`, and gives what became of it.",
        params: &[Param { name: "item", ty: Ty::Named("Shareable") }],
        returns: Ty::Promise(&Ty::Named("Shared")),
    }],
};

const TIMERS: Capability = Capability {
    name: "timers",
    interface: "Timers",
    doc: "Time for a host: the clock, the time of day, a timeout, a frame, and whether the page or the app is in front. A machine never reads the clock, so its host passes the time in with an event.",
    members: &[
        Member {
            name: "now",
            doc: "The time in milliseconds, from a clock that only moves forward.",
            params: &[],
            returns: Ty::Number,
        },
        Member {
            name: "wall",
            doc: "The time of day, in milliseconds since 1970 began in UTC, as `Date.now()` reads it. The system can set it back.",
            params: &[],
            returns: Ty::Number,
        },
        Member {
            name: "timeout",
            doc: "Calls `done` once `ms` milliseconds have passed, unless stopped first.",
            params: &[Param { name: "ms", ty: Ty::Number }, Param { name: "done", ty: DONE }],
            returns: Ty::Stop,
        },
        Member {
            name: "frame",
            doc: "Calls `done` with the frame's time before the next frame is drawn, unless stopped first.",
            params: &[Param {
                name: "done",
                ty: Ty::Callback(&[Param { name: "time", ty: Ty::Number }], &Ty::Void),
            }],
            returns: Ty::Stop,
        },
        Member {
            name: "visible",
            doc: "Whether the page or the app is in front.",
            params: &[],
            returns: Ty::Boolean,
        },
        Member {
            name: "observeVisible",
            doc: "Calls `changed` each time the page or the app comes to the front or leaves it, until stopped.",
            params: &[Param {
                name: "changed",
                ty: Ty::Callback(&[Param { name: "visible", ty: Ty::Boolean }], &Ty::Void),
            }],
            returns: Ty::Stop,
        },
    ],
};

const GESTURE: Capability = Capability {
    name: "gesture",
    interface: "Gesture",
    doc: "Hears a pointer drag a part. It tells only the moments a machine answers, and the part follows the pointer between them on the platform's own thread where it has one, so nothing that changes every frame reaches a machine.",
    members: &[Member {
        name: "drag",
        doc: "Calls `heard` as a pointer goes down on `node`, travels `setup.slop` from there in a straight line and lifts it, passes each of `setup.stops` along `setup.axis`, and lets go or is taken by the system, until stopped. While lifted, the part follows the pointer along the axis. A part has one drag at a time. A later `drag` of the same part replaces the setup and `heard` of the one before, and a press already down carries on into it and passes the later stops from where the pointer is. The stop of a drag that was replaced does nothing.",
        params: &[
            NODE,
            Param { name: "setup", ty: Ty::Named("DragSetup") },
            Param {
                name: "heard",
                ty: Ty::Callback(&[Param { name: "moved", ty: Ty::Named("Dragged") }], &Ty::Void),
            },
        ],
        returns: Ty::Stop,
    }],
};

const MOTION: Capability = Capability {
    name: "motion",
    interface: "Motion",
    doc: "Moves a part: at once, or along a transition that ends in a call back, on the platform's own thread where it has one. Where the reader asks for reduced motion, a glide arrives at once.",
    members: &[
        Member {
            name: "place",
            doc: "Draws `node` at `to` at once, ending any glide it is in without calling that glide back.",
            params: &[NODE, Param { name: "to", ty: Ty::Named("Frame") }],
            returns: Ty::Void,
        },
        Member {
            name: "glide",
            doc: "Moves `node` to `to` along `transition`, and calls `done` once it arrives, unless stopped first. A glide stopped, or replaced by another or by a place, leaves the part where it is drawn and never calls back. Where the reader asks for reduced motion, it arrives at once.",
            params: &[
                NODE,
                Param { name: "to", ty: Ty::Named("Frame") },
                Param { name: "transition", ty: Ty::Named("Transition") },
                Param { name: "done", ty: DONE },
            ],
            returns: Ty::Stop,
        },
    ],
};
