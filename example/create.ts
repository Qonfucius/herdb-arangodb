import { buildUser, TUser, User } from "./config.ts";

let user: User;
let userRaw: TUser;
let userUnknown: unknown;

user = await User.create(buildUser()).ok().toModel();
console.log("created user, toModel, from static method:\n", user, "\n");

user = await buildUser().create().ok().toModel();
console.log("created user, toModel, from instance method:\n", user, "\n");

userRaw = await buildUser().create().ok().returnNew().result<TUser>();
console.log("created user, raw data, from instance method:\n", userRaw, "\n");

userRaw = await buildUser().create().ok().returnNew().dataLookup("new")
  .result<TUser>();
console.log(
  "created user, raw data, from instance method with dataLookup: \n",
  userRaw,
  "\n",
);

userUnknown = await buildUser().create().ok().result();
console.log(
  "created user from instance instance without returnNew:\n",
  userUnknown,
  "\n",
);

// Clean collection
await User.truncateCollection().ok().result<TUser>();
