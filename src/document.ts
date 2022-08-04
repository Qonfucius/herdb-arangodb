import {
  Collection,
  CollectionOptions,
  DCollectionOptions,
} from "./collection.ts";
import { Connection } from "./connection.ts";
import { QueryError } from "./query.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { aql, AqlQuery } from "./aql.ts";

// deno-lint-ignore no-empty-interface
interface DocumentOptions extends CollectionOptions {}

export abstract class Document<
  I = typeof this,
> extends Collection {
  static connection: Connection;
  constructor(object?: I) {
    super();
    Object.assign(this, object);
  }

  static async createCollection(
    idempotent = true,
  ) {
    try {
      return await this.connection.query(["collection"]).setMethod("POST")
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
    object: I,
  ) {
    const collectionName = this.collectionName;
    return this.connection.query<I>(["document", collectionName])
      .setMethod("POST").setBody(object)
      // @todo: don't returnNew by default
      .setQueryParameters({ returnNew: "true" })
      .basicAuth()
      // @todo: don't returnNew by default
      .dataLookup("new");
  }

  static query(query: AqlQuery) {
    return this.connection.query(["cursor"]).setMethod("POST").setBody(query)
      .basicAuth().dataLookup("data");
  }

  static find() {
    return this.query(aql`FOR doc IN ${this} RETURN doc`).dataLookup("result");
  }

  static findByKey(key: string) {
    return this.connection.query(["document", this.collectionName, key])
      .setMethod("GET")
      .basicAuth();
  }
}

export const DDocumentOptions = DCollectionOptions<DocumentOptions>;
export type ChildDocument<
  // deno-lint-ignore no-explicit-any
  T extends new (...args: any[]) => Record<string, any> = new (
    // deno-lint-ignore no-explicit-any
    ...args: any[]
    // deno-lint-ignore no-explicit-any
  ) => Record<string, any>,
> // deno-lint-ignore no-explicit-any
 = new (...args: any[]) => Document<T>;
