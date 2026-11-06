import {
  customElement,
  formatWords,
  HelixElement,
  ToolbarController,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { TableBinding, type ToolTable } from '../../data-table/binding.js'
import { holdsView, type PartialView, readView } from '../../data-table/view.js'
import { HelixBeforeViewSaveEvent, HelixViewSaveEvent } from '../events/index.js'
import type { HelixHeadlessQuickFilter } from '../filter/quick-filter.js'

/** A preset the row draws: one written as a child, or one kept in browser storage. */
interface Preset {
  count?: number | undefined
  label: string
  saved: boolean
  view: PartialView
}

/** The storage a saved view is kept in, which a private window or a blocked site may not have. */
const storage = (): Storage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/**
 * @summary A row of presets for a Data Table, each a partial view with a count, and a button that saves the view.
 *
 * @description
 * Set `for` to the id of a `DataTable`, and write each preset as a
 * `QuickFilter` child. A preset is a partial view: the parts of the table's
 * view it sets, such as its filters or its sort. Pressing one asks the table
 * for those parts with `requestView`, and the preset the view holds now is
 * pressed.
 *
 * ```html
 * <helix-quick-filters for="invoices">
 *   <helix-quick-filter view='{"filters":[]}'>All</helix-quick-filter>
 *   <helix-quick-filter view='{"filters":[{"field":"status","operator":"any","values":["Overdue"]}]}'>Overdue</helix-quick-filter>
 * </helix-quick-filters>
 * ```
 *
 * Each button shows how many rows the preset would show, counted from the
 * rows the table holds. A table in `server` mode holds one page, so give each
 * preset its `count`.
 *
 * **Save view.** The last button saves the table's whole view. It fires
 * `helix-before-view-save` with the view and a name, which you can cancel to
 * keep the view in your own store, and then `helix-view-save`. With
 * `view-key`, the view is also kept in this browser's storage under that key
 * and drawn after your presets, and a saved preset can be removed. Without
 * it, nothing is kept: keep the view from the event.
 *
 * The buttons are one tab stop, and the arrow keys, Home, and End move among
 * them, as in a toolbar.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Saved views, Presets, View tabs
 * @documentation https://fusion.dev/helix/components/quick-filters
 *
 * @slot - The presets, as `QuickFilter` elements.
 *
 * @event {HelixBeforeViewSaveEvent} helix-before-view-save - Save view was pressed, with the view and the name it is saved under. Cancelable: cancel it to keep the view yourself.
 * @event {HelixViewSaveEvent} helix-view-save - Fired after a view is saved, with the view and its name.
 *
 * @csspart count - How many rows a preset shows, after its name.
 * @csspart list - The row of buttons.
 * @csspart name - A preset's name, inside its button.
 * @csspart preset - One preset's button.
 * @csspart preset-pressed - Added to `preset` while the view holds it.
 * @csspart preset-saved - Added to `preset` for a view kept in browser storage.
 * @csspart remove - The button after a saved preset that removes it.
 * @csspart save - The button that saves the view.
 */
@customElement('helix-headless-quick-filters')
export class HelixHeadlessQuickFilters extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-quick-filters': { saveLabel: 'Ansicht speichern' } })`.
   */
  static words = 'helix-quick-filters'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Quick filters'

  /** The id of the `DataTable` the presets set the view of, in the same document or shadow root. */
  @property()
  for = ''

  /**
   * The name of the list, which a screen reader announces before its items.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /** The name of the button that removes a saved view. `{name}` is the view's name. */
  @words
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /** The name a saved view is given. `{count}` is how many views are saved, with this one. */
  @words
  @property({ attribute: 'saved-label' })
  savedLabel = 'View {count}'

  /** The words on the button that saves the view. Empty draws no button. */
  @words
  @property({ attribute: 'save-label' })
  saveLabel = 'Save view'

  /**
   * Keeps saved views in this browser's storage under this key, and draws them
   * after the presets you write. Left unset, Save view only fires its events.
   */
  @property({ attribute: 'view-key' })
  viewKey = ''

  /** The views kept under `view-key`, read once the key is known. */
  @state()
  private saved: { label: string; view: PartialView }[] = []

  protected readonly binding = new TableBinding(this)

  protected readonly keys = new ToolbarController(this, {
    arrows: () => 'horizontal',
    members: () => [
      ...(this.renderRoot.querySelectorAll?.('[part~="preset"], [part="save"]') ?? []),
    ],
    own: true,
    watch: () => this.renderRoot,
    words: (button) => button.textContent?.trim() ?? '',
  })

  /** The bound table, once it is in the tree. */
  get table(): ToolTable | null {
    return this.binding.table
  }

  /** The presets written as children, then the views kept in storage. */
  private get presets(): Preset[] {
    const written = this.knownChildren
      .filter(
        (child): child is HelixHeadlessQuickFilter =>
          (child as Partial<HelixHeadlessQuickFilter>).isQuickFilter === true,
      )
      .map((child) => ({
        count: child.count,
        label: child.textContent?.trim() ?? '',
        saved: false,
        view: child.parts,
      }))
    return [...written, ...this.saved.map((one) => ({ ...one, saved: true }))]
  }

  private get storageName(): string {
    return `helix-views:${this.viewKey}`
  }

  private readSaved(): void {
    if (!this.viewKey) {
      this.saved = []
      return
    }
    try {
      const kept = JSON.parse(storage()?.getItem(this.storageName) ?? '[]') as unknown
      this.saved = Array.isArray(kept)
        ? kept.flatMap((one) =>
            one && typeof one.label === 'string'
              ? [{ label: one.label, view: readView(one.view) }]
              : [],
          )
        : []
    } catch {
      this.saved = []
    }
  }

  private writeSaved(): void {
    try {
      storage()?.setItem(this.storageName, JSON.stringify(this.saved))
    } catch {
      /* A store that is full or blocked keeps nothing, and the row still draws the view. */
    }
  }

  /** Sets the parts of the view one preset names. */
  choose(view: PartialView): boolean {
    return this.table?.requestView(view) ?? false
  }

  /** Saves the table's whole view, as Save view does. Returns whether it was saved. */
  saveView(label = formatWords(this, 'savedLabel', { count: this.saved.length + 1 })): boolean {
    const table = this.table
    if (!table) {
      return false
    }
    const view = table.view
    const detail = { label, value: JSON.stringify(view), view }
    if (!this.dispatchEvent(new HelixBeforeViewSaveEvent(detail))) {
      return false
    }
    if (this.viewKey) {
      this.saved = [...this.saved, { label, view }]
      this.writeSaved()
    }
    this.dispatchEvent(new HelixViewSaveEvent(detail))
    return true
  }

  /** Removes a view kept in storage, by its place among the saved ones. */
  removeSaved(index: number): void {
    this.saved = this.saved.filter((_, at) => at !== index)
    this.writeSaved()
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed)
    if (changed.has('viewKey') && typeof window !== 'undefined') {
      this.readSaved()
    }
  }

  protected override firstUpdated(changed: Map<PropertyKey, unknown>): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  protected renderPreset(table: ToolTable | null, preset: Preset, savedAt: number): TemplateResult {
    const pressed = table ? holdsView(table.view, preset.view) : false
    const count = preset.count ?? table?.countView(preset.view)
    return html`<button
        part="preset${pressed ? ' preset-pressed' : ''}${preset.saved ? ' preset-saved' : ''}"
        type="button"
        aria-pressed=${pressed ? 'true' : 'false'}
        @click=${() => this.choose(preset.view)}
      ><span part="name">${preset.label}</span>${
        count === undefined ? nothing : html` <span part="count">${count}</span>`
      }</button
      >${
        preset.saved
          ? html`<button
              part="remove"
              type="button"
              tabindex="-1"
              aria-label=${formatWords(this, 'removeLabel', { name: preset.label })}
              @click=${() => this.removeSaved(savedAt)}
            >×</button>`
          : nothing
      }`
  }

  protected override render(): TemplateResult {
    const table = this.table
    let savedAt = -1
    return html`<div part="list" role="toolbar" aria-label=${this.label || this.fallbackLabel}>
        ${this.presets.map((preset) => {
          if (preset.saved) {
            savedAt += 1
          }
          return this.renderPreset(table, preset, savedAt)
        })}${
          this.saveLabel
            ? html`<button part="save" type="button" @click=${() => this.saveView()}>${this.saveLabel}</button>`
            : nothing
        }
      </div>
      <slot @slotchange=${this.handleSlotChange} hidden></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-quick-filters': HelixHeadlessQuickFilters
  }
}
