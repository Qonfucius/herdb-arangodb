/**
 * Common ArangoDB metadata properties of a document.
 */
export interface DocumentMetadata {
  // Unique key identifier inside the collection
  _key: string;
  // Unique ID inside the database (basically `collectionName/_key`)
  _id: string;
  // Revision ID
  _rev: string;
}
