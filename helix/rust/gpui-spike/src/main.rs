//! Draws Acme's Button and Badge, written as Rust by `helix system gpui`
//! from `helix/cli/tests/fixtures/acme`, in a GPUI window.
//!
//! `cargo run` opens the window in light mode, and `cargo run -- dark` in
//! dark mode. Tab moves focus between the buttons, and a press prints the
//! button and how it was pressed.

mod acme;

use acme::badge::{Badge, BadgeTone};
use acme::button::{Button, ButtonEmphasis, ButtonHooks};
use acme::theme::{ActiveTheme as _, Theme};
use gpui::prelude::*;
use gpui::{
    actions, div, px, size, App, Bounds, Context, FocusHandle, KeyBinding, Window, WindowBounds,
    WindowOptions,
};
use gpui_platform::application;

actions!(spike, [Next, Previous]);

/// The window's one view: a row of buttons and a row of badges.
struct Spike {
    focus: FocusHandle,
}

impl Render for Spike {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme().clone();
        let press = |name: &'static str| {
            move |event: &acme::button::ButtonPressEvent, _: &mut Window, _: &mut App| {
                println!("pressed {name} with the {}", event.pointer_type);
            }
        };
        div()
            .id("spike")
            .track_focus(&self.focus)
            .on_action(cx.listener(|_, _: &Next, window, cx| window.focus_next(cx)))
            .on_action(cx.listener(|_, _: &Previous, window, cx| window.focus_prev(cx)))
            .size_full()
            .flex()
            .flex_col()
            .gap(px(24.))
            .p(px(32.))
            .bg(theme.color_background)
            .text_color(theme.color_ink)
            .child(
                div()
                    .flex()
                    .gap(px(12.))
                    .items_center()
                    .child(Button::new("save").on_press(press("Save")).child("Save"))
                    .child(
                        Button::new("cancel")
                            .emphasis(ButtonEmphasis::Outlined)
                            .on_press(press("Cancel"))
                            .child("Cancel"),
                    )
                    .child(
                        Button::new("square")
                            .hooks(ButtonHooks {
                                radius: Some(px(0.).into()),
                                ..Default::default()
                            })
                            .on_press(press("Square"))
                            .child("Square corners"),
                    )
                    .child(
                        Button::new("off")
                            .disabled(true)
                            .on_press(press("Disabled"))
                            .child("Disabled"),
                    ),
            )
            .child(
                div()
                    .flex()
                    .gap(px(16.))
                    .items_center()
                    .child(Badge::new("inbox").value("8").label("8 unread").child("Inbox"))
                    .child(
                        Badge::new("drafts")
                            .tone(BadgeTone::Neutral)
                            .value("New")
                            .label("New drafts")
                            .child("Drafts"),
                    ),
            )
    }
}

fn main() {
    let dark = std::env::args().any(|argument| argument == "dark");
    application().run(move |cx: &mut App| {
        let theme = if dark { Theme::dark(cx) } else { Theme::light(cx) };
        cx.set_global(theme);
        cx.bind_keys([
            KeyBinding::new("tab", Next, None),
            KeyBinding::new("shift-tab", Previous, None),
        ]);
        let bounds = Bounds::centered(None, size(px(640.), px(240.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(gpui::TitlebarOptions {
                    title: Some("Acme on GPUI".into()),
                    ..Default::default()
                }),
                ..Default::default()
            },
            |window, cx| {
                cx.new(|cx| {
                    let focus = cx.focus_handle();
                    window.focus(&focus, cx);
                    Spike { focus }
                })
            },
        )
        .expect("the window opens");
        cx.activate(true);
    });
}
