/**
 * What a column holds, shared by the Table family and the families that read
 * its columns. A module that registers nothing, so a reader of the type does
 * not register the column.
 */

/** What a column holds, which picks the comparisons its filter offers and the field an edit opens. */
export type ColumnType = 'boolean' | 'date' | 'enum' | 'number' | 'text'
