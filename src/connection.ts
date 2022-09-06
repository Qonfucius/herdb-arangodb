import {
  Connection as HerdbConnection,
  DefineConnectionOptions as HerdbDefineConnectionOptions,
} from "./deps.ts";
import {
  ArangoDBURL,
  KnownHeaders,
  Query,
  QueryError,
  uriParsing,
} from "./query.ts";
import { Collection } from "./collection.ts";
import { QUERY_ERROR } from "./query_error.ts";

interface ConnectionOptionsWithURI {
  uri: string;
}

// @todo
// interface ConnectionOptionsWithObject {
//   host: string;
//   protocol: "http" | "https";
//   dbname?: string;
//   username?: string;
//   password?: string;
// }

export interface ConnectionOptions extends ConnectionOptionsWithURI {
  collectionNameNormalizer?: (name: string) => string;
}

export function ConnectionFactory(options: ConnectionOptions) {
  return new Connection(options);
}

interface CurrentDatabaseInformation {
  id: string;
  name: string;
  isSystem: boolean;
  path: string;
}

export class Connection implements HerdbConnection<ConnectionOptions> {
  public options: ConnectionOptions = {} as ConnectionOptions;
  protected registry: Record<string, Collection> = {};
  public url?: ArangoDBURL;
  constructor(options: ConnectionOptions) {
    this.options = options;
  }
  public async connect() {
    this.url = uriParsing(this.options.uri);
    try {
      await this.getCurrentDatabaseInformation();
    } catch (e) {
      throw new Error("Cannot connect arangodb. \n -> " + e.toString());
    }
    return this;
  }

  public getCurrentDatabaseInformation() {
    if (!this.url!.database) {
      throw new Error("Database name not found");
    }
    return this.query<CurrentDatabaseInformation>([
      "database",
      "current",
    ], this.url)
      .setMethod("GET")
      .basicAuth().ok().result();
  }

  public switchDatabase(name: string) {
    this.url!.database = name;
    return this;
  }

  public async createDatabase(idempotent = true) {
    if (!this.url!.database) {
      throw new Error("Database name not found");
    }
    try {
      return (await this.query(
        ["database"],
        { ...this.url, database: undefined } as ArangoDBURL,
      )
        .setMethod("POST").setBody({ "name": this.url!.database })
        .basicAuth());
    } catch (e) {
      if (
        !(e instanceof QueryError) || !idempotent ||
        e.arangoDBCode != QUERY_ERROR.ARANGO_DUPLICATE_NAME
      ) {
        throw e;
      }
    }
  }

  public register(
    model: typeof Collection,
    key: string | undefined = model.name,
  ) {
    if (!key) {
      throw new Error(
        "When class name is empty, register should have key in second parameter",
      );
    }
    model.connection = this;
    this.registry[key] = model;
    return this;
  }

  public model(key: string) {
    return this.registry[key];
  }
  public query<
    Model,
    Headers extends KnownHeaders = KnownHeaders,
  >(
    path: string | Array<string>,
    url = this.url,
  ) {
    if (!url) {
      throw new Error("Please `connect()` first");
    }
    return new Query<Model, Headers>(
      url,
      ["_api"].concat(path),
    );
  }
}

export const DefineConnectionOptions = HerdbDefineConnectionOptions<
  ConnectionOptions
>;
