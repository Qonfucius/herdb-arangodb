import { buildUser, User } from "./config.ts";

let user: User;
let userRaw: User;

user = await User.create(buildUser()).ok().toModel();
console.log("created user, toModel, from static method:\n", user,"\n");

user = await buildUser().create().ok().toModel();
console.log("created user, toModel, from instance method:\n", user,"\n");

userRaw = await buildUser().create().ok().returnNew().result();
console.log("created user, raw data, from instance method:\n", userRaw,"\n");

userRaw = await buildUser().create().ok().returnNew().dataLookup("new")
  .result();
console.log(
  "created user, raw data, from instance method with dataLookup: \n",
  userRaw,
  "\n",
);

userRaw = await buildUser().create().ok().result();
console.log("created user from instance instance without returnNew:\n", userRaw, "\n");

// Clean collection
await User.truncateCollection().ok().result();
