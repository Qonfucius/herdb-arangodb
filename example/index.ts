import { User } from "./config.ts";
import { IndexDef, IndexType } from "../mod.ts";

let indexes: IndexDef[];
let index: IndexDef;
let newIndex: IndexDef;

await User.removeIndex("random_properties_prop1_index").result();
await User.removeIndex("idx_1743303641934069760").result();

// Clean collection

await User.truncateCollection().ok().result();

indexes = await User.getIndexes().dataLookup("indexes").result();
console.log("Default indexes:\n ", indexes, "\n");

index = await User.getIndex("primary").result();
console.log("Primary index:\n ", index, "\n");

newIndex = await User.createIndex({
  type: IndexType.Persistent,
  name: "username_unique_index",
  unique: true,
  fields: ["username"],
}).result();
console.log("New index username_unique_index:\n ", newIndex, "\n");

index = await User.getIndex("username_unique_index").result();
console.log("username_unique_index index:\n ", index, "\n");

index = await User.getIndex("username_unique_index").result();
console.log("Removed index username_unique_index:\n ", index, "\n");

newIndex = await User.createIndex({
  type: IndexType.Persistent,
  name: "random_properties_prop1_and_panda_weapon_index",
  unique: false,
  fields: ["random_properties.prop1", "random_properties.panda_weapon"],
}).result();
console.log(
  "New index random_properties_prop1_and_panda_weapon_index index:\n ",
  newIndex,
  "\n",
);

await User.removeIndex("random_properties_prop1_and_panda_weapon_index")
  .result();
