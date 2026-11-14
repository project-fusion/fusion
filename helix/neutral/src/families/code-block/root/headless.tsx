import {
  bare,
  callback,
  cancelable,
  headless,
  number,
  oneOf,
  Pressable,
  Repeat,
  Slot,
  string,
  Text,
  View,
} from '../../../render.js'

/**
 * Code Block's headless tier: code under a name with a copy button, a gutter of
 * numbers, bands behind marked lines, a unified diff, and several files under
 * tabs.
 *
 * **Core reads the code**, the same on both platforms: its lines, a diff's files,
 * hunks, and folds, and a highlighter's runs. The web's element draws a
 * highlighter's markup as it always did. A phone draws no markup, so it reads the
 * tags and inline styles of what `highlight` returns into runs, and `tokens` hands
 * either platform runs directly.
 *
 * **A pane is plain code, or one file of a diff.** A phone draws plain code as one
 * paragraph, in a `Text`, so a selection and a wrap cross its lines, and it reads
 * where each line was laid out from that paragraph, to place a band and to make a
 * number as tall as its line. The web measures with a range. A diff is rows, since
 * each carries its own wash and numbers. **A split stands in one `old`**, marked
 * `new` for its second copy.
 *
 * **What a screen reader hears.** The web's scrolling box is a tab stop and a
 * region, for a keyboard to scroll. A phone scrolls under the finger and reads the
 * words, so it has no stop. A line of a diff says its `+` or `-` with its words,
 * and its numbers are hidden, as the web's are.
 *
 * **Held to `helix-code-block`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('code-block', {
  props: {
    addedLines: '',
    codeLabel: 'Code',
    codeNameLabel: '{code}, {name}',
    collapseLabel: 'Show fewer lines',
    contextLines: number(),
    copiedLabel: 'Copied',
    copyLabel: 'Copy code',
    copyNameLabel: '{copy}, {name}',
    diff: false,
    expandable: false,
    expandLabel: 'Show all lines',
    file: string(),
    filesLabel: 'Files',
    hideUnchangedLabel:
      '{count, plural, one {Hide # unchanged line} other {Hide # unchanged lines}}',
    highlight: callback('(code: string, language: string) => string | undefined'),
    label: '',
    language: '',
    layout: oneOf(['split']),
    lineNumbers: false,
    markLines: '',
    noCopy: false,
    removedLines: '',
    showUnchangedLabel:
      '{count, plural, one {Show # unchanged line} other {Show # unchanged lines}}',
    tokens: callback(
      '(code: string, language: string) => readonly import("@fusion.dev/helix-core/code-block").CodeRun[] | undefined',
    ),
    wrap: false,
    wrapLabel: 'Wrap lines',
    wrappable: false,
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeCheck: cancelable(['checked']),
    change: bare([]),
    check: ['checked'],
    copy: ['value'],
    copyError: [],
  },
  states: ['expanded', 'settled', 'tabbed'],
  codeBlock: {
    addedLines: 'addedLines',
    codeLabel: 'codeLabel',
    codeNameLabel: 'codeNameLabel',
    collapseLabel: 'collapseLabel',
    contextLines: 'contextLines',
    copyLabel: 'copyLabel',
    copyNameLabel: 'copyNameLabel',
    diff: 'diff',
    expandHidden: 'expandHidden',
    expandLabel: 'expandLabel',
    expandWords: 'expandWords',
    expandable: 'expandable',
    file: 'file',
    filesLabel: 'filesLabel',
    hideUnchangedLabel: 'hideUnchangedLabel',
    highlight: 'highlight',
    label: 'label',
    language: 'language',
    lineNumbers: 'lineNumbers',
    markLines: 'markLines',
    noCopy: 'noCopy',
    onBeforeChange: 'beforeChange',
    onBeforeCheck: 'beforeCheck',
    onChange: 'change',
    onCheck: 'check',
    panes: 'panes',
    removedLines: 'removedLines',
    several: 'several',
    showUnchangedLabel: 'showUnchangedLabel',
    tabs: 'tabs',
    tokens: 'tokens',
    layout: 'layout',
    wrap: 'wrap',
    wrapLabel: 'wrapLabel',
    wrappable: 'wrappable',
  },
  render: ({ codeBlock, entry, props }) => (
    <>
      {codeBlock.several && (
        <View
          label={props.filesLabel}
          part="files"
          role="tablist"
        >
          <Repeat
            each={codeBlock.tabs}
            key="key"
            part="tabs"
          >
            <Pressable
              data-selected={entry.selected}
              part="file-tab"
              role="tab"
              selected={entry.selected}
            >
              <Text part="file-tab-words">{entry.name}</Text>
            </Pressable>
          </Repeat>
        </View>
      )}
      {codeBlock.several && <Slot />}
      <Repeat
        each={codeBlock.panes}
        key="key"
        part="panes"
      >
        <View part="file">
          {/* What a phone's machine hands the copy button itself. */}
          <Slot
            hidden={entry.iconsHidden}
            name="copy-icon"
          />
          <Slot
            hidden={entry.iconsHidden}
            name="copied-icon"
          />
          <View
            data-copied={entry.copyInHeader}
            hidden={entry.headerHidden}
            part="header"
          >
            <View
              hidden={entry.labelHidden}
              part="label"
            >
              <Slot
                hidden={entry.labelSlotHidden}
                name="label"
              />
              <Text part="label-words">{entry.drawn}</Text>
            </View>
            <View
              hidden={entry.actionsHidden}
              part="actions"
            >
              <Slot name="actions" />
            </View>
            <Pressable
              data-after={entry.afterActions}
              data-gone={entry.wrapHidden}
              data-pressed={entry.wrapPressed}
              label={props.wrapLabel}
              part="wrap-toggle"
            >
              <Text part="wrap-toggle-words">{props.wrapLabel}</Text>
            </Pressable>
            <View
              bubbles="copy copy-error"
              data-after={entry.afterToggle}
              draws="copy-button"
              exports={{
                button: true,
                live: true,
                mark: true,
                spinner: true,
                text: true,
                tooltip: true,
                'tooltip-arrow': true,
                'tooltip-arrow-bottom': true,
                'tooltip-arrow-left': true,
                'tooltip-arrow-right': true,
                'tooltip-arrow-top': true,
                'tooltip-surface': true,
                'tooltip-surface-bottom': true,
                'tooltip-surface-left': true,
                'tooltip-surface-right': true,
                'tooltip-surface-top': true,
              }}
              gives={{
                copiedLabel: props.copiedLabel,
                label: entry.copyName,
                value: entry.copyText,
              }}
              hidden={entry.copyInHeaderHidden}
              part="copy"
            />
          </View>
          <View part="frame">
            <View
              data-beside={entry.copyBeside}
              data-flat={entry.flatTop}
              hidden={entry.blockHidden}
              part="block"
            >
              <View
                ariaHidden
                hidden={entry.gutterHidden}
                part="gutter"
              >
                <Repeat
                  each={entry.numbers}
                  key="key"
                  part="numbers"
                >
                  <View part="number">
                    <Text part="number-words">{entry.words}</Text>
                  </View>
                </Repeat>
              </View>
              <View
                data-wrapped={entry.wrapped}
                part="code"
              >
                <Repeat
                  each={entry.marks}
                  key="key"
                  part="marks"
                >
                  <View
                    also={{ 'mark-added': entry.added, 'mark-removed': entry.removed }}
                    ariaHidden
                    hidden={entry.hidden}
                    part="mark"
                  />
                </Repeat>
                <View
                  part="code-text"
                  platform="native"
                  run
                >
                  <Repeat
                    each={entry.runs}
                    key="key"
                    part="runs"
                  >
                    <View
                      part="run"
                      platform="native"
                      run
                    >
                      <Text part="run-words">{entry.text}</Text>
                    </View>
                  </Repeat>
                </View>
              </View>
            </View>
            <View
              hidden={entry.splitHidden}
              part="split"
            >
              <Repeat
                each={entry.sides}
                key="key"
                part="sides"
              >
                <View
                  also={{ new: entry.isNew }}
                  data-banded={entry.banded}
                  data-flat={entry.flatTop}
                  part="old"
                >
                  <Repeat
                    each={entry.rows}
                    key="key"
                    part="rows"
                  >
                    <View
                      also={{ added: entry.added, removed: entry.removed }}
                      hidden={entry.lineHidden}
                      part="context"
                    >
                      <Repeat
                        each={entry.numbers}
                        key="key"
                        part="row-numbers"
                      >
                        <View
                          ariaHidden
                          part="number"
                        >
                          <Text part="number-words">{entry.words}</Text>
                        </View>
                      </Repeat>
                      <View
                        ariaHidden
                        data-added={entry.added}
                        data-removed={entry.removed}
                        part="marker"
                      >
                        <Text part="marker-words">{entry.marker}</Text>
                      </View>
                      <View
                        part="text"
                        run
                      >
                        <Repeat
                          each={entry.pieces}
                          key="key"
                          part="pieces"
                        >
                          <View
                            data-added={entry.added}
                            data-plain={entry.plain}
                            data-removed={entry.removed}
                            part="changed"
                            run
                          >
                            <Text part="changed-words">{entry.text}</Text>
                          </View>
                        </Repeat>
                      </View>
                    </View>
                    <View
                      hidden={entry.hunkHidden}
                      part="hunk"
                    >
                      <View
                        part="text"
                        run
                      >
                        <Text part="hunk-words">{entry.words}</Text>
                      </View>
                    </View>
                    <View
                      ariaHidden
                      hidden={entry.fillerHidden}
                      part="filler"
                    />
                    <Pressable
                      data-gone={entry.foldHidden}
                      part="fold"
                    >
                      <View
                        part="text"
                        run
                      >
                        <Text part="fold-words">{entry.words}</Text>
                      </View>
                    </Pressable>
                  </Repeat>
                </View>
              </Repeat>
            </View>
            <View
              bubbles="copy copy-error"
              data-beside
              draws="copy-button"
              exports={{
                button: true,
                live: true,
                mark: true,
                spinner: true,
                text: true,
                tooltip: true,
                'tooltip-arrow': true,
                'tooltip-arrow-bottom': true,
                'tooltip-arrow-left': true,
                'tooltip-arrow-right': true,
                'tooltip-arrow-top': true,
                'tooltip-surface': true,
                'tooltip-surface-bottom': true,
                'tooltip-surface-left': true,
                'tooltip-surface-right': true,
                'tooltip-surface-top': true,
              }}
              gives={{
                copiedLabel: props.copiedLabel,
                label: entry.copyName,
                value: entry.copyText,
              }}
              hidden={entry.copyInFrameHidden}
              part="copy"
            />
          </View>
        </View>
      </Repeat>
      <Pressable
        data-gone={codeBlock.expandHidden}
        part="expand"
      >
        <Slot name="expand-icon" />
        <Text part="expand-words">{codeBlock.expandWords}</Text>
      </Pressable>
    </>
  ),
})
