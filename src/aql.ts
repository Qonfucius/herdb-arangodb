/**
 * ⚠️ A large portion of this file come from ArangoJS : https://github.com/arangodb/arangojs/blob/main/src/aql.ts
 * This source is under Apache License 2.0 license.
 *
 * We will keep the spirit of this file, and adapt it to work in this code base.
 */
import { ModelBase } from "./model/model.ts";

export interface AqlQuery {
  query: string;
  // deno-lint-ignore no-explicit-any
  bindVars: Record<string, any>;
}

export interface GeneratedAqlQuery extends AqlQuery {
  _source: () => { strings: string[]; args: AqlValue[] };
}

export interface AqlLiteral {
  toAQL: () => string;
}

export type AqlValue =
  | typeof ModelBase
  | GeneratedAqlQuery
  | AqlLiteral
  | string
  | number
  | boolean
  | null
  | undefined
  // deno-lint-ignore no-explicit-any
  | Record<string, any>
  // deno-lint-ignore no-explicit-any
  | any[];

// deno-lint-ignore no-explicit-any
export function isAqlQuery(query: any): query is AqlQuery {
  return Boolean(query && typeof query.query === "string" && query.bindVars);
}

// deno-lint-ignore no-explicit-any
export function isGeneratedAqlQuery(query: any): query is GeneratedAqlQuery {
  // deno-lint-ignore no-explicit-any
  return isAqlQuery(query) && typeof (query as any)._source === "function";
}

// deno-lint-ignore no-explicit-any
export function isAqlLiteral(literal: any): literal is AqlLiteral {
  return Boolean(literal && typeof literal.toAQL === "function");
}

export function aql(
  templateStrings: TemplateStringsArray,
  ...args: AqlValue[]
): GeneratedAqlQuery {
  const strings = [...templateStrings];
  // deno-lint-ignore no-explicit-any
  const bindVars: Record<string, any> = {};
  const bindValues = [];
  let query = strings[0];
  for (let i = 0; i < args.length; i++) {
    const rawValue = args[i];
    let value = rawValue;
    if (isGeneratedAqlQuery(rawValue)) {
      const src = rawValue._source();
      if (src.args.length) {
        query += src.strings[0];
        args.splice(i, 1, ...src.args);
        strings.splice(
          i,
          2,
          strings[i] + src.strings[0],
          ...src.strings.slice(1, src.args.length),
          src.strings[src.args.length] + strings[i + 1],
        );
      } else {
        query += rawValue.query + strings[i + 1];
        args.splice(i, 1);
        strings.splice(i, 2, strings[i] + rawValue.query + strings[i + 1]);
      }
      i -= 1;
      continue;
    }
    if (rawValue === undefined) {
      query += strings[i + 1];
      continue;
    }
    if (isAqlLiteral(rawValue)) {
      query += `${rawValue.toAQL()}${strings[i + 1]}`;
      continue;
    }
    const index = bindValues.indexOf(rawValue);
    const isKnown = index !== -1;
    let name = `value${isKnown ? index : bindValues.length}`;

    if (
      rawValue &&
      // TODO: don't use any
      // deno-lint-ignore no-explicit-any
      (rawValue as any).prototype instanceof ModelBase
    ) {
      name = `@${name}`;
      // TODO: don't use any
      // deno-lint-ignore no-explicit-any
      value = (rawValue as any).collectionName;
    }
    if (!isKnown) {
      bindValues.push(rawValue);
      bindVars[name] = value;
    }
    query += `@${name}${strings[i + 1]}`;
  }
  return {
    query,
    bindVars,
    _source: () => ({ strings, args }),
  };
}
