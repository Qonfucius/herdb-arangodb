import {
  Collection,
  CollectionOptions,
  DCollectionOptions,
} from "./collection.ts";
import { Connection } from "./connection.ts";
import { GenericResponseResult, Query, QueryError } from "./query.ts";
import { IndexDef } from "./index.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { aql, AqlQuery } from "./aql.ts";

// deno-lint-ignore no-empty-interface
interface DocumentOptions extends CollectionOptions {}

export type DocumentLikeConstructor<R, M> = { new (object?: Partial<R>): M };

export interface DocumentMetadata {
  _key?: string;
  _id?: string;
  _rev?: string;
}

export abstract class Document<R extends DocumentMetadata> extends Collection
  implements DocumentMetadata {
  constructor(object?: Partial<R>) {
    super();
    Object.assign(this, object);
  }
}

export function DocumentInterface<
  M,
  R extends DocumentMetadata = Partial<M>,
>() {
  return class extends Document<R> {
    static connection: Connection;

    static getIndexes() {
      return this.connection
        .query<IndexDef[]>(["index"])
        .setQueryParameters({ collection: this.collectionName })
        .setMethod("GET")
        .dataLookup("indexes")
        .basicAuth();
    }

    static getIndex(nameOrId: string) {
      return this.connection
        .query<IndexDef>(["index", this.collectionName, nameOrId])
        .setMethod("GET")
        .basicAuth();
    }

    static createIndex(indexDef: IndexDef) {
      return this.connection
        .query<IndexDef>(["index"])
        .setQueryParameters({ collection: this.collectionName })
        .setMethod("POST")
        .setBody(indexDef)
        .basicAuth();
    }

    static removeIndex(nameOrId: string) {
      return this.connection
        .query<GenericResponseResult>(["index", this.collectionName, nameOrId])
        .setMethod("DELETE")
        .basicAuth();
    }

    static async createCollection(idempotent = true) {
      try {
        return await this.connection
          .query<GenericResponseResult>(["collection"])
          .setMethod("POST")
          .setBody({ name: this.collectionName })
          .basicAuth() as Promise<GenericResponseResult>;
      } catch (e) {
        if (
          !(e instanceof QueryError) || !idempotent ||
          e.arangoDBCode != QUERY_ERROR.ARANGO_DUPLICATE_NAME
        ) {
          throw e;
        }
      }
    }

    static truncateCollection() {
      return this.connection.query<GenericResponseResult>([
        "collection",
        this.collectionName,
        "truncate",
      ]).setMethod("PUT")
        .basicAuth();
    }

    static create(object: R) {
      return this.connection
        .query<R, M>(["document", this.collectionName])
        .setMethod("POST")
        .setBody(object)
        .setModel(this)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
    }

    create(): Query<unknown, this> {
      return Object.getPrototypeOf(this).constructor.create(this);
    }

    static replace(object: R) {
      const key = object._key;
      if (!key) {
        throw new Error(
          `Unable to apply 'update' for Collection ${this.collectionName}, 
          no _key defined`,
        );
      }
      return this.connection
        .query<R, M>(["document", this.collectionName, object._key!])
        .setMethod("PUT")
        .setBody(object)
        .setModel(this)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
    }

    replace(): Query<R, M> {
      return Object.getPrototypeOf(this).constructor.replace(this);
    }

    static update(object: R) {
      const key = object._key;
      if (!key) {
        throw new Error(
          `Unable to apply 'update' for Collection ${this.collectionName}, 
          no _key defined`,
        );
      }
      return this.connection
        .query<R, M>(["document", this.collectionName, key!])
        .setMethod("PATCH")
        .setBody(object)
        .setModel(this)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
    }

    update(): Query<unknown, this> {
      return Object.getPrototypeOf(this).constructor.update(this);
    }

    static query(query: AqlQuery) {
      return this.connection
        .query<R, M>(["cursor"])
        .setMethod("POST")
        .setBody(query)
        .setModel(this)
        .basicAuth()
        .dataLookup("data");
    }

    static find() {
      return this.query(aql`FOR doc IN ${this} RETURN doc`)
        .dataLookup("result");
    }

    static findByKey(key: string) {
      return this.connection
        .query<R, M>(["document", this.collectionName, key])
        .setMethod("GET")
        .setModel(this)
        .basicAuth();
    }
  };
}

export const DDocumentOptions = DCollectionOptions<DocumentOptions>;
