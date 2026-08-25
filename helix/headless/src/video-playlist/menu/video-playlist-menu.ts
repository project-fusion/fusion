import {
  closestInstance,
  customElement,
  drawIcon,
  HelixElement,
  HelixSelectEvent,
} from '@helix-io/core'
import { list } from '@helix-io/icons'
import { nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessVideoPlaylistItem } from '../item/video-playlist-item.js'
import { HelixHeadlessVideoPlaylist } from '../root/video-playlist-root.js'
import '../../menu/index.js'

const ITEMS = 'helix-video-playlist-item, helix-headless-video-playlist-item'

/**
 * @summary The playlist's entries, as a menu inside the player's control bar.
 *
 * @description
 * The entries again, reachable without leaving the picture. A playlist beside
 * the player is a list a reader scrolls to; the same list in the control bar is
 * one they open over the video, which is what a full-screen player has and what
 * a phone has room for.
 *
 * **It is placed by the consumer, not rendered by the playlist**, and that is
 * forced rather than chosen. A shadow root cannot project into a sibling's
 * light DOM, so nothing the playlist renders can land inside the player's
 * control bar. What can is an element the consumer writes there, which is what
 * `Video`'s `controls` slot is for:
 *
 * ```html
 * <helix-video-playlist>
 *   <helix-video slot="player" controls>
 *     <helix-video-playlist-menu slot="controls"></helix-video-playlist-menu>
 *   </helix-video>
 *   <helix-video-playlist-item value="one" src="/one.mp4">One</helix-video-playlist-item>
 * </helix-video-playlist>
 * ```
 *
 * So it finds its playlist upward rather than being handed one, and that chain
 * crosses a shadow boundary in the ordinary arrangement, which is why it is
 * `closestInstance` and not `closest`.
 *
 * **Choosing dispatches `helix-select`, the same event an entry dispatches.**
 * It never writes `active` on the playlist, which looks like the shorter path
 * and would latch the controlled contract: a playlist assigned `active` once
 * goes quiet and waits for a consumer who was never there. Announcing is what
 * an entry does, the playlist already listens for it, and a consumer refusing a
 * selection gets `preventDefault()` on one event rather than two paths that
 * behave differently.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Episode Menu, Queue Menu, Up Next
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @csspart entry - One entry in the menu.
 * @csspart icon - The glyph on the trigger.
 * @csspart poster - An entry's still, where it has one.
 * @csspart menu - The menu that holds the entries.
 * @csspart trigger - The button that opens it.
 * @csspart entry-item - The row, which is an `<a>` where `href` is set.
 * @csspart entry-mark - The trailing mark: a tick when checked, a caret when it opens
 * @csspart entry-start - The leading column, which is a slot and is always there.
 * @csspart menu-back - The control that returns from a submenu.
 * @csspart menu-back-mark - The glyph on the back control of a submenu.
 * @csspart menu-header - The bar above a submenu, holding the way back and its name.
 * @csspart menu-title - The name of the submenu that is showing.
 * @csspart menu-surface - The floating panel the menu is drawn on.
 * @csspart menu-empty - Shown when there are no items to show.
 * @csspart menu-loading - Shown while the items are still on their way.
 *
 * @slot trigger - Replaces the button that opens the menu.
 *
 * @event {HelixSelectEvent} helix-select - Fired with the chosen entry's value. The playlist listens for it.
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

  #observer: MutationObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    /* After the first update, because the playlist is found by walking the tree
       and the server has no tree to walk. */
    this.updateComplete.then(() => this.watch())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-open', this.reread)
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  /* Resolved once, on the client, and never during a render.
   *
   * `render` reached for this through `closestInstance` at first, which walks
   * `parentNode` and steps across a `ShadowRoot` by following its `host`. That
   * names `ShadowRoot`, which the server has no global for, so every SSR of
   * this element threw `ReferenceError: Can't find variable: ShadowRoot` from
   * inside Lit's own result collector, three frames from anything recognisable.
   *
   * Which is the tree-inspection rule arriving as a crash rather than as a
   * wrong answer: a component that walks the tree to render cannot render on a
   * server, and the server has no tree to walk anyway. Held here instead, set
   * after the first update, and `undefined` on the server, where an empty menu
   * is the honest output. */
  #playlist: HelixHeadlessVideoPlaylist | undefined

  /** The playlist this menu belongs to, found upward through the slots. */
  private get playlist(): HelixHeadlessVideoPlaylist | undefined {
    return this.#playlist
  }

  /** The playlist's entries, in the order it holds them. */
  private get entries(): HelixHeadlessVideoPlaylistItem[] {
    const playlist = this.playlist
    return playlist ? [...playlist.querySelectorAll<HelixHeadlessVideoPlaylistItem>(ITEMS)] : []
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
   * on its own merits, `active` being a payload rather than a boolean fact.
   * Mirroring it was written and reverted here: it put `data-active` onto every
   * host, which `tree-root.ssr.spec.ts` caught, and the rule it broke was the
   * one that stops a copied host coming back frozen.
   *
   * So it is re-read at the moment it is looked at. `helix-open` comes from the
   * menu in this element's own shadow root, which is the one direction events
   * do arrive from, and a closed menu showing a stale mark is a thing nobody
   * can see.
   */
  private watch(): void {
    this.#playlist ??= closestInstance(this, HelixHeadlessVideoPlaylist) ?? undefined
    const playlist = this.#playlist
    if (!playlist || this.#observer) {
      return
    }
    this.addEventListener('helix-open', this.reread)
    this.#observer = new MutationObserver(this.reread)
    this.#observer.observe(playlist, { childList: true, subtree: true })
    this.reread()
  }

  /* `requestUpdate` rather than a counter held in `@state`.
   *
   * The entries are the playlist's light DOM rather than this element's, so
   * nothing about them schedules an update here: an entry added, removed, or
   * made current changes a tree this element only looks at. A bumped field is
   * the usual way to say "render again", and here it is a field nothing reads,
   * which the linter is right to call out. Asking directly says the same thing
   * with nothing to explain. */
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
            /* The still, where there is one, for the reason the list beside the
               player shows one: a reader picks an episode by recognising it
               faster than by reading its title, and this menu opens over the
               picture where reading is hardest.
             *
             * In `start`, which is free: `Menu.Item` renders its tick *after*
             * the label as `part="mark"`, so the leading column has nothing to
             * collide with. `alt=""`, because the name is in the same row and a
             * still repeating it is the same thing said twice, which is what
             * `Video.Playlist.Item` already decided about its own thumbnail.
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
