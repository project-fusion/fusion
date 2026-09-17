import {
  closestInstance,
  customElement,
  drawIcon,
  HelixElement,
  HelixSelectEvent,
} from '@fusion.dev/helix-core'
import { list } from '@fusion.dev/helix-icons'
import { nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessVideoPlaylistItem } from '../item/video-playlist-item.js'
import { HelixHeadlessVideoPlaylist } from '../root/video-playlist-root.js'
import '../../menu/index.js'

/**
 * @summary The playlist's entries, as a menu inside the player's control bar.
 *
 * @description
 * The entries again, reachable without leaving the picture. A playlist beside
 * the player is a list a reader scrolls to; the same list in the control bar is
 * one they open over the video.
 *
 * **It is placed by the consumer, not rendered by the playlist**, and that is
 * forced rather than chosen: a shadow root cannot project into a sibling's
 * light DOM, so nothing the playlist renders can land inside the player's
 * control bar. What can is an element the consumer writes there, which is what
 * `Video`'s `controls` slot is for.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Episode Menu, Queue Menu, Up Next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @slot trigger - Replaces the button that opens the menu.
 *
 * @event {HelixSelectEvent} helix-select - Fired with the chosen entry's value. The playlist listens for it. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart entry - One entry in the menu.
 * @csspart entry-item - The row, which is an `<a>` where `href` is set.
 * @csspart entry-mark - The trailing mark: a tick when checked, a caret when it opens
 * @csspart entry-start - The leading column, which is a slot and is always there.
 * @csspart menu - The menu that holds the entries.
 * @csspart menu-back - The control that returns from a submenu.
 * @csspart menu-back-mark - The glyph on the back control of a submenu.
 * @csspart menu-empty - Shown when there are no items to show.
 * @csspart menu-header - The bar above a submenu, holding the way back and its name.
 * @csspart menu-loading - Shown while the items are still on their way.
 * @csspart menu-surface - The floating panel the menu is drawn on.
 * @csspart menu-title - The name of the submenu that is showing.
 * @csspart poster - An entry's still, where it has one.
 * @csspart trigger - The button that opens it.
 */
@customElement('helix-headless-video-playlist-menu')
export class HelixHeadlessVideoPlaylistMenu extends HelixElement {
  /**
   * The menu's accessible name, and its trigger's.
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
  placement = 'top-end'

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

  private readonly choose = (value: string): void => {
    this.dispatchEvent(new HelixSelectEvent({ value }))
  }

  protected override render(): TemplateResult {
    return this.renderMenu()
  }

  /** The menu itself, behind a method so a styled tier can render another one. */
  protected renderMenu(): TemplateResult {
    const active = this.playlist?.active
    return html`<${this.tag('menu')} part="menu"
    exportparts="back: menu-back, back-mark: menu-back-mark, empty: menu-empty, header: menu-header,
      loading: menu-loading, surface: menu-surface, title: menu-title" label=${this.label} placement=${this.placement}>
      <slot name="trigger" slot="trigger">
        <button part="trigger" type="button" aria-label=${this.label}>${drawIcon(list)}</button>
      </slot>
      ${this.entries.map(
        (entry) => html`<${this.tag('menu-item')}
          part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
          value=${entry.value}
          aria-checked=${entry.value === active ? 'true' : 'false'}
          ?disabled=${entry.disabled}
          role="menuitemradio"
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
