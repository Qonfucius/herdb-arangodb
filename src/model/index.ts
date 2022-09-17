import { GenericResponseResult, KnownHeaders, Query } from "../query.ts";
import { ModelBaseClassInterface } from "./model.ts";
import { CollectionClassInterface } from "./collection.ts";

/**
 * Listing of index types available in ArnagoDB
 */
export enum IndexType {
  Hash = "hash",
  Skiplist = "skiplist",
  Persistent = "persistent",
  Ttl = "ttl",
  Zkd = "zkd",
  Geo = "geo",
  Fulltext = "fulltext",
}

/**
 * Basic index creation payload interface
 */
export interface IndexDef {
  type: IndexType;
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
  estimates?: boolean;
  inBackground?: boolean;
  minLength?: number;
  geoJson?: string;
  fieldValueTypes?: string;
  expireAfter?: number;
}

// deno-lint-ignore no-empty-interface
export interface IndexInterface {}

export interface IndexClassInterface<D> {
  getIndexes(): Query<IndexDef[], unknown, KnownHeaders>;
  getIndex(nameOrId: string): Query<IndexDef, unknown, KnownHeaders>;
  createIndex(indexDef: IndexDef): Query<IndexDef, unknown, KnownHeaders>;
  removeIndex(
    nameOrId: string,
  ): Query<GenericResponseResult, unknown, KnownHeaders>;
}

export function IndexMixin() {
  return function <
    B extends ModelBaseClassInterface & CollectionClassInterface,
  >(BaseModel: B) {
    return class Index extends BaseModel implements IndexInterface {
      /**
       * Returns the list of indexes currently defined in base on the collection
       */
      public static getIndexes() {
        return this.connection
          .query<IndexDef[]>(["index"])
          .setQueryParameters({ collection: this.collectionName })
          .setMethod("GET")
          .dataLookup("indexes")
          .basicAuth();
      }

      /**
       * Returns from its name, the definition of an index defined in base
       * on the collection
       */
      public static getIndex(nameOrId: string) {
        return this.connection
          .query<IndexDef>(["index", this.collectionName, nameOrId])
          .setMethod("GET")
          .basicAuth();
      }

      /**
       * Create a new index, returns its definition
       */
      public static createIndex(indexDef: IndexDef) {
        return this.connection
          .query<IndexDef>(["index"])
          .setQueryParameters({ collection: this.collectionName })
          .setMethod("POST")
          .setBody(indexDef)
          .basicAuth();
      }

      /**
       * Delete an index from its name or identifier
       */
      public static removeIndex(nameOrId: string) {
        return this.connection
          .query<GenericResponseResult>([
            "index",
            this.collectionName,
            nameOrId,
          ])
          .setMethod("DELETE")
          .basicAuth();
      }
    };
  };
}
