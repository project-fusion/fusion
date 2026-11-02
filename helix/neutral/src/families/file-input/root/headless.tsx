import {
  Announce,
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
  Wrap,
  web,
} from '../../../render.js'

/**
 * File Input's headless tier: what it takes, what it sends, and its parts.
 *
 * **The field is the box a reader presses to pick files.** On the web it
 * holds a native `<input type="file">` laid over it out of sight, which opens
 * the browser's picker. On a phone the field is a press that opens the
 * document picker through the files capability.
 *
 * **A file on the web is a `File`, and on a phone it is the record the files
 * capability gives**: its name, its size, its media type, and the URI its
 * content is read from. A phone's `onReject` carries those records.
 *
 * **Each pick is screened** by core's rules: the types `accept` names,
 * `max-file-size`, and `max-files` under `multiple`. A pick replaces the files
 * held. A refused file is left out, `reject` lists each with its reason, and
 * a reader hears `rejected-text`. Each change asks first with
 * `before-change`, with the files' names, and `input` and `change` follow.
 *
 * **Each chosen file is a row**: its name, its size and its kind as tags,
 * and a press that removes it, named by `remove-label`. A reader hears
 * `removed-text` once it is gone.
 *
 * **A phone's `validate` and `transformFiles` take the capability's
 * records**, where the web's take `File`s. A phone's ref holds
 * `setFileStatus`, `removeAt`, `clear`, and `files`, as the web element's
 * methods are, and a row draws the upload status `setFileStatus` gives.
 *
 * **`renderFile` draws a row's file its own way**, in place of its name and
 * tags: a template on the web, and a native node on a phone, given the
 * capability's record and the row's place.
 *
 * **Web only:** dropping and pasting files, and `added-text`, which says
 * what they add. `capture` and `directory`, which the document picker has no
 * way to ask for, and `name`, a form's.
 */
export default headless('file-input', {
  props: {
    accept: '',
    addedText: web('Added: {names}'),
    ariaLabel: string(),
    bytesLabel: '{count, plural, one {# byte} other {# bytes}}',
    capture: web(oneOf(['environment', 'user'])),
    directory: web(false),
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    locale: '',
    maxFiles: number(),
    maxFileSize: number(),
    multiple: false,
    /* A form's, which a phone has none of. */
    name: web(''),
    progressLabel: 'Uploading {name}',
    rejectedText: 'Not added: {names}',
    removedText: 'Removed: {name}',
    removeLabel: 'Remove {name}',
    renderFile: callback(
      '(file: { readonly name: string; readonly size: number; readonly type: string; readonly uri: string }, index: number) => ReactNode',
    ),
    required: false,
    /* A phone's files are the files capability's records, so its own step
       and its own check take and give those. */
    transformFiles: callback(
      '(files: readonly { readonly name: string; readonly size: number; readonly type: string; readonly uri: string }[]) => readonly { readonly name: string; readonly size: number; readonly type: string; readonly uri: string }[] | Promise<readonly { readonly name: string; readonly size: number; readonly type: string; readonly uri: string }[]>',
    ),
    triggerLabel: 'Choose files',
    validate: callback(
      '(file: { readonly name: string; readonly size: number; readonly type: string; readonly uri: string }) => string | null | undefined',
    ),
    valueMissingMessage: string(),
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
    reject: ['files'],
  },
  states: ['dropping', 'hasFiles', 'invalid', 'settled'],
  files: {
    accept: 'accept',
    bytesLabel: 'bytesLabel',
    hasFiles: 'hasFiles',
    list: 'chosen',
    locale: 'locale',
    maxFileSize: 'maxFileSize',
    maxFiles: 'maxFiles',
    multiple: 'multiple',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    onReject: 'reject',
    rejectedText: 'rejectedText',
    removeLabel: 'removeLabel',
    removedText: 'removedText',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ entry, files, props, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <Pressable
        describedby="hint"
        disabled={props.disabled}
        label={props.ariaLabel}
        labelledby="label trigger"
        part="field"
        picks
        role="button"
      >
        <View
          part="control"
          platform="web"
        />
        <View part="trigger">
          <Slot name="trigger">
            <Text part="trigger-text">{props.triggerLabel}</Text>
          </Slot>
        </View>
      </Pressable>
      {!state.invalid ? (
        <Wrap
          part="hint"
          when={props.hint}
        >
          <Slot name="hint">
            <Text part="hint-text">{props.hint}</Text>
          </Slot>
        </Wrap>
      ) : (
        <View
          part="feedback"
          role="alert"
        >
          <Slot name="feedback">
            <Text part="feedback-text">{validation.message}</Text>
          </Slot>
        </View>
      )}
      <Announce
        part="live"
        platform="web"
      />
      {state.hasFiles && (
        <View part="list">
          <Repeat
            each={files.list}
            key="key"
            part="files"
          >
            <View
              also={{
                'file-done': entry.done,
                'file-error': entry.failed,
                'file-uploading': entry.sending,
              }}
              part="file"
            >
              <View part="detail">
                <Wrap
                  part="content"
                  passes={entry.file}
                  platform="native"
                  renders={props.renderFile}
                >
                  <View part="name">
                    <Text part="name-text">{entry.name}</Text>
                  </View>
                  <View part="meta">
                    <Wrap
                      draws="tag"
                      exports={{
                        cell: true,
                        dismiss: true,
                        'dismiss-mark': true,
                        label: true,
                        link: true,
                        start: true,
                      }}
                      part="size"
                    >
                      <Text part="size-text">{entry.size}</Text>
                    </Wrap>
                    <Wrap
                      draws="tag"
                      exports={{
                        cell: true,
                        dismiss: true,
                        'dismiss-mark': true,
                        label: true,
                        link: true,
                        start: true,
                      }}
                      part="kind"
                    >
                      <Text part="kind-text">{entry.kind}</Text>
                    </Wrap>
                  </View>
                </Wrap>
                <View
                  hidden={entry.statusHidden}
                  part="status"
                >
                  <View
                    hidden={entry.barHidden}
                    label={entry.progressLabel}
                    part="progress"
                    role="progressbar"
                  >
                    <View
                      part="progress-fill"
                      platform="native"
                      style={{ '--file-input-progress-fill': entry.fill }}
                    />
                  </View>
                  <View
                    hidden={entry.wordsHidden}
                    part="status-text"
                  >
                    <Text part="status-words">{entry.statusText}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                disabled={props.disabled}
                label={entry.removeLabel}
                part="remove"
                removes
                role="button"
              >
                <Slot name="remove-icon">
                  <View
                    ariaHidden
                    icon="trash"
                    part="remove-mark"
                    platform="native"
                  />
                </Slot>
              </Pressable>
            </View>
          </Repeat>
        </View>
      )}
    </>
  ),
})
