// deno run --allow-net example/config.ts

import "https://deno.land/x/reflection@0.0.2/mod.ts";

import { ConnectionFactory, DefineConnectionOptions } from "../mod.ts";
import { Registry } from "https://deno.land/x/herdb@v0.1.0/mod.ts";

// Init arango db connection
class DatabaseRegistry extends Registry<typeof DatabaseRegistry> {
  @DefineConnectionOptions({
    uri: "arangodb+http://root:root@localhost:8529/_system",
  })
  static arangodb = ConnectionFactory;
}

export const registry = new DatabaseRegistry();
await registry.connectInParallel();

export const arangodb = registry.get("arangodb");
