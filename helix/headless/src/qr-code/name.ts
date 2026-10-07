/**
 * The name a code is read by: its `label`, or with none, the word for a code,
 * or where the value is a web address, `addressed` with it, which puts the
 * word and the address in one sentence.
 *
 * **A value that is no web address is never read out.** A code that sets up
 * an authenticator (`otpauth://…?secret=…`) or joins a network
 * (`WIFI:…;P:…;;`) carries a secret in its value, and the value as the name
 * read that secret aloud to anyone in earshot. A web address is what a
 * sighted reader gets by scanning, so it is said after the word.
 */
export const qrName = (
  label: string,
  value: string,
  word: string,
  addressed: (address: string) => string,
): string => {
  if (label.trim() !== '') {
    return label
  }
  const address = value.trim()
  return /^https?:\/\/\S+$/iu.test(address) ? addressed(address) : word
}
