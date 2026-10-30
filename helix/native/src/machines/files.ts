/**
 * The files machine an element that declares `files` runs, as a file input
 * does: a press on its pressable that `picks` opens the document picker
 * through the files capability, and a press that `removes` takes its row's
 * file out.
 *
 * **A phone holds the records the files capability gives**, each a name, a
 * size, a media type, and the URI its content is read from, where the web
 * element holds `File`s. Both screen a pick by core's file-field rules, so a
 * pick takes and leaves out the same files on both platforms.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { files } from '@fusion.dev/helix-core/capabilities/files'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { DeviceFile } from '@fusion.dev/helix-core/capabilities/types'
import {
  acceptList,
  barOf,
  type FileStatus,
  fileKind,
  fileSize,
  type RefusedOne,
  saysStatus,
  screenFiles,
} from '@fusion.dev/helix-core/file-input'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell, told } from './props'
import type { FieldHandle } from './validation'

export type { FileStatus } from '@fusion.dev/helix-core/file-input'

/**
 * A file input's handle, which its `ref` holds: the control's own, and the
 * files it holds, as the web element's methods offer them.
 */
export interface FilesHandle extends FieldHandle {
  /** Removes every chosen file, asking first, as the web's `clear()` does. */
  readonly clear: () => void
  /** The files chosen, in order. */
  readonly files: () => readonly DeviceFile[]
  /** Removes the file at `at`, asking first, as the web's `removeAt()` does. */
  readonly removeAt: (at: number) => void
  /**
   * Shows how a file's upload is going in its row: a bar for `progress`,
   * from 0 to 1, or a bar without a measure while `state` is `uploading`,
   * and `text` beside it. `null` clears it. The file is found by its `uri`.
   */
  readonly setFileStatus: (file: DeviceFile, status: FileStatus | null) => void
}

/** What the files machine gives the element and the machines after it. */
export interface Filed {
  readonly behavior: Behavior
  /** The handle's methods beside `validate`, which the element's ref holds. */
  readonly handle: Omit<FilesHandle, 'validate'>
  /** The chosen files' names, joined, which the verdict reads as its answer. */
  readonly names: string
}

/** A count a prop holds, where it holds a number. */
const countOf = (value: unknown): number | undefined => {
  const count = typeof value === 'string' && value !== '' ? Number(value) : value
  return typeof count === 'number' && Number.isFinite(count) ? count : undefined
}

/** The words a prop holds. */
const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A name about one file: `{name}` filled in, or the name after a label that has none. */
const about = (label: string, name: string, at: string): string =>
  label.includes('{name}') ? formatMessage(label, { name }, at) : `${label} ${name}`.trim()

/**
 * The names of some files, as the language lists them, and with commas where
 * the engine has no list format, as Hermes may not.
 */
const listed = (chosen: readonly DeviceFile[], at: string): string => {
  const names = chosen.map((one) => one.name)
  return typeof Intl.ListFormat === 'function'
    ? new Intl.ListFormat(at || undefined, { style: 'short', type: 'unit' }).format(names)
    : names.join(', ')
}

/** What a page's `validate` says of a file, or nothing where it has none. */
type Check = (file: DeviceFile) => string | null | undefined

/** What a page's `transformFiles` makes of the files a pick takes. */
type Transform = (
  chosen: readonly DeviceFile[],
) => readonly DeviceFile[] | Promise<readonly DeviceFile[]>

/**
 * Hosts the files an element holds, as the expansion binds them: the press
 * that picks, the press that removes, the props that screen a pick and write
 * its rows, the value the rows are drawn from, and the events a change sends.
 * **No machine of core's holds it**, as the web element hears its own
 * `<input type="file">`.
 *
 * **A pick replaces the files held**, as a native file input's does. It is
 * screened by `accept`, `max-file-size`, and the page's `validate`, and
 * under `multiple`, `max-files`; a single field takes the last file it
 * accepts. What the screen takes goes through the page's `transformFiles`,
 * where it gives one, and a promise it refuses leaves those files out.
 *
 * **Each change asks first.** `before` carries the names the change would
 * leave, and a refused change keeps the files as they were. `input` and
 * `change` follow a change that stands, which gives the reader a go at the
 * field, as on the web. A pick that leaves files out sends `reject` with each
 * one and why, and a reader hears `rejected-text`. A closed picker changes
 * nothing.
 *
 * **A press that removes takes its row's file out**, asking first, and a
 * reader hears `removed-text`. Focus moves to the press of the file that
 * took its place, or the one before it, or to the field once none is left,
 * as on the web.
 */
export const useFiles = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
): Filed => {
  const [held, hold] = useState<readonly DeviceFile[]>([])
  const [statuses, setStatuses] = useState<ReadonlyMap<string, FileStatus>>(new Map())
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const where = wordsOf(read('locale')) || locale().read()
  const latest = useRef({ held, props, touch, where })
  latest.current = { held, props, touch, where }
  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    input: boundTo(use, 'input', 'event'),
    reject: boundTo(use, 'reject', 'event'),
  }
  const disabled = read('disabled') === true
  /** Asks for `next`, and holds it where it stands, saying whether it did. */
  const commit = useCallback(
    (next: readonly DeviceFile[]): boolean => {
      const now = latest.current
      const value = next.map((one) => one.name).join(', ')
      if (events.before !== undefined && !tell(family, now.props, events.before, { value })) {
        return false
      }
      latest.current = { ...now, held: next }
      hold(next)
      now.touch()
      for (const event of [events.input, events.change]) {
        if (event !== undefined) {
          tell(family, now.props, event, {})
        }
      }
      return true
    },
    [events.before, events.change, events.input, family],
  )
  /** Holds what a pick leaves, sends `reject` for what it refused, and says it. */
  const finish = useCallback(
    (next: readonly DeviceFile[], refused: readonly RefusedOne<DeviceFile>[]) => {
      commit(next)
      if (refused.length === 0) {
        return
      }
      const { props: now, where: at } = latest.current
      if (events.reject !== undefined) {
        told(family, now, events.reject, { files: refused })
      }
      const sentence = wordsOf(given(family, now, boundTo(use, 'refused', 'prop')))
      if (sentence !== '') {
        const gone = refused.map((one) => one.file)
        announce().say(
          formatMessage(sentence, { count: gone.length, names: listed(gone, at) }, at),
          'polite',
        )
      }
    },
    [commit, events.reject, family, use],
  )
  /** Screens what a pick gives, then hands it through the page's own step. */
  const take = useCallback(
    (arriving: readonly DeviceFile[]) => {
      const now = latest.current.props
      const ask = (name: string): unknown => given(family, now, boundTo(use, name, 'prop'))
      const check = now.validate
      const { kept, refused } = screenFiles(arriving, [], {
        accept: wordsOf(ask('accept')),
        maxFileSize: countOf(ask('largest')),
        maxFiles: countOf(ask('most')),
        /* A picker gives a single field one file, and a single field
           takes the last one any other way. */
        multiple: ask('multiple') === true,
        validate: typeof check === 'function' ? (check as Check) : undefined,
      })
      const transform = now.transformFiles
      if (typeof transform !== 'function' || kept.length === 0) {
        finish(kept, refused)
        return
      }
      Promise.resolve()
        .then(() => (transform as Transform)(kept))
        .then(
          (made) => finish([...made], refused),
          (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error)
            finish(
              [],
              [...refused, ...kept.map((file) => ({ file, message, reason: 'invalid' as const }))],
            )
          },
        )
    },
    [family, finish, use],
  )
  const pick = useCallback(async () => {
    const now = latest.current.props
    if (given(family, now, boundTo(use, 'disabled', 'prop')) === true) {
      return
    }
    const ask = (name: string): unknown => given(family, now, boundTo(use, name, 'prop'))
    const picked = await files().pick({
      accept: acceptList(wordsOf(ask('accept'))),
      multiple: ask('multiple') === true,
    })
    if (picked.outcome === 'chosen') {
      take(picked.files)
    }
  }, [family, take, use])
  const removeAt = useCallback(
    (at: number) => {
      const { held: now, props: passed, where: words } = latest.current
      const gone = now[at]
      if (gone === undefined || !commit(now.filter((_, index) => index !== at))) {
        return
      }
      const sentence = wordsOf(given(family, passed, boundTo(use, 'removed', 'prop')))
      if (sentence !== '') {
        announce().say(formatMessage(sentence, { name: gone.name }, words), 'polite')
      }
    },
    [commit, family, use],
  )
  const clear = useCallback(() => {
    if (latest.current.held.length > 0) {
      commit([])
    }
  }, [commit])
  const setFileStatus = useCallback((file: DeviceFile, status: FileStatus | null) => {
    setStatuses((was) => {
      const next = new Map(was)
      const before = was.get(file.uri)
      if (status === null) {
        next.delete(file.uri)
      } else {
        next.set(file.uri, status)
        if (saysStatus(status, before)) {
          announce().say(status.text ?? '', 'polite')
        }
      }
      return next
    })
  }, [])
  /* The view of each row's press that removes, by its place, and the field's,
     which focus moves to once a press removes its file. */
  const removers = useRef(new Map<number, unknown>()).current
  const field = useRef<unknown>(null)
  const fieldRef = useCallback((node: unknown) => {
    field.current = node
  }, [])
  const refocus = useRef<number | undefined>(undefined)
  useLayoutEffect(() => {
    const at = refocus.current
    if (at === undefined) {
      return
    }
    refocus.current = undefined
    const target = removers.get(Math.min(at, held.length - 1)) ?? field.current
    if (target !== null && target !== undefined) {
      focus().focus(target, false)
    }
  })
  const handle = useMemo(
    () => ({ clear, files: () => latest.current.held, removeAt, setFileStatus }),
    [clear, removeAt, setFileStatus],
  )
  const bytes = wordsOf(read('bytes'))
  const naming = wordsOf(read('naming'))
  const progress = wordsOf(given(family, props, 'progress-label'))
  const rows = held.map((file, at) => {
    const status = statuses.get(file.uri)
    const bar = status === undefined ? undefined : barOf(status)
    return {
      barHidden: bar === undefined,
      done: status?.state === 'done',
      failed: status?.state === 'error',
      file,
      fill: typeof bar === 'number' ? `${bar * 100}%` : '0%',
      key: `${at}:${file.uri}`,
      kind: fileKind(file),
      name: file.name,
      progressLabel: about(progress, file.name, where),
      removeLabel: about(naming, file.name, where),
      sending: status?.state === 'uploading',
      size: fileSize(file.size, where, (count) => formatMessage(bytes, { count }, where)),
      statusHidden: status === undefined || (bar === undefined && !status.text),
      statusText: status?.text ?? '',
      wordsHidden: !status?.text,
    }
  })
  const list = boundTo(use, 'list', 'state') ?? 'chosen'
  const filled = boundTo(use, 'filled', 'state')
  const picks = boundTo(use, 'picks', 'part')
  const removes = boundTo(use, 'removes', 'part')
  const parts: Record<string, Behavior['parts'][string]> = {
    host: { lists: { [list]: rows } },
  }
  if (picks !== undefined) {
    parts[picks] = { view: { onPress: disabled ? undefined : pick, ref: fieldRef } }
  }
  if (removes !== undefined) {
    parts[removes] = {
      copy: (item) => ({
        onPress: () => {
          refocus.current = item.index
          removeAt(item.index)
        },
        ref: (node: unknown) => {
          if (node === null) {
            removers.delete(item.index)
          } else {
            removers.set(item.index, node)
          }
        },
      }),
    }
  }
  return {
    behavior: {
      marks: held.length > 0 && filled !== undefined ? [filled] : [],
      parts,
    },
    handle,
    names: held.map((one) => one.name).join(', '),
  }
}
