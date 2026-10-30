/*
 * What the canvas events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** A side of a card, as JSON Canvas names it. */
type PasteSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * Where a move or a resize puts each card it carries, in the board's own
 * units.
 *
 * **One contract for both**, because what a controlled page does with either
 * is the same: write the geometry the detail says onto the cards it renders. A
 * resize says `width` and `height` as well, and moves `x` and `y` too when it
 * is dragged from a corner other than the bottom right.
 */
export interface MoveDetail {
  /**
   * Every card the gesture moves, the one the reader took hold of first.
   *
   * **A list, because a group carries what is inside it.** Dragging a group
   * moves its cards with it, which is what every board does, and a controlled
   * consumer who refuses the move has to write every position it would have
   * written, not only the one the pointer was on.
   */
  nodes: Array<{ name: string; x: number; y: number; width?: number; height?: number }>
}

/** Which two cards a reader asked to join, by name, and the side they started from. */
export interface ConnectDetail {
  from: string
  to: string
  /** The side the reader drew from, where they drew from one. */
  fromSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
  /** The side nearest where they let go, where they let go over a card. */
  toSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
}

/**
 * What a paste adds to a board: a JSON Canvas document whose ids the board
 * does not hold yet, its cards moved clear of the ones they were copied from.
 * The shape is the format's, which `fromJsonCanvas` reads.
 */
export interface PasteDetail {
  document: {
    edges?: Array<{
      color?: string | undefined
      fromEnd?: 'none' | 'arrow' | undefined
      fromNode: string
      fromSide?: PasteSide | undefined
      id: string
      label?: string | undefined
      path?: 'curve' | 'straight' | 'step' | undefined
      toEnd?: 'none' | 'arrow' | undefined
      toNode: string
      toSide?: PasteSide | undefined
    }>
    nodes?: Array<{
      background?: string | undefined
      backgroundStyle?: 'cover' | 'ratio' | 'repeat' | undefined
      color?: string | undefined
      file?: string | undefined
      height: number
      id: string
      label?: string | undefined
      subpath?: string | undefined
      text?: string | undefined
      type: 'text' | 'file' | 'link' | 'group'
      url?: string | undefined
      width: number
      x: number
      y: number
    }>
  }
}

/** Where a connection's ends are going, and where they were. */
export interface ReconnectDetail {
  /** The connection's name, where it has one. */
  name: string
  /** Its ends before, so a page that named none of its connections can find it. */
  was: { from: string; to: string }
  from: string
  to: string
  fromSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
  toSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
}

/** A label a reader rewrote on a board, and what it said before. */
export interface RelabelDetail {
  /** What was relabelled: a connection, or a group, whose name the board draws. */
  target: 'edge' | 'group'
  /** Its name on the board. */
  name: string
  /** A connection's ends, so a page that named none of its connections can find it. */
  from?: string | undefined
  to?: string | undefined
  /** The new label, empty for none. */
  label: string
  /** The label before. */
  was: string
}

/** What a reader asked to take off the board. */
export interface RemoveDetail {
  /** The cards, by name. */
  nodes: string[]
  /**
   * The connections, including every one attached to a card being removed,
   * since a line to nothing is not drawn but its element would stay behind.
   * Each carries its ends as well as its name, so a page that named none of
   * its connections can still find them.
   */
  edges: Array<{ name: string; from: string; to: string }>
}

/**
 * Where a board is looking: the point at the middle of the view, in the
 * document's own units, and how far it is zoomed.
 *
 * The middle rather than a corner, so a view saved in one box and restored in
 * a box of another size shows the same thing in the middle of it.
 */
export interface CanvasView {
  x: number
  y: number
  zoom: number
}
