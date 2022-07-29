import { Connection } from "./connection.ts";

export class Collection {
  public name: string;
  static connection: Connection;
  //todo: async create(idempotent: boolean = true, options: object = {}): this
}
