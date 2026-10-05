import {
  closestInstance,
  customElement,
  drawIcon,
  HelixElement,
  HelixSelectEvent,
  type Placement,
} from '@fusion.dev/helix-core'
import { list } from '@fusion.dev/helix-icons'
import { nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessVideoPlaylistItem } from '../item/video-playlist-item.js'
import { HelixHeadlessVideoPlaylist } from '../root/video-playlist-root.js'
import '../../menu/index.js'

/**
 * @summary The playlist's entries, as a menu inside the player's control bar.
 *
 * @description
 * Opens the playlist entries from the player's control bar, over the video.
 *
 * **You place the menu yourself**, in `Video`'s `controls` slot. A shadow root
 * cannot project into a sibling's light DOM, so the playlist cannot render into
 * the player's control bar.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Episode Menu, Queue Menu, Up Next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @slot trigger - Replaces the button that opens the menu.
 *
 * @event {HelixSelectEvent} helix-select - An entry was chosen. The event carries its value, and the playlist listens for it. Cancelable: cancel it to keep the current entry.
 *
 * @csspart entry - One entry in the menu.
 * @csspart entry-end - The column at the end of an entry, which holds its shortcut. It is always present.
 * @csspart entry-item - The entry's row. It is an `<a>` when `href` is set.
 * @csspart entry-mark - The mark at the end of an entry: a check mark when it is checked, or a caret when it opens a submenu.
 * @csspart entry-shortcut - The key drawn for an entry's shortcut. The playlist's entries set none.
 * @csspart entry-shortcut-kbd - The key inside `entry-shortcut`.
 * @csspart entry-shortcut-key - One key of an entry's shortcut chord, inside `entry-shortcut`. The playlist's entries set none.
 * @csspart entry-shortcut-separator - The `+` between two keys of an entry's shortcut, where the platform writes one.
 * @csspart entry-start - The column at the start of an entry. It is a slot and is always present.
 * @csspart menu - The menu that holds the entries.
 * @csspart menu-back - The button that goes back from a submenu.
 * @csspart menu-back-mark - The icon on a submenu's back button.
 * @csspart menu-empty - Shown when there are no items to show.
 * @csspart menu-header - The bar above a submenu, holding the back button and the submenu's name.
 * @csspart menu-live - The inner menu's `live` part, the region screen readers announce its empty and loading messages from.
 * @csspart menu-loading - Shown while the items are loading.
 * @csspart menu-surface - The floating panel the menu is drawn on.
 * @csspart menu-title - The name of the submenu that is shown.
 * @csspart poster - An entry's poster image, if it has one.
 * @csspart trigger - The button that opens the menu.
 */
@customElement('helix-headless-video-playlist-menu')
export class HelixHeadlessVideoPlaylistMenu extends HelixElement {
  /**
   * The name of the menu and its trigger, read by screen readers.
   *
   * "Episodes" suits a series and is wrong for a set of camera angles, and the
   * component cannot know which one it is in.
   */
  @property()
  label = 'Episodes'

  /**
   * Where the menu opens relative to its trigger.
   *
   * `top-end` because a control bar sits at the foot of the picture, and a menu
   * opening downward from there opens off the player.
   */
  @property()
  placement: Placement = 'top-end'

  /** Whether the menu is open, for the built-in trigger to say so. */
  @state()
  private open = false

  /**
   * Notes the menu opening and closing, for the built-in trigger.
   *
   * The trigger is this element's own button, so the state is written onto it
   * here. The menu cannot write onto a plain button slotted into it.
   */
  private readonly heardToggle = (event: Event): void => {
    if (event.target === event.currentTarget) {
      this.open = (event as Event & { newState?: string }).newState === 'open'
    }
  }

  private observer: MutationObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    /* After the first update, because the playlist is found by walking the tree
       and the server has no tree to walk. */
    this.updateComplete.then(() => this.watch())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-before-open', this.reread)
    this.observer?.disconnect()
    this.observer = undefined
  }

  /* Resolved once, on the client, and never during a render.
   *
   * `closestInstance` walks `parentNode` and steps across a `ShadowRoot` by
   * following its `host`, and the server has no `ShadowRoot` global, so
   * reaching for it inside `render` throws
   * `ReferenceError: Can't find variable: ShadowRoot` from inside Lit's own
   * result collector. A component that walks the tree to render cannot render
   * on a server, and the server has no tree to walk anyway. Set after the first
   * update, and `undefined` on the server, where an empty menu is the honest
   * output. */
  private foundPlaylist: HelixHeadlessVideoPlaylist | undefined

  /** The playlist this menu belongs to, found upward through the slots. */
  private get playlist(): HelixHeadlessVideoPlaylist | undefined {
    return this.foundPlaylist
  }

  /**
   * The playlist's entries, in the order it holds them.
   *
   * By identity rather than by tag, the same reason the playlist itself reads
   * them that way: a tag list names one tier's element from the other's package
   * and misses any third one.
   */
  private get entries(): HelixHeadlessVideoPlaylistItem[] {
    const playlist = this.playlist
    return playlist
      ? [...playlist.querySelectorAll('*')].filter(
          (one): one is HelixHeadlessVideoPlaylistItem =>
            one instanceof HelixHeadlessVideoPlaylistItem,
        )
      : []
  }

  /**
   * Watches the playlist for entries arriving, and re-reads it on every open.
   *
   * Two signals rather than one, because the two facts change on different
   * clocks and only one of them is observable.
   *
   * **Which entries exist** is the playlist's light DOM, and a `MutationObserver`
   * sees it directly.
   *
   * **Which entry is current** is `active`, a property with no attribute, so
   * there is nothing to observe: events travel up from the playlist and this
   * element is below it, and mirroring `active` to a `data-` name is ruled out
   * on its own merits, `active` being a payload rather than a boolean fact. A
   * `data-active` on every host is what `tree-root.ssr.spec.ts` fails on.
   *
   * So it is re-read at the moment it is looked at. `helix-before-open` comes from the
   * menu in this element's own shadow root, which is the one direction events
   * do arrive from, and a closed menu showing a stale mark is a thing nobody
   * can see.
   */
  private watch(): void {
    this.foundPlaylist ??= closestInstance(this, HelixHeadlessVideoPlaylist) ?? undefined
    const playlist = this.playlist
    if (!playlist || this.observer) {
      return
    }
    this.addEventListener('helix-before-open', this.reread)
    this.observer = new MutationObserver(this.reread)
    this.observer.observe(playlist, { childList: true, subtree: true })
    this.reread()
  }

  /* `requestUpdate` rather than a counter held in `@state`.
   *
   * The entries are the playlist's light DOM rather than this element's, so
   * nothing about them schedules an update here: an entry added, removed, or
   * made current changes a tree this element only looks at. A bumped `@state`
   * field is the usual way to say "render again", and here it would be a field
   * nothing reads, which the linter is right to call out. */
  private readonly reread = (): void => {
    this.requestUpdate()
  }

  /**
   * Keeps each choice row's tick where this element puts it.
   *
   * A choice row checks itself after `helix-before-toggle`, and this element
   * already sets `checked` on every row from its own state. The request is
   * refused, so a tick moves only when the choice is applied, and stopped, so
   * it does not reach a page that never placed the row.
   */
  private readonly keepTick = (event: Event): void => {
    if (event.target === event.currentTarget) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  private readonly choose = (value: string): void => {
    this.dispatchEvent(new HelixSelectEvent({ value }))
  }

  protected override render(): TemplateResult {
    return this.renderMenu()
  }

  /** The menu itself, behind a method so a styled tier can render another one. */
  protected renderMenu(): TemplateResult {
    return html`<${this.tag('menu')} part="menu"
    exportparts="back: menu-back, back-mark: menu-back-mark, empty: menu-empty, header: menu-header,
      live: menu-live, loading: menu-loading, surface: menu-surface, title: menu-title" label=${this.label} placement=${this.placement}
      @toggle=${this.heardToggle}>
      <slot name="trigger" slot="trigger">
        <button
          part="trigger"
          type="button"
          aria-label=${this.label}
          aria-haspopup="menu"
          aria-expanded=${this.open ? 'true' : 'false'}
        >${drawIcon(list)}</button>
      </slot>
      ${this.entries.map(
        (entry) => html`<${this.tag('menu-item')}
          part="entry"
      exportparts="end: entry-end, item: entry-item, mark: entry-mark, shortcut: entry-shortcut,
        shortcut-kbd: entry-shortcut-kbd, shortcut-key: entry-shortcut-key,
        shortcut-separator: entry-shortcut-separator, start: entry-start"
          value=${entry.value}
          checkable
          ?checked=${entry.current}
          ?disabled=${entry.disabled}
          exclusive
          @helix-before-toggle=${this.keepTick}
          @helix-select=${(event: Event) => {
            /* Stopped and re-announced from the host rather than let through.
               What travels up is then this element's own event, so a consumer
               listening on the menu sees what the playlist sees, and
               `preventDefault()` refuses the selection in one place. */
            event.stopPropagation()
            this.choose(entry.value)
          }}
        >
          ${
            /* The still, where there is one: a reader picks an episode by
               recognizing it faster than by reading its title, and this menu
               opens over the picture where reading is hardest.
             *
             * In `start`, which is free: `Menu.Item` renders its tick *after*
             * the label as `part="mark"`, so the leading column has nothing to
             * collide with. `alt=""`, because the name is in the same row and a
             * still repeating it is the same thing said twice.
             *
             * Omitted rather than empty where there is no poster, an `<img>`
             * with no `src` being a broken-image glyph in every engine. */
            entry.poster === ''
              ? nothing
              : html`<img alt="" part="poster" slot="start" src=${entry.poster} />`
          }
          ${entry.text}
        </${this.tag('menu-item')}>`,
      )}
    </${this.tag('menu')}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-video-playlist-menu': HelixHeadlessVideoPlaylistMenu
  }
}
