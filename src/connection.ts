import {
  Connection as HerdbConnection,
  DefineConnectionOptions as HerdbDefineConnectionOptions,
} from "./deps.ts";
import { ArangoDBURL, KnownHeaders, Query, urlParsing } from "./query.ts";
import { Collection } from "./collection.ts";

interface ConnectionOptionsWithURL {
  url: string;
}

// @todo
interface ConnectionOptionsWithObject {
  host: string;
  protocol: "http" | "https";
  dbname?: string;
  username?: string;
  password?: string;
}

export type ConnectionOptions = ConnectionOptionsWithURL;

export function ConnectionFactory(options: ConnectionOptions) {
  return new Connection(options);
}

export class Connection implements HerdbConnection<ConnectionOptions> {
  protected options: ConnectionOptions;
  protected registry: Record<string, any> = {};
  public url?: ArangoDBURL;
  constructor(options: ConnectionOptions) {
    this.options = options;
  }
  public async connect() {
    this.url = urlParsing(this.options.url);
    //todo: Test connection to server
    return this;
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
    Model extends new (...args: any) => Model,
    QueryOptions = Record<string, any>,
    Headers = KnownHeaders,
  >(
    path: string | Array<string>,
  ) {
    if (!this.url) {
      throw new Error("Please `connect()` first");
    }
    return new Query<Model, QueryOptions, Headers>(
      this.url!,
      ["_api"].concat(path),
    );
  }
}

export const DefineConnectionOptions = HerdbDefineConnectionOptions<
  ConnectionOptions
>;
