import "https://deno.land/x/reflection/mod.ts";
import {
  ConnectionFactory as ArangoDBConnectionFactory,
  DefineConnectionOptions as DefineArangoDBConnectionOptions,
  Document as ArangoDBDocument,
} from "../mod.ts";
import { Registry as HerdbRegistry } from "https://deno.land/x/herdb@v0.1.0/mod.ts";

class DatabaseRegistry extends HerdbRegistry<typeof DatabaseRegistry> {
  @DefineArangoDBConnectionOptions({
    url: "http://root:vQXjLttNq9528TrI@localhost:8529/_system",
  })
  public static arangodb = ArangoDBConnectionFactory;
}

const registry = new DatabaseRegistry();
await registry.connectInParallel();
interface User {
  username: string;
}
class User extends ArangoDBDocument<User> implements User {
  public username: string;
}
registry.get("arangodb").register(User);
const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();
await User.create(new User());
