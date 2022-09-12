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

interface DocumentClassInterface<R, M> {
  create(object: R | M): Query<R, M>;
  replace(object: R | M): Query<R, M>;
  update(object: R | M): Query<R, M>;
  delete(object: R | M): Query<R, M>;
}

export class Document<R extends DocumentMetadata> extends Collection
  implements DocumentMetadata {
  _key?: string;
  _id?: string;
  _rev?: string;

  constructor(object?: R) {
    super();
    Object.assign(this, object);
  }

  create(): Query<R, this> {
    return (Object.getPrototypeOf(this).constructor as DocumentClassInterface<
      R,
      this
    >).create(this);
  }

  replace(): Query<R, this> {
    return (Object.getPrototypeOf(this).constructor as DocumentClassInterface<
      R,
      this
    >).replace(this);
  }

  update(): Query<R, this> {
    return (Object.getPrototypeOf(this).constructor as DocumentClassInterface<
      R,
      this
    >).update(this);
  }

  delete(): Query<R, this> {
    return (Object.getPrototypeOf(this).constructor as DocumentClassInterface<
      R,
      this
    >).delete(this);
  }
}

export function DocumentClassFactory<
  M,
  R extends DocumentMetadata,
>() {
  return class DocumentClassFactory extends Document<R> {
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

    static create(object: R | M) {
      return this.connection
        .query<R, M>(["document", this.collectionName])
        .setMethod("POST")
        .setBody(object)
        .setModel(this as unknown as DocumentLikeConstructor<R, M>)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
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
        .setModel(this as unknown as DocumentLikeConstructor<R, M>)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
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
        .setModel(this as unknown as DocumentLikeConstructor<R, M>)
        .setModelDataLookup("new")
        .setModelQueryParameters({ returnNew: "true" })
        .basicAuth();
    }

    static delete(object: R) {
      const key = object._key;
      if (!key) {
        throw new Error(
          `Unable to apply 'delete' for Collection ${this.collectionName}, 
          no _key defined`,
        );
      }
      return this.connection
        .query<GenericResponseResult>(["document", this.collectionName, key!])
        .setMethod("DELETE")
        .basicAuth();
    }

    static query(query: AqlQuery) {
      return this.connection
        .query<R, M>(["cursor"])
        .setMethod("POST")
        .setBody(query)
        .setModel(this as unknown as DocumentLikeConstructor<R, M>)
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
        .setModel(this as unknown as DocumentLikeConstructor<R, M>)
        .basicAuth();
    }
  };
}

export const DDocumentOptions = DCollectionOptions<DocumentOptions>;
