/**
 * The part of `css-tree` the survey calls. The package ships no declarations,
 * and `syntax.ts` types the plain nodes `toPlainObject` returns.
 */
declare module 'css-tree' {
  /** What `parse` reports for input it cannot read. */
  export interface ParseError {
    /**
     * The line the error starts on.
     */
    readonly line?: number
    /**
     * What went wrong.
     */
    readonly message: string
  }

  /** The options the survey passes to `parse`. */
  export interface ParseOptions {
    /**
     * Called for each part of the input the parser skips.
     */
    readonly onParseError?: (error: ParseError) => void
    /**
     * Parse a custom property's value as a value, so `var()` in it is a node.
     */
    readonly parseCustomProperty?: boolean
    /**
     * Record each node's line and column.
     */
    readonly positions?: boolean
  }

  /** Writes a node back out as CSS, without whitespace it does not need. */
  export function generate(node: object): string

  /** Parses a stylesheet into a tree whose lists are linked lists. */
  export function parse(source: string, options?: ParseOptions): object

  /** Turns the linked lists of a parsed tree into arrays. */
  export function toPlainObject(tree: object): object
}
