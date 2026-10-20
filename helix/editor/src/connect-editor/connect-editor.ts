import { type Command, type EditorState, Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'
import { adoptEditorSheet } from '../sheet/editor-sheet.js'
import {
  EDITOR_TOOLS,
  type EditorFormats,
  type EditorTool,
  formatsOf,
  setLink,
  toolCommands,
} from '../tools/tools.js'

/** What the frame tells a renderer, as the frame's settings stand. */
interface Settings {
  label: string
  placeholder: string
  readOnly: boolean
}

/** What the frame asks of a renderer. The headless tier's `EditorRenderer`, held to this by a spec. */
interface Renderer {
  focus?(): void
  run(tool: EditorTool, value?: string): boolean
  settings?(settings: Settings): void
  tools?(): readonly EditorTool[]
}

/** What the frame gives back. The headless tier's `EditorSink`. */
interface Sink {
  detach(): void
  formats(formats: EditorFormats): void
}

/**
 * The frame as the connector reads it: `helix-editor` or
 * `helix-headless-editor`. Its own types are the headless tier's, held to
 * these by a spec, so this package depends on no tier.
 */
interface Frame extends HTMLElement {
  attach(renderer: Renderer): Sink
}

const isFrame = (element: HTMLElement): element is Frame =>
  typeof (element as Partial<Frame>).attach === 'function'

/** What the bridge holds: the frame's settings, and whether a frame is connected. */
interface Bridge extends Settings {
  connected: boolean
}

const UNCONNECTED: Bridge = { connected: false, label: '', placeholder: '', readOnly: false }

/** The key the frame's plugin is found under. */
export const editorFrameKey = new PluginKey<Bridge>('helix-editor-frame')

/** Who hears each view's updates while it is connected. */
const listeners = new WeakMap<EditorView, (state: EditorState) => void>()

/** The words of an empty document, on its one empty block, or nothing. */
const placeholderOf = (state: EditorState, text: string): DecorationSet => {
  const { doc } = state
  const first = doc.firstChild
  if (text === '' || doc.childCount !== 1 || !first?.isTextblock || first.content.size > 0) {
    return DecorationSet.empty
  }
  return DecorationSet.create(doc, [
    Decoration.node(0, first.nodeSize, {
      class: 'helix-editor-placeholder',
      'data-placeholder': text,
    }),
  ])
}

/**
 * The plugin the frame speaks to the view through: it names the document for
 * a screen reader, makes it read-only, shows the placeholder, and hears every
 * update. `editorPlugins` includes it, so connecting changes nothing about
 * the view's plugins.
 *
 * **Included from the start where it can be**, because adding a plugin later
 * remakes every plugin's view, and a collaboration binding draws the whole
 * document again when its view is remade. `connectEditor` adds it only to a
 * view whose plugins were chosen without it.
 *
 * Every document carries `data-prose`, which the base layer draws its blocks
 * by. A document is a `textbox` that takes several lines while a frame is
 * connected, named by the frame's `label`.
 */
export const editorFrame = (): Plugin<Bridge> =>
  new Plugin<Bridge>({
    key: editorFrameKey,
    props: {
      attributes: (state): Record<string, string> => {
        const bridge = editorFrameKey.getState(state) ?? UNCONNECTED
        if (!bridge.connected) {
          return { 'data-prose': '' }
        }
        return {
          ...(bridge.label ? { 'aria-label': bridge.label } : {}),
          'aria-multiline': 'true',
          ...(bridge.placeholder ? { 'aria-placeholder': bridge.placeholder } : {}),
          ...(bridge.readOnly ? { 'aria-readonly': 'true' } : {}),
          'data-prose': '',
          role: 'textbox',
        }
      },
      decorations: (state) => {
        const bridge = editorFrameKey.getState(state)
        return bridge?.connected ? placeholderOf(state, bridge.placeholder) : DecorationSet.empty
      },
      editable: (state) => !editorFrameKey.getState(state)?.readOnly,
    },
    state: {
      apply: (tr, bridge) => (tr.getMeta(editorFrameKey) as Bridge | undefined) ?? bridge,
      init: () => UNCONNECTED,
    },
    view: () => ({
      update: (view) => listeners.get(view)?.(view.state),
    }),
  })

/** What a connection takes beyond the frame and the view. */
export interface ConnectEditorOptions {
  /**
   * The commands to run in place of Helix's, by tool, such as undo and redo
   * where y-prosemirror keeps the history. Pass the same to `editorPlugins`,
   * so the keys run them too.
   *
   * Each is also asked with no `dispatch` after every change, to know whether
   * its button can be pressed, and has to change nothing then: y-prosemirror's
   * `undoCommand` and `redoCommand`, and never its `undo` and `redo`, which
   * undo whenever they are called.
   */
  commands?: Partial<Record<EditorTool, Command>> | undefined
}

/** A connection, which is ended rather than left to leak. */
export interface EditorConnection {
  /** Stops answering the frame, detaches the view from it, and puts back what connecting changed. */
  disconnect(): void
}

/**
 * Connects an Editor frame to a ProseMirror view.
 *
 * The frame's toolbar runs its tools in the view and shows what holds at the
 * selection; the frame's `label`, `placeholder`, and `readonly` reach the
 * document; and the editor's rules are added to the page, so the document is
 * drawn in your tokens.
 *
 * The frame is `helix-editor` or `helix-headless-editor`, and the view's
 * schema is `editorSchema()` or one of your own: a tool whose node or mark
 * the schema lacks is left off the toolbar.
 */
export const connectEditor = (
  frame: HTMLElement,
  view: EditorView,
  options: ConnectEditorOptions = {},
): EditorConnection => {
  if (!isFrame(frame)) {
    throw new Error(
      `connectEditor: <${frame.localName}> is not an editor frame. Import @fusion.dev/helix/editor, and connect once the element is defined.`,
    )
  }
  const { schema } = view.state
  const commands = toolCommands(schema, options.commands)
  const runs = EDITOR_TOOLS.filter((tool) =>
    tool === 'link' ? schema.marks.link !== undefined : commands[tool] !== undefined,
  )
  const added = editorFrameKey.get(view.state) ? undefined : editorFrame()
  if (added) {
    view.updateState(view.state.reconfigure({ plugins: [...view.state.plugins, added] }))
  }
  adoptEditorSheet(view.root)

  let sink: Sink | undefined
  let told = ''
  const tell = (state: EditorState): void => {
    const formats = formatsOf(state, commands)
    const said = JSON.stringify(formats)
    if (sink && said !== told) {
      told = said
      sink.formats(formats)
    }
  }
  listeners.set(view, tell)

  sink = frame.attach({
    focus: () => view.focus(),
    run: (tool, value) => {
      if (view.isDestroyed) {
        return false
      }
      const command = tool === 'link' ? setLink(schema, value ?? '') : commands[tool]
      return command ? command(view.state, view.dispatch, view) : false
    },
    settings: (settings) => {
      if (!view.isDestroyed) {
        view.dispatch(
          view.state.tr
            .setMeta(editorFrameKey, { connected: true, ...settings } satisfies Bridge)
            .setMeta('addToHistory', false),
        )
      }
    },
    tools: () => runs,
  })
  tell(view.state)

  return {
    disconnect: () => {
      sink?.detach()
      sink = undefined
      listeners.delete(view)
      if (view.isDestroyed) {
        return
      }
      if (added) {
        view.updateState(
          view.state.reconfigure({
            plugins: view.state.plugins.filter((plugin) => plugin !== added),
          }),
        )
      } else {
        view.dispatch(
          view.state.tr.setMeta(editorFrameKey, UNCONNECTED).setMeta('addToHistory', false),
        )
      }
    },
  }
}
