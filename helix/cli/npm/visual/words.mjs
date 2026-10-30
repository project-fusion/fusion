/**
 * The driver's sentences that depend only on what they are given, apart from
 * the driver, which starts reading its standard input as soon as it is imported.
 */

/**
 * Why a config could not be imported, with what to do when the reason is that
 * the runtime reads no TypeScript. Node strips types by default from 22.18 and
 * 23.6, and an older one answers only with the file's extension.
 */
export const unloadable = (path, caught, runtime) => {
  const said = caught instanceof Error ? caught.message : String(caught)
  if (caught?.code !== 'ERR_UNKNOWN_FILE_EXTENSION' || !/\.[cm]?ts$/.test(path)) {
    return said
  }
  return `${said}. Node ${runtime} reads no TypeScript. Use Node 22.18 or later, or write the config as visual.config.mjs.`
}

/** Why a page's answer is no page to picture, or undefined when it is one. */
export const unanswered = (status, expected, address) => {
  if (status === undefined) {
    return undefined
  }
  if (expected !== undefined && expected !== null) {
    return status === expected
      ? undefined
      : `the page answered ${status} at ${address}, and its route names ${expected}, so nothing was pictured`
  }
  return status >= 400
    ? `the page answered ${status} at ${address}, so nothing was pictured. A route that answers ${status} on purpose names it, as \`{ path, status: ${status} }\``
    : undefined
}

/**
 * Whether the network setting lets a request to `hostname` through: an entry
 * is a host, or `*.` and a domain, which matches the hosts under the domain.
 */
export const allowed = (hostname, allow) =>
  allow.some((entry) =>
    entry.startsWith('*.') ? hostname.endsWith(entry.slice(1)) : hostname === entry,
  )
