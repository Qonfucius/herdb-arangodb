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

export type DocumentLikeConstructor<M> = { new (object?: Partial<M>): M };

// see https://stackoverflow.com/a/42768627
// Allows to solve the type of this in static Document methods by introducing as first parameter `this`.
export type StaticDocumentInterface<M = typeof this> = {
  query(query: AqlQuery): Query<unknown, M>;
  connection: Connection;
  collectionName: string;
} & DocumentLikeConstructor<M>;

export abstract class Document<
  M = typeof this,
> extends Collection {
  _key?: string;
  _id?: string;
  _rev?: string;

  static connection: Connection;
  constructor(object?: Partial<M>) {
    super();
    Object.assign(this, object);
  }

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

  static async createCollection(
    idempotent = true,
  ) {
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

  static create<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
    object: Partial<M>,
  ) {
    return this.connection
      .query<unknown, M>(["document", this.collectionName])
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

  static replace<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
    object: M,
  ) {
    const key = object._key;
    if (!key) {
      throw new Error(
        `Unable to apply 'update' for Collection ${this.collectionName}, 
         no _key defined`,
      );
    }
    return this.connection
      .query<unknown, M>(["document", this.collectionName, object._key!])
      .setMethod("PUT")
      .setBody(object)
      .setModel(this)
      .setModelDataLookup("new")
      .setModelQueryParameters({ returnNew: "true" })
      .basicAuth();
  }

  replace(): Query<unknown, this> {
    return Object.getPrototypeOf(this).constructor.replace(this);
  }

  static update<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
    object: M,
  ) {
    const key = object._key;
    if (!key) {
      throw new Error(
        `Unable to apply 'replace' for Collection ${this.collectionName}, 
         no _key defined`,
      );
    }
    return this.connection
      .query<unknown, M>(["document", this.collectionName, key!])
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

  static query<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
    query: AqlQuery,
  ) {
    return this.connection
      .query<unknown, M>(["cursor"])
      .setMethod("POST")
      .setBody(query)
      .setModel(this)
      .basicAuth()
      .dataLookup("data");
  }

  static find<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
  ) {
    return this.query(aql`FOR doc IN ${this} RETURN doc`)
      .dataLookup("result");
  }

  static findByKey<M extends Document = Document>(
    this: StaticDocumentInterface<M>,
    key: string,
  ) {
    return this.connection
      .query<unknown, M>(["document", this.collectionName, key])
      .setMethod("GET")
      .setModel(this)
      .basicAuth();
  }
}

export const DDocumentOptions = DCollectionOptions<DocumentOptions>;
