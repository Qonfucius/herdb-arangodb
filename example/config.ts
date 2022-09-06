// deno run --allow-net example/config.ts

import "https://deno.land/x/reflection/mod.ts";
import {
  ConnectionFactory as ArangoDBConnectionFactory,
  DefineConnectionOptions as DefineArangoDBConnectionOptions,
  Document as ArangoDBDocument,
} from "../mod.ts";
import { Registry as HerdbRegistry } from "https://deno.land/x/herdb@v0.1.0/mod.ts";

// Init arango db connection
class DatabaseRegistry extends HerdbRegistry<typeof DatabaseRegistry> {
  @DefineArangoDBConnectionOptions({
    uri: "arangodb+http://root:root@localhost:8529/_system",
  })
  public static arangodb = ArangoDBConnectionFactory;
}

const registry = new DatabaseRegistry();
await registry.connectInParallel();

export interface User {
  username: string;
  random_properties: Record<string, string>;
}

export class User extends ArangoDBDocument<User> implements User {
}

registry.get("arangodb").register(User);

const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();

await User.create(new User());

// Helper function for others examples
export function buildUser(partialUser: Partial<User> = {}) {
  return new User({
    username: `Red_Panda ${Date.now()}`,
    random_properties: { prop1: "prop1" },
    ...partialUser,
  });
}
