import { headless, oneOf, Path, Pressable, Slot, Svg, Text, View } from '../../../render.js'

/**
 * Canvas Node's headless tier: one card on a board, placed in the
 * document's own coordinates, or a group, a box behind the cards it holds.
 *
 * **The board places the card**: on the web it writes the card's corner and
 * size in a sheet of the card's own, and on a phone it hands the card its
 * place on the plane, so the card's host is the box either way. The card
 * holds what the page passes in, and its description below it.
 *
 * **A diamond is drawn, not bordered**: the outline is a vector whose shape
 * fills the box, under what the card holds. **A group's name sits above its
 * box**, drawn by a pseudo-element on the web and by words of its own on a
 * phone.
 *
 * **A press on the card selects it**, through the board, as a tap on the
 * board does where the card is.
 *
 * **Read-only on a phone**: the points a connection is drawn from, the
 * corners a card is resized from, and the grip it is moved by are the web's,
 * drawn while a pointer or the focus is on an editable card. A phone draws
 * the card, its selection, and what a screen reader hears of it.
 *
 * **Held to `helix-canvas-node`.**
 */
export default headless('canvas-node', {
  props: {
    group: false,
    height: 0,
    label: '',
    name: '',
    readonly: false,
    shape: oneOf(['circle', 'diamond', 'pill', 'square']),
    tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    width: 0,
    x: 0,
    y: 0,
  },
  events: {},
  states: ['active', 'candidate', 'placed', 'selected', 'settled', 'target'],
  canvas: {
    groupName: 'groupName',
    named: 'named',
    outlined: 'outlined',
  },
  render: ({ canvas, props }) => (
    <>
      {canvas.outlined && (
        <Svg
          ariaHidden
          part="outline"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <Path
            d="M50 0 L100 50 L50 100 L0 50 Z"
            part="outline-shape"
            platform="native"
          />
        </Svg>
      )}
      <Pressable
        label={canvas.named}
        part="node"
        role={props.group ? 'group' : 'article'}
      >
        <Slot />
        <Slot name="description" />
      </Pressable>
      {props.group && (
        <View
          ariaHidden
          part="group-name"
          platform="native"
        >
          <Text part="group-name-words">{canvas.groupName}</Text>
        </View>
      )}
      {/* The web's points, grip, and corners, drawn on an editable card it
          points at or focuses. */}
      <View
        also={{ handle: true }}
        part="handle-top"
        platform="web"
      />
      <View
        also={{ handle: true }}
        part="handle-right"
        platform="web"
      />
      <View
        also={{ handle: true }}
        part="handle-bottom"
        platform="web"
      />
      <View
        also={{ handle: true }}
        part="handle-left"
        platform="web"
      />
      <View
        part="move"
        platform="web"
      />
      <View
        also={{ grip: true }}
        part="grip-top-left"
        platform="web"
      />
      <View
        also={{ grip: true }}
        part="grip-top-right"
        platform="web"
      />
      <View
        also={{ grip: true }}
        part="grip-bottom-right"
        platform="web"
      />
      <View
        also={{ grip: true }}
        part="grip-bottom-left"
        platform="web"
      />
    </>
  ),
})
