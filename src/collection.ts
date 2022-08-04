import { Connection } from "./connection.ts";
import { Case, plural } from "./deps.ts";
const COLLECTION_OPTIONS_SYMBOL = Symbol();
const IS_COLLECTION_SYMBOL = Symbol();

export interface CollectionOptions {
  name?: string;
}

export class Collection {
  static [IS_COLLECTION_SYMBOL] = true;
  static get collectionName(): string {
    const options = (Reflect.getMetadata(
      COLLECTION_OPTIONS_SYMBOL,
      this,
    ) ?? {}) as CollectionOptions;
    const normalizer: (arg: string) => string =
      this.connection.options.collectionNameNormalizer ??
        ((arg) => Case.paramCase(plural(arg)));
    return options.name ?? normalizer(this.name);
  }

  static connection: Connection;
  //todo: async create(idempotent: boolean = true, options: object = {}): this
}

export function DCollectionOptions<
  O extends CollectionOptions = CollectionOptions,
>(options: O = {} as O) {
  return function decorator(target: typeof Collection) {
    return Reflect.defineMetadata(
      COLLECTION_OPTIONS_SYMBOL,
      options,
      target,
    );
  };
}

export function isCollection(
  // deno-lint-ignore no-explicit-any
  collection: any,
): collection is typeof Collection {
  return collection && collection[IS_COLLECTION_SYMBOL];
}
