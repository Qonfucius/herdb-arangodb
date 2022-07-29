import { base64encode } from "./deps.ts";

export const AllowedProtocol = ["http:", "https:"] as const;
export type AllowedProtocol = typeof AllowedProtocol[number];

export const AllowedMethod = ["GET", "POST"] as const;
export type AllowedMethod = typeof AllowedMethod[number];

export interface KnownHeaders {
  [key: string]: number | string | boolean;
  Authorization: string;
  Accept: string;
}

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

export class Query<
  Model extends new (...args: any) => Model,
  QueryOptions = Record<string, any>,
  Headers = KnownHeaders,
> implements PromiseLike<Model> {
  protected connectionUrl: ArangoDBURL;
  protected paths: string[] = [];
  protected method: AllowedMethod = "GET";
  protected body?: Model;
  protected query?: QueryOptions;
  protected headers: Headers = {} as Headers;
  protected wrapper?: Model;

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
      this.query ? `?${JSON.stringify(this.query)}` : ""
    }`;
  }

  public setDatabase(database?: string) {
    this.connectionUrl.database = database;
  }

  public setWrapper(wrapper: Model) {
    this.wrapper = wrapper;
  }

  public setMethod(method: AllowedMethod) {
    this.method = method;
    return this;
  }

  public setBody(body: Model) {
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

  public setHeader(key: keyof Headers, value: Headers[keyof Headers]) {
    this.headers[key] = value;
    return this;
  }

  public async exec() {
    console.log(this.url);
    const response = await fetch(this.url, {
      method: this.method,
      body: JSON.stringify(this.body),
      headers: this.headers as unknown as HeadersInit,
    });
    const json = response.json();
    if (this.wrapper) {
      return new (this.wrapper)(json);
    }
    return json;
  }

  then<TResult1 = Model, TResult2 = never>(
    onfulfilled?:
      | ((value: Model) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  public basicAuth() {
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
  }
}

class CallAPI<Model extends new (...args: any) => Model> {
  protected query<QueryOptions = Record<string, any>>(
    method: AllowedMethod,
    apiSegment: string,
  ) {
    return new Query<Model, QueryOptions>(
      `${this.DBURL}/_api/${this.apiRoute}/`,
    ).setMethod(method).basicAuth(
      this.arangoDBURL.username!,
      this.arangoDBURL.password!,
    );
  }

  public post<QueryOptions = Record<string, any>>(apiSegment) {
    return this.query<QueryOptions>("POST", apiSegment);
  }
  // @todo get/patch...
}
