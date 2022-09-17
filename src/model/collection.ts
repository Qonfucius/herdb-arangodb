import { GenericResponseResult, QueryError } from "../query.ts";
import { QUERY_ERROR } from "../query_error.ts";
import { ModelBaseClassInterface } from "./model.ts";
import { ConfigureOptions, MODEL_OPTIONS_SYMBOL } from "./configure.ts";
import { Case, plural } from "../deps.ts";

const COLLECTION_NAME = Symbol();

// deno-lint-ignore no-empty-interface
export interface CollectionInterface {}

export interface CollectionClassInterface {
  collectionName: string;
}

export function CollectionMixin() {
  return function <
    B extends ModelBaseClassInterface,
  >(BaseModel: B) {
    return class Collection extends BaseModel implements CollectionInterface {
      private static [COLLECTION_NAME]: string;

      /**
       * Returns the name of the collection, based on the model name
       * or from configuration options, if defined.
       */
      public static get collectionName(): string {
        if (this[COLLECTION_NAME]) {
          return this[COLLECTION_NAME];
        }
        const options = (Reflect.getMetadata(
          MODEL_OPTIONS_SYMBOL,
          this,
        ) ?? {}) as ConfigureOptions;

        const normalizer = (
          this.connection.options.collectionNameNormalizer ??
            ((arg) => Case.paramCase(plural(arg)))
        ) as (arg: string) => string;

        this[COLLECTION_NAME] = options.name ?? normalizer(this.name);

        return this[COLLECTION_NAME];
      }

      /**
       * Create the collection in base
       */
      public static async createCollection(idempotent = true) {
        try {
          return await this.connection
            .query<GenericResponseResult>(["collection"])
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
      /**
       * Empty the collection of its documents
       */
      public static truncateCollection() {
        return this.connection.query<GenericResponseResult>([
          "collection",
          this.collectionName,
          "truncate",
        ]).setMethod("PUT")
          .basicAuth();
      }

      // TODO
      //public static deleteCollection() {}
    };
  };
}
