import { Collection } from "./collection.ts";
import { Connection } from "./connection.ts";
import { Query } from "./query.ts";

export abstract class Document<
  I extends new (...args: any) => Record<string, any>,
> extends Collection {
  static connection: Connection;
  constructor(object?: I) {
    super();
    Object.assign(this, object);
  }

  static createCollection(
    idempotent: boolean = true,
    options: object = {},
  ): Query<> {
    const collectionName = this.name;
    return this.connection.query<I>(["collection"]).setMethod("POST").setBody({
      name: collectionName,
    })
      .basicAuth();
  }
  static async create(object: I, options: object) {
    const collectionName = object.constructor.name;
    const query = await this.connection.query<I>(["document", collectionName])
      .setMethod("POST").setBody(object)
      .basicAuth();
    console.log("create", query);
    // const result = await fetch(`http://localhost:8529/_db/_system/_api/document/foo`, {
    //   headers: {
    //     Accept: 'application/json',
    //     Authorization: `Basic ${encode('root:vQXjLttNq9528TrI')}`
    //   },
    //   body: JSON.stringify(object),
    //   qs: options,
    // })
    // console.log(object, result);
    return this;
  }
}
