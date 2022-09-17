import { ModelBaseClassInterface } from "./model.ts";

const DOCUMENT = Symbol();

/**
 * Common ArangoDB metadata properties of a document.
 * All optional to create models not yet persisted
 */
export interface DocumentMetadata {
  readonly _key?: string;
  readonly _id?: string;
  readonly _rev?: string;
}

/**
 * Helper to retrieve the document type associated with the model
 */
export type DocumentInfer<T> = T extends { [DOCUMENT]: infer D } ? D
  : DocumentMetadata;

export interface DocumentInterface<D> extends DocumentMetadata {
  getDocument(): D;
  toJSON(): D;
}

// deno-lint-ignore no-empty-interface
export interface DocumentClassInterface {}

export function DocumentMixin<D extends DocumentMetadata>() {
  return function <
    B extends ModelBaseClassInterface,
  >(BaseModel: B) {
    return class Document extends BaseModel implements DocumentInterface<D> {
      /**
       * Unique key identifier inside the collection
       */
      public get _key() {
        return this.getDocument()._key;
      }

      /**
       * Unique ID inside the database (basically `collectionName/_key`)
       */
      public get _id() {
        return this.getDocument()._id;
      }

      /**
       * Revision ID
       */
      public get _rev() {
        return this.getDocument()._rev;
      }

      public [DOCUMENT]!: D;

      /**
       * The real class constructor.
       * Defines the document object, on which the mapped properties are based
       *
       * @param document
       * @returns
       */
      protected initialize(document: D) {
        this[DOCUMENT] = document;

        return this;
      }

      /**
       * Find the raw document of the model
       */
      public getDocument() {
        return this[DOCUMENT];
      }

      /**
       * JSON formatting is done from the document
       */
      public toJSON() {
        return this[DOCUMENT];
      }
    };
  };
}
