import { base64encode } from "./deps.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { AqlQuery } from "./aql.ts";
import { ConnectionOptions } from "./connection.ts";

export const InputAllowedProtocol = [
  "arangodb+http:",
  "arangodb+https:",
] as const;
export type InputAllowedProtocol = typeof InputAllowedProtocol[number];

export const ArangoDBAllowedProtocol = ["http:", "https:"] as const;
export type ArangoDBAllowedProtocol = typeof ArangoDBAllowedProtocol[number];

export const AllowedMethod = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type AllowedMethod = typeof AllowedMethod[number];

export enum HeaderContentType {
  JSON = "application/json",
}
export interface KnownHeaders {
  [key: string]: number | string | boolean | undefined;
  Authorization?: string;
  Accept?: HeaderContentType;
}

export interface GenericResponseResult {
  [key: string]: number | string | boolean | GenericResponseResult;
  code: number;
  error: boolean;
}

export interface ArangoDBURL {
  protocol: ArangoDBAllowedProtocol;
  hostname: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  options: ConnectionOptions;
}

export interface QuerySuccess<T = unknown> {
  error: boolean;
  code: number;
  result: T;
}

export interface QueryError {
  error: boolean;
  errorNum?: QUERY_ERROR;
  errorMessage?: string;
  code: number;
}

export type QueryResult<T = unknown> = QuerySuccess<T> & QueryError;

export class QueryError extends Error implements QueryError {
  public status: number;
  public arangoDBCode: QUERY_ERROR;

  constructor(
    status: Pick<Response, "status" | "statusText">,
    json: QueryResult,
  );
  constructor(status: number, message: string, arangoDBCode?: QUERY_ERROR);
  constructor(
    status: number | Pick<Response, "status" | "statusText">,
    message: string | QueryResult,
    arangoDBCode?: QUERY_ERROR,
  ) {
    const merged = {
      status,
      message,
      arangoDBCode,
    };

    if (typeof status === "object") {
      if (status.status) {
        merged.status = status.status;
      }
      if (status.statusText) {
        merged.message = status.statusText;
      }
    }

    if (typeof message === "object") {
      if (message.code) {
        merged.status = message.code;
      }
      if (message.errorNum) {
        merged.arangoDBCode = message.errorNum;
      }
      if (message.errorMessage) {
        merged.message = message.errorMessage;
      }
    }

    super(merged.message as string);
    Object.setPrototypeOf(this, QueryError.prototype);
    this.status = merged.status as number;
    this.arangoDBCode = merged.arangoDBCode as number;
  }
  public toString() {
    return `${this.status} - ${this.arangoDBCode} - ${this.message}`;
  }
}

export function uriParsing(url: string): ArangoDBURL {
  const parsed = new URL(url);
  const port = +parsed.port;
  const query = [...new URLSearchParams(parsed.search).entries()].reduce(
    (acc, [key, value]) => {
      return { ...acc, [key]: value };
    },
    {} as ConnectionOptions,
  );
  const pathname = parsed.pathname.replace(/^\/+/, "");
  if (!InputAllowedProtocol.includes(parsed.protocol as InputAllowedProtocol)) {
    throw new Error(`Protocol "${parsed.protocol}" is not allowed`);
  }

  return {
    database: pathname.length > 0 ? pathname : undefined,
    hostname: parsed.hostname,
    username: parsed.username,
    password: parsed.password,
    port: Number.isNaN(port) ? 8529 : port,
    protocol: parsed.protocol.replace(
      "arangodb+",
      "",
    ) as ArangoDBAllowedProtocol,
    options: query,
  };
}

export class QueryResponse<R, M> {
  // deno-lint-ignore no-explicit-any
  protected toModelFactory?: (data: any) => M;
  protected toModelCached?: M;
  protected toModelResolved = false;

  protected resultCached?: R;
  protected resultResolved = false;

  protected dataLookupPaths: string[] = [];

  // deno-lint-ignore no-explicit-any
  constructor(public response: Response, protected data: any) {}

  static async fromFetch<R, M>(fetched: Promise<Response>) {
    const response = await fetched;
    return new this<R, M>(response, await response.json());
  }

  // deno-lint-ignore no-explicit-any
  public setToModelFactory(toModelFactory: (data: any) => M) {
    this.toModelFactory = toModelFactory;
    return this;
  }

  public ok() {
    if (this.response.status >= 400) {
      throw new QueryError(this.response, this.data);
    }
    return this;
  }

  public json() {
    return this.data;
  }

  public toModel(): M {
    if (this.toModelResolved) {
      return this.toModelCached!;
    }
    if (!this.toModelFactory) {
      throw new Error("No Model Factory found");
    }
    this.ok();
    this.toModelCached = this.toModelFactory(this.lookup(true));
    this.toModelResolved = true;
    return this.toModelCached!;
  }

  public result(): R {
    if (this.resultResolved) {
      return this.resultCached!;
    }
    this.ok();
    this.resultCached = this.lookup(true);
    this.resultResolved = true;
    return this.resultCached!;
  }

  public cursor(): R {
    this.ok();
    return this.lookup(true);
  }

  protected lookup(raiseOnPartialLookup = false) {
    if (this.dataLookupPaths.length === 0) {
      return this.data;
    }

    let lookupResult = this.data;
    for (const path of this.dataLookupPaths) {
      if (path in lookupResult) {
        lookupResult = lookupResult[path];
      } else {
        if (raiseOnPartialLookup) {
          throw new Error(
            `Data lookup on path '${this.dataLookupPaths}' failed`
          );
        }
        lookupResult = null;
        break;
      }
    }
    return lookupResult;
  }

  public dataLookup(...params: string[]) {
    this.dataLookupPaths = params;
    return this;
  }
}

export class ResolvedQueryResponse<R, M> extends QueryResponse<R, M> {
  // deno-lint-ignore no-explicit-any
  constructor(data: any, toModelCached: M) {
    super(new Response(), data);
    this.toModelCached = toModelCached;
    this.toModelResolved = true;
    this.resultResolved = true;
  }

  public ok() {
    return this;
  }
}

type QueryOptions = Record<string, string>;
// deno-lint-ignore no-explicit-any
type BodyQuery = AqlQuery | Record<string, any>;

export class Query<
  R,
  M,
  Headers extends KnownHeaders = KnownHeaders,
> implements PromiseLike<QueryResponse<R, M>> {
  protected connectionUrl: ArangoDBURL;
  protected paths: string[] = [];
  protected method: AllowedMethod = "GET";
  protected body?: BodyQuery;
  protected queryParameters?: QueryOptions;
  protected headers: Headers = { Accept: "application/json" } as Headers;
  protected dataLookupPaths: string[] = [];
  protected isResolved = false;
  protected response?: QueryResponse<R, M>;
  // deno-lint-ignore no-explicit-any
  protected toModelFactory?: (data: any) => M;

  constructor(
    connectionUrl: string | ArangoDBURL,
    paths: string | string[] = [],
  ) {
    this.paths = Array.isArray(paths) ? paths : [paths];
    if (typeof connectionUrl === "string") {
      this.connectionUrl = uriParsing(connectionUrl);
    } else {
      this.connectionUrl = connectionUrl;
    }
  }

  protected get baseURL() {
    return `${this.connectionUrl.protocol}//${this.connectionUrl.hostname}:${this.connectionUrl.port}`;
  }

  protected get url() {
    let url = this.baseURL;
    if (this.connectionUrl.database) {
      url += `/_db/${this.connectionUrl.database}`;
    }
    return `${url}/${this.paths.join("/")}${
      this.queryParameters
        ? `?${new URLSearchParams(this.queryParameters).toString()}`
        : ""
    }`;
  }

  public setDatabase(database?: string) {
    this.connectionUrl.database = database;
    return this;
  }

  // deno-lint-ignore no-explicit-any
  public setToModelFactory(toModelFactory: (data: any) => M) {
    this.toModelFactory = toModelFactory;
    return this;
  }

  public setMethod(method: AllowedMethod) {
    this.method = method;
    return this;
  }

  public setBody(body: BodyQuery) {
    this.body = body;
    return this;
  }

  public setHeaders(headers: Headers) {
    this.headers = headers;
    return this;
  }

  public setHeader(key: keyof Headers, value: Headers[keyof Headers] | null) {
    if (value) {
      this.headers[key] = value;
    } else {
      delete this.headers[key];
    }
    return this;
  }

  public setQueryParameters(queryParameters: QueryOptions) {
    this.queryParameters = { ...this.queryParameters, ...queryParameters };
    return this;
  }

  public dataLookup(...paths: string[]) {
    this.dataLookupPaths = paths;
    return this;
  }

  public resolveWith(response: QueryResponse<R, M>) {
    this.response = response;
    this.isResolved = true;
  }

  public async exec(): Promise<QueryResponse<R, M>> {
    if (!this.isResolved) {
      this.response = await QueryResponse.fromFetch<R, M>(
        fetch(this.url, {
          method: this.method,
          body: JSON.stringify(this.body),
          headers: this.headers as unknown as HeadersInit,
        }),
      );

      this.response.dataLookup(...this.dataLookupPaths);
      if (this.toModelFactory) {
        this.response!.setToModelFactory(this.toModelFactory);
      }

      this.isResolved = true;
    }

    return this.response!;
  }

  then<TResult1 = QueryResponse<R, M>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse<R, M>) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      // deno-lint-ignore no-explicit-any
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  public basicAuth(enable = true) {
    if (enable) {
      if (!this.connectionUrl.username || !this.connectionUrl.password) {
        throw new Error("Cannot set basic auth, missing credentials");
      }
      return this.setHeader(
        "Authorization" as keyof Headers,
        `Basic ${
          base64encode(
            `${this.connectionUrl.username}:${this.connectionUrl.password}`,
          )
        }` as unknown as Headers[keyof Headers],
      );
    } else {
      return this.setHeader(
        "Authorization" as keyof Headers,
        null,
      );
    }
  }
}
