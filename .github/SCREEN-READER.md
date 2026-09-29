# The screen reader pass

Helix is tested in Chromium by specs and by pixel baselines, and neither one
checks what a screen reader says. This script is for a person running
VoiceOver, on the families whose purpose is to be operable without sight:

- Map
- Dialog
- Combobox and Select
- Data Table
- Tabs
- Input
- Menu
- Toast

Each step says what to do and what you should hear, as the code defines it. The
pass is recorded as a document, the way the pixel baselines are recorded as
images.

A person runs it because VoiceOver runs on macOS only, needs Full Disk Access
to be driven by a program, and the CI runners are Linux.

## When to run it

- **A family, when a change touches its roles, names, keys, or announcements.**
  A recorded pass stays current for a family until then.
- **The whole script, before anyone writes an accessibility conformance
  report** or answers a procurement question about screen readers. The report
  cites the record.

## Setting up

1. Start the examples: `bun run serve:examples`. Each example opens as a page of
   its own, with nothing on it but the component, at
   `http://127.0.0.1:4180/<family>/<example>`. The index at
   `http://127.0.0.1:4180/` lists every one.
2. Use Safari, which is the browser VoiceOver is built with. In Safari's
   settings, under Advanced, turn on **Press Tab to highlight each item on a
   webpage**. Without it, Tab skips buttons.
3. Turn VoiceOver on with **Command-F5**. The caption panel shows each thing
   VoiceOver says, and the record copies its words.

In the keys below, **VO** is Control-Option.

| Keys | What they do |
| --- | --- |
| Tab, Shift-Tab | Move focus to the next or previous control |
| VO-Right, VO-Left | Move the VoiceOver cursor to the next or previous item, focusable or not |
| VO-Space | Press the item under the VoiceOver cursor |
| VO-Shift-Down, VO-Shift-Up | Go into a group, a table or a list, and come back out |
| VO-U | Open the rotor, which lists the page's headings, links, form controls, and landmarks |
| Control | Stop VoiceOver speaking |

Where a step says **Expect**, the words may differ from VoiceOver's own
phrasing, and the facts may not: a name, a role and a state are either spoken
or missing. Record what you heard, word for word, and mark the step **Pass** or
**Fail**.

## Gaps already measured

Chromium's accessibility tree was read for each family before this script was
written. These steps are expected to fail until the components change, and they
are marked **Gap** in the steps below. Record what VoiceOver says anyway, since
the tree is what VoiceOver reads and a gap may sound worse or better than it
reads.

- **A field with a message is never called invalid.** Input, Select,
  and Combobox describe their control with the message, and the control itself
  reports `invalid: false`. The message is heard as though it were help text.
- **A select's button does not say what is chosen.** Its name is the field's
  label alone, and the choice it shows is in no name or value.
- **The menu's button does not say it opens a menu.** It reports collapsed and
  expanded, and no popup.
- **A map says nothing when it moves.** Panning, zooming, and turning change the
  picture and speak nothing.
- **A data table says nothing when it sorts or when rows are chosen.** The
  column's sort state changes, and nothing is announced.
- **A persistent dialog cannot be closed from the keyboard.** Escape is refused
  and its buttons have no command.

## Map

**M1. The frame.** Open `/map/events`. Press Tab.
Expect "City map", and that it is a group.

**M2. Moving the map.** With focus on the map, press Right Arrow, then Plus.
Expect the grid on screen to move and then grow.
**Gap:** nothing is spoken.

**M3. The controls.** Press Tab four times, and expect these in order:

1. "Fill the screen", a button that says it is not pressed
2. "Zoom in", a button
3. "Zoom out", a button
4. "Face north", a button

Press Shift-Tab to return, and VO-Right over the controls. Expect them to be
inside a group named "Map controls".

**M4. The places.** Open `/map/route-with-stops`, which needs a network
connection for its tiles. Press Tab until focus reaches a place.
Expect "Texas Capitol, passed", a button.
Press Down Arrow three times.
Expect "Barbecue restaurant, passed", then "Rainey Street", then "Congress
Avenue Bridge". Press Down Arrow once more and expect "Texas Capitol, passed"
again, since the walk wraps. Press Home and End and expect the first and last
place.

**M5. What is drawn on the map.** VO-Right through the map from its start.
Expect a list named "Map layers" holding "Walking route, From the Capitol to the
Congress Avenue Bridge", and an image named "Your location".

**M6. A live position.** In Safari's console, run:

```js
document.querySelector('helix-map-position').description = 'Arrived at Rainey Street'
```

Expect "Arrived at Rainey Street" to be spoken without focus moving. Run it
again with a different sentence straight away, and expect it to wait: a
position's words are spoken at most once every five seconds.

**M7. Places that share a spot.** Open `/map/clusters` and zoom out with Minus
until places gather. Tab to a gathered place.
Expect the names it holds joined into one, for example "Hotel and Hotel café",
as a button. Press Enter and expect the places to spread out or the map to zoom
in. If they spread out, press Escape and expect focus back on the gathered
place.

## Dialog

**D1. Opening.** Open `/dialog/small`. Tab to "Open dialog" and press Enter.
Expect "Archive project?" and that it is a dialog, and focus on its first
button, "Archive project".

**D2. Staying inside.** Press Tab three times.
Expect focus to move between "Archive project" and "Cancel" and never reach
the page behind the dialog.

**D3. Closing.** Press Escape.
Expect the dialog to close and focus to return to "Open dialog".

**D4. A dialog that refuses.** Open `/dialog/persistent`, where the dialog
opens with the page. Press Escape. Expect the dialog to stay open.
**Gap:** nothing on the keyboard closes it. Reload the page to leave.

## Combobox

**C1. The field.** Open `/combobox/preview`. Press Tab.
Expect "Language", a combo box, then "Type to narrow the list".

**C2. Narrowing.** Type `ru`.
Expect the list to open, the field to say it is expanded, the choices to narrow
to Ruby and Rust, and "Ruby" to be read as the highlighted choice. Press Down
Arrow and expect "Rust".

**C3. Nothing left.** Type `zz`, so the field reads `ruzz`.
Expect "No matches" to be spoken.

**C4. Choosing.** Select the field's text with Command-A, delete it, and type
`ty`. Expect "TypeScript" as the highlighted choice. Press Enter.
Expect the list to close, the field to say it is collapsed, and "TypeScript" to
be its value. Press Escape and expect nothing to change.

**C5. A field with a message.** Open `/combobox/invalid`. Press Tab.
Expect "Region", then "That region is not available on your plan".
**Gap:** it is not called invalid.

## Select

**S1. The trigger.** Open `/select/preview`. Press Tab.
Expect "Language", a pop-up button, its choice "Spanish", then "Used for
emails and notifications".
**Gap:** "Spanish" is shown and may not be spoken.

**S2. Opening.** Press Down Arrow.
Expect the list to open with "Spanish" as the current choice.

**S3. Moving is choosing.** Press Down Arrow once.
Expect "French" to be chosen, the list to close, and focus to return to the
trigger, which now says "French". This is how a single select behaves here:
each arrow in the open list chooses.

**S4. A field with a message.** Open `/select/invalid`. Press Tab.
Expect "Region", then "That region is not available on your plan".
**Gap:** it is not called invalid.

## Data Table

**T1. The table.** Open `/data-table/preview`. VO-Right until the table is
reached, then VO-Shift-Down to go into it.
Expect "Files", a table, and its count of rows and columns if VoiceOver gives
one. Move through the cells with VO-Right and expect each to be read with its
column's heading.

**T2. Sorting.** Tab to the "Name" heading.
Expect "Name", a button, and that the column is sorted ascending. Press Enter.
Expect the column to say it is sorted descending. Press Enter again and expect
it to be unsorted.
**Gap:** no sentence says the table has been sorted.

**T3. Choosing rows.** Open `/data-table/selecting-and-arranging`. Press Tab.
Expect "Select every row", a checkbox that is partly checked, since one row
starts chosen. Tab past the headings' controls to the first row's box.
Expect "Select asset-001.webp", a checkbox, not checked. Press Space and
expect it to be checked.
**Gap:** no sentence says how many rows are chosen.

**T4. Pages.** Tab to the page buttons under the table.
Expect a navigation landmark named "Pagination", with "Previous page", "Page
1", "Page 2", and "Next page", and "Page 1" as the current page. Press Enter on
"Page 2" and expect "Page 2" to be spoken.

**T5. Moving and sizing a column.** Tab to "Move File" and press Right Arrow.
Expect the File column to move one place. Tab to "Resize File", a separator
that says its width in pixels, and press Right Arrow. Expect the width to grow
by 16 pixels.

## Tabs

**B1. The tabs.** Open `/tabs/preview`. Press Tab.
Expect "Overview", a tab, selected, 1 of 2, inside a tab group named
"Project".

**B2. Moving.** Press Right Arrow.
Expect "Activity", selected, 2 of 2, and its panel to show. Press Right Arrow
again and expect "Overview", since the tabs wrap.

**B3. The panel.** Press Tab.
Expect a tab panel named "Overview", and VO-Right to read "A summary of the
project and the people on it."

## Input

**I1. A required field.** Open `/input/required`. Press Tab.
Expect "Email", an edit text that is required, then "We only use this to
reply". The asterisk after the label is drawn and should not be spoken; record
"star" if it is.

**I2. Submitting it empty.** Tab to "Submit" and press Enter.
Expect focus to return to "Email" and the browser's message for an empty
required field to be spoken.
**Gap:** it is not called invalid.

**I3. Showing a password.** Open `/input/reveal`. Press Tab twice.
Expect "Show password", a button that says it is not pressed. Press Space.
Expect it to say it is pressed, and the field to show "hunter2".

## Menu

**N1. The trigger.** Open `/menu/preview`. Press Tab.
Expect "View options", a button, collapsed.
**Gap:** it does not say it opens a menu.

**N2. Opening.** Press Enter.
Expect a menu named "View options", and focus on "Sort by", which says it has
a submenu.

**N3. Moving.** Press Down Arrow twice.
Expect "Show hidden files", checked, then "Show file extensions", not checked.
Press Down Arrow again and expect "Sort by", since the menu wraps.

**N4. The submenu.** On "Sort by", press Right Arrow.
Expect "Name", checked. Press Left Arrow and expect focus back on "Sort by".

**N5. Closing.** Press Escape.
Expect the menu to close and focus to return to "View options", collapsed.

## Toast

**O1. The region.** Open `/toast/preview`. VO-Right until the toasts are
reached.
Expect "Notifications", then "Success", "Project saved.", "Dismiss", then
"Error", "Could not reach the server.", "Retry", "Dismiss".

**O2. A toast that arrives.** In Safari's console, run:

```js
document.querySelector('helix-toast').insertAdjacentHTML(
  'beforeend',
  '<helix-toast-item tone="warning">Storage is almost full.</helix-toast-item>',
)
```

Expect "Warning, Storage is almost full." to be spoken without focus moving,
after what VoiceOver was already saying.

**O3. Dismissing.** Tab to the first "Dismiss" and press Space.
Expect the toast to go. Note where focus lands. The component does not move it.

## Recording a pass

Write the record to `fusion/docs/screen-reader/<date>.md`, named by the date
of the pass, for example `2026-09-29.md`:

```md
# Screen reader pass, September 29, 2026

- Helix: 0.109.0 (the version in `helix/styled/package.json`)
- macOS: 26.0
- Safari: 26.0
- Families: all, or the ones this pass covered

| Step | Result | Heard |
| --- | --- | --- |
| M1 | Pass | "City map, group" |
| M2 | Gap | Nothing |
```

Every step gets a row, and a skipped step says why. A failure that is not in
the gaps above gets an issue, and the record names it.
