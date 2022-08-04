import { base64encode } from "./deps.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { ChildDocument, Document } from "./document.ts";

export const AllowedProtocol = ["http:", "https:"] as const;
export type AllowedProtocol = typeof AllowedProtocol[number];

export const AllowedMethod = ["GET", "POST", "PUT", "DELETE"] as const;
export type AllowedMethod = typeof AllowedMethod[number];

export enum HeaderContentType {
  JSON = "application/json",
}
export interface KnownHeaders {
  [key: string]: number | string | boolean | undefined;
  Authorization?: string;
  Accept?: HeaderContentType;
}

// deno-lint-ignore no-empty-interface
export interface ConnectionOptions {}
export interface ArangoDBURL {
  protocol: AllowedProtocol;
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

export function urlParsing(url: string): ArangoDBURL {
  const parsed = new URL(url);
  const port = +parsed.port;
  const query = [...new URLSearchParams(parsed.search).entries()].reduce(
    (acc, [key, value]) => {
      return { ...acc, [key]: value };
    },
    {} as ConnectionOptions,
  );
  const pathname = parsed.pathname.replace(/^\/+/, "");
  return {
    database: pathname.length > 0 ? pathname : undefined,
    hostname: parsed.hostname,
    username: parsed.username,
    password: parsed.password,
    port: Number.isNaN(port) ? 8529 : port,
    protocol:
      (AllowedProtocol.includes(parsed.protocol as AllowedProtocol)
        ? parsed.protocol
        : "http:") as AllowedProtocol,
    options: query,
  };
}

export class QueryResponse<M extends ChildDocument> {
  protected model?: M;
  protected dataLookupPaths: Set<string> = new Set<string>();

  // deno-lint-ignore no-explicit-any
  constructor(protected response: Response, protected data: any) {}
  static async fromFetch<M extends ChildDocument>(fetched: Promise<Response>) {
    const response = await fetched;
    return new this<M>(response, await response.json());
  }

  public setModel(model?: M) {
    this.model = model;
    return this;
  }

  public json() {
    return this.data;
  }

  public toModel(model = this.model) {
    if (!model) {
      throw new Error("Model not found");
    }
    return new model(this.data);
  }

  public ok(): this {
    if (this.response.status >= 400) {
      throw new QueryError(this.response, this.data);
    }
    return this;
  }

  public result() {
    if (this.dataLookupPaths.size === 0) {
      return this.data;
    }
    for (const path of this.dataLookupPaths.values()) {
      if (this.data[path]) {
        return this.data[path];
      }
    }
    return null;
  }

  public cursor() {
    if (this.dataLookupPaths.size === 0) {
      return this.data;
    }
    for (const path of this.dataLookupPaths.values()) {
      if (this.data[path]) {
        return this.data[path];
      }
    }
    return null;
  }
  public dataLookup(...params: string[]) {
    this.dataLookupPaths = new Set(params);
    return this;
  }
}

export class Query<
  M extends ChildDocument = ChildDocument,
  QueryOptions extends Record<string, string> = Record<string, string>,
  Headers extends KnownHeaders = KnownHeaders,
> implements PromiseLike<ChildDocument> {
  protected connectionUrl: ArangoDBURL;
  protected paths: string[] = [];
  protected method: AllowedMethod = "GET";
  protected body?: Document;
  protected query?: QueryOptions;
  protected headers: Headers = { Accept: "application/json" } as Headers;
  protected model?: M;
  // deno-lint-ignore no-explicit-any
  protected chained: Set<(query: QueryResponse<M>) => any> = new Set();

  constructor(
    connectionUrl: string | ArangoDBURL,
    paths: string | string[] = [],
  ) {
    this.paths = Array.isArray(paths) ? paths : [paths];
    if (typeof connectionUrl === "string") {
      this.connectionUrl = urlParsing(connectionUrl);
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
      this.query ? `?${new URLSearchParams(this.query).toString()}` : ""
    }`;
  }

  public setDatabase(database?: string) {
    this.connectionUrl.database = database;
    return this;
  }

  public setModel(model: M) {
    this.model = model;
    return this;
  }

  public setMethod(method: AllowedMethod) {
    this.method = method;
    return this;
  }

  public setBody(body: Document) {
    this.body = body;
    return this;
  }

  public setQueryParameters(parameters: QueryOptions) {
    this.query = parameters;
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

  public ok() {
    this.chained.add((queryResponse: QueryResponse<M>) => queryResponse.ok());
    return this;
  }

  public toModel() {
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.toModel()
    );
    return this;
  }

  public json() {
    this.chained.add((queryResponse: QueryResponse<M>) => queryResponse.json());
    return this;
  }

  public result() {
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.result()
    );
    return this;
  }

  public cursor() {
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.cursor()
    );
    return this;
  }

  public dataLookup(...paths: string[]) {
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.dataLookup(...paths)
    );
    return this;
  }

  public async exec() {
    const response = (await QueryResponse.fromFetch<M>(fetch(this.url, {
      method: this.method,
      body: JSON.stringify(this.body),
      headers: this.headers as unknown as HeadersInit,
    }))).setModel(this.model);
    return [...this.chained]
      .reduce(
        (resp, func: (q: QueryResponse<M>) => QueryResponse<M>) => func(resp),
        response,
      );
  }

  then<TResult1 = QueryResponse<ChildDocument>, TResult2 = never>(
    onfulfilled?:
      // deno-lint-ignore no-explicit-any
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
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
