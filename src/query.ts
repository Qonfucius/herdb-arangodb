import { base64encode } from "./deps.ts";
import { QUERY_ERROR } from "./query_error.ts";
import { Document, GenericDocumentConstructor } from "./document.ts";
import { AqlQuery } from "./aql.ts";

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

// deno-lint-ignore no-empty-interface
export interface ConnectionOptions {}
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

export class QueryResponse<M> {
  protected model?: GenericDocumentConstructor<M>;
  protected dataLookupPaths: Set<string> = new Set<string>();

  // deno-lint-ignore no-explicit-any
  constructor(protected response: Response, protected data: any) {}
  static async fromFetch<M>(fetched: Promise<Response>) {
    const response = await fetched;
    return new this<M>(response, await response.json());
  }

  public setModel(model: GenericDocumentConstructor<M>) {
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
    return new model(this.lookup());
  }

  public toModels(model = this.model) {
    if (!model) {
      throw new Error("Model not found");
    }

    const data = this.lookup();
    if (!(data instanceof Array)) {
      throw new TypeError(
        "Query result is not an array, use 'toModel' instead",
      );
    }
    return data.map((entry) => new model(entry));
  }

  public ok() {
    if (this.response.status >= 400) {
      throw new QueryError(this.response, this.data);
    }
    return this;
  }

  public result() {
    return this.lookup();
  }

  public cursor() {
    return this.lookup();
  }

  protected lookup() {
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

type QueryOptions = Record<string, string>;
// deno-lint-ignore no-explicit-any
type BodyQuery = Document | AqlQuery | Record<string, any>;

export class Query<
  M,
  Headers extends KnownHeaders = KnownHeaders,
> implements PromiseLike<M | M[]> {
  protected connectionUrl: ArangoDBURL;
  protected paths: string[] = [];
  protected method: AllowedMethod = "GET";
  protected body?: BodyQuery;
  protected query?: QueryOptions;
  protected headers: Headers = { Accept: "application/json" } as Headers;
  protected model?: GenericDocumentConstructor<M>;
  protected modelDataLookup?: string;
  protected modelQueryParameters?: QueryOptions;
  // deno-lint-ignore no-explicit-any
  protected chained: Set<(query: QueryResponse<M>) => any> = new Set();

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
      this.query ? `?${new URLSearchParams(this.query).toString()}` : ""
    }`;
  }

  public setDatabase(database?: string) {
    this.connectionUrl.database = database;
    return this;
  }

  public setModel(model: GenericDocumentConstructor<M>) {
    this.model = model;
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

  public setQueryParameters(parameters: QueryOptions) {
    this.query = { ...this.query, ...parameters };
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

  public setModelDataLookup(dataLookup: string) {
    this.modelDataLookup = dataLookup;
    return this;
  }

  public setModelQueryParameters(parameters: QueryOptions) {
    this.modelQueryParameters = parameters;
    return this;
  }

  public returnNew(returnNew = true) {
    this.setQueryParameters({ returnNew: returnNew.toString() });
    return this;
  }

  public ok(): this {
    this.chained.add((queryResponse: QueryResponse<M>) => queryResponse.ok());
    return this;
  }

  public toModel(): PromiseLike<M> {
    if (this.modelDataLookup) {
      this.dataLookup(this.modelDataLookup);
      if (this.modelQueryParameters) {
        this.setQueryParameters(this.modelQueryParameters);
      }
    }
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.toModel()
    );
    return this;
  }

  public toModels(): PromiseLike<M[]> {
    if (this.modelDataLookup) {
      this.dataLookup(this.modelDataLookup);
      if (this.modelQueryParameters) {
        this.setQueryParameters(this.modelQueryParameters);
      }
    }
    this.chained.add((queryResponse: QueryResponse<M>) =>
      queryResponse.toModels()
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
    const response = await QueryResponse.fromFetch<M>(
      fetch(this.url, {
        method: this.method,
        body: JSON.stringify(this.body),
        headers: this.headers as unknown as HeadersInit,
      }),
    );

    if (this.model) {
      response.setModel(this.model);
    }

    return [...this.chained]
      .reduce(
        (resp, func: (q: QueryResponse<M>) => QueryResponse<M>) => func(resp),
        response,
      );
  }

  then<TResult1 = QueryResponse<M>, TResult2 = never>(
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
