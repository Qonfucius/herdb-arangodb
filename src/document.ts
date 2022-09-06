import {
  Collection,
  CollectionOptions,
  DCollectionOptions,
} from "./collection.ts";
import { Connection } from "./connection.ts";
import { Query, QueryError } from "./query.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { aql, AqlQuery } from "./aql.ts";

// deno-lint-ignore no-empty-interface
interface DocumentOptions extends CollectionOptions {}

export abstract class Document<
  I = typeof this,
> extends Collection {
  _key?: string;

  static connection: Connection;
  constructor(object?: Partial<I>) {
    super();
    Object.assign(this, object);
  }

  static async createCollection(
    idempotent = true,
  ) {
    try {
      return await this.connection
        .query(["collection"])
        .setMethod("POST")
        .setBody({ name: this.collectionName })
        .basicAuth();
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
    return this.connection.query([
      "collection",
      this.collectionName,
      "truncate",
    ]).setMethod("PUT")
      .basicAuth();
  }

  static create<I extends Document>(
    this: StaticDocumentResolver<I>,
    object: I,
  ): Query<I> {
    return this.connection
      .query<I>(["document", this.collectionName])
      .setMethod("POST")
      .setBody(object)
      .setModel(this)
      .setModelDataLookup("new")
      .setModelQueryParameters({ returnNew: "true" })
      .basicAuth();
  }

  create(): Query<typeof this> {
    return Object.getPrototypeOf(this).constructor.create(this);
  }

  static replace<I extends Document>(
    this: StaticDocumentResolver<I>,
    object: I,
  ): Query<I> {
    const key = object._key;
    if (!key) {
      throw new Error(
        `Unable to apply 'update' for Collection ${this.collectionName}, 
         no _key defined`,
      );
    }
    return this.connection
      .query<I>(["document", this.collectionName, object._key!])
      .setMethod("PUT")
      .setBody(object)
      .setModel(this)
      .setModelDataLookup("new")
      .setModelQueryParameters({ returnNew: "true" })
      .basicAuth();
  }

  replace(): Query<typeof this> {
    return Object.getPrototypeOf(this).constructor.replace(this);
  }

  static update<I extends Document>(
    this: StaticDocumentResolver<I>,
    object: I,
  ): Query<I> {
    const key = object._key;
    if (!key) {
      throw new Error(
        `Unable to apply 'replace' for Collection ${this.collectionName}, 
         no _key defined`,
      );
    }
    return this.connection
      .query<I>(["document", this.collectionName, key!])
      .setMethod("PATCH")
      .setBody(object)
      .setModel(this)
      .setModelDataLookup("new")
      .setModelQueryParameters({ returnNew: "true" })
      .basicAuth();
  }

  update(): Query<typeof this> {
    return Object.getPrototypeOf(this).constructor.update(this);
  }

  static query<I extends Document>(
    this: StaticDocumentResolver<I>,
    query: AqlQuery,
  ): Query<I> {
    return this.connection
      .query<I>(["cursor"])
      .setMethod("POST")
      .setBody(query)
      .setModel(this)
      .basicAuth()
      .dataLookup("data");
  }

  static find<I extends Document>(
    this: StaticDocumentResolver<I>,
  ): Query<I> {
    return this.query(aql`FOR doc IN ${this} RETURN doc`)
      .dataLookup("result");
  }

  static findByKey<I extends Document>(
    this: StaticDocumentResolver<I>,
    key: string,
  ): Query<I> {
    return this.connection
      .query<I>(["document", this.collectionName, key])
      .setMethod("GET")
      .setModel(this)
      .basicAuth();
  }
}

export const DDocumentOptions = DCollectionOptions<DocumentOptions>;

export type GenericDocumentConstructor<T> = { new (object?: Partial<T>): T };

// see https://stackoverflow.com/a/42768627
// Allows to solve the type of this in static Document methods by introducing as first parameter `this`.
export type StaticDocumentResolver<T extends Document> = {
  query(query: AqlQuery): Query<T>;
  connection: Connection;
  collectionName: string;
} & GenericDocumentConstructor<T>;
