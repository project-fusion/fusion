import {
  bare,
  cancelable,
  headless,
  oneOf,
  Pressable,
  Repeat,
  Slot,
  string,
  Text,
  View,
} from '../../../render.js'

/**
 * Sandbox's headless tier: a bar across the top, a source pane and a preview
 * beside it, a panel under both, usually a console, and a bar along the bottom.
 *
 * **The web's panes are two splitters**, the source and the preview side by
 * side and stacked below 36rem, the panel under both, each divider dragged,
 * keyed, and given back by a double press. Source panes passed in under one
 * another become files, a tab each over the pane shown, named by its `label`
 * or its `name`; a tab press asks with `before-change` and tells with
 * `change`, `file` holding the pane's `name`. The edits, the previews the
 * source is sent to after `preview-delay`, and `reset` are the web's.
 *
 * **A phone's sandbox is read only**, as the gallery has drawn its examples:
 * the bar, the panes stacked as the web stacks them in a narrow window, the
 * source first unless `lead` is `preview`, the panel, and the status bar. Its
 * file tabs show one pane at a time as the web's do. It has no dividers to
 * drag, since a stacked page scrolls instead, and no preview frame to run the
 * source in: its preview is what the preview region holds.
 *
 * **Held to `helix-sandbox`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('sandbox', {
  props: {
    cornerLabel: 'Resize panes and panel',
    defaultPanelSize: 160,
    defaultSplit: 50,
    file: string(),
    filesLabel: 'Files',
    lead: oneOf(['preview', 'source'], 'source'),
    modifiedLabel: 'Modified',
    orientation: oneOf(['horizontal', 'vertical']),
    panelCollapsedSize: 0,
    panelLabel: 'Resize panel',
    panelSize: 160,
    previewDelay: 300,
    separatorLabel: '{pane, select, preview {Resize preview pane} other {Resize source pane}}',
    split: 50,
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeEdit: cancelable(['value']),
    beforePanelResize: cancelable(['value']),
    beforeSplit: cancelable(['value']),
    caret: ['column', 'line'],
    change: bare(),
    console: ['level', 'text'],
    edit: ['value'],
    panelResize: ['value'],
    resize: ['size'],
    split: ['value'],
  },
  states: ['modified', 'panelCollapsed', 'settled'],
  sandbox: {
    files: 'files',
    previewLeads: 'previewLeads',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    several: 'several',
  },
  render: ({ entry, props, sandbox }) => (
    <>
      <Slot name="toolbar" />
      <View
        part="body"
        platform="web"
      />
      <View
        part="panes"
        platform="web"
      />
      <View
        part="separator"
        platform="web"
      />
      <View
        part="corner"
        platform="web"
      />
      {sandbox.previewLeads && (
        <View
          data-lead
          data-preview
          part="pane"
          platform="native"
        >
          <Slot name="preview" />
        </View>
      )}
      <View
        data-files={sandbox.several}
        data-lead={!sandbox.previewLeads}
        part="pane"
      >
        {sandbox.several && (
          <View
            label={props.filesLabel}
            part="files"
            role="tablist"
          >
            <Repeat
              each={sandbox.files}
              key="key"
              part="tabs"
            >
              <Pressable
                also={{ 'file-modified': entry.modified }}
                data-selected={entry.selected}
                part="file"
                role="tab"
                selected={entry.selected}
              >
                <Text part="file-words">{entry.words}</Text>
              </Pressable>
            </Repeat>
          </View>
        )}
        <Slot name="source" />
      </View>
      {!sandbox.previewLeads && (
        <View
          data-preview
          part="pane"
        >
          <Slot name="preview" />
        </View>
      )}
      <View part="panel">
        <Slot name="panel" />
      </View>
      <Slot name="status" />
    </>
  ),
})
