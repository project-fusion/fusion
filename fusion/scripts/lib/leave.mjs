/**
 * Exits once everything written to standard output and standard error has
 * gone out.
 *
 * **Since Bun 1.4 a write to a pipe finishes after the call that makes it**,
 * so `process.exit()` straight after a report dropped its end, the failure
 * included: CI showed a run stopping mid-line with no reason. A script that
 * writes a long report and then exits with a code awaits this instead.
 *
 * @param {number} code
 * @returns {Promise<never>}
 */
export const leave = async (code) => {
  const flushed = (stream) => new Promise((done) => stream.write('', () => done()))
  await Promise.all([flushed(process.stdout), flushed(process.stderr)])
  process.exit(code)
}
