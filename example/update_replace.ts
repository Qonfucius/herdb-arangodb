import { buildUser, TUser, User } from "./config.ts";

const user = await buildUser().create().ok().toModel();

let updatedUser: User;
let updatedUserRaw: TUser;

user.username = "updated_panda";

updatedUser = await User.update(user).ok().toModel(),
  console.log(
    "updated user, toModel, from static method:\n",
    updatedUser,
    "\n",
  );

user.username = "updated_panda_inception";
updatedUser = await user.update().ok().toModel(),
  console.log(
    "updated user, toModel, from instance method:\n",
    updatedUser,
    "\n",
  );

user.username = "updated_panda";
updatedUserRaw = await user.update().ok().returnNew().result<TUser>(),
  console.log(
    "updated user, raw data, from instance method:\n",
    updatedUserRaw,
    "\n",
  );

user.username = "updated_panda_inception";
updatedUserRaw = await user.update().ok().returnNew().dataLookup("new")
  .result(),
  console.log(
    "updated user, raw data, from instance method with dataLookup:\n",
    updatedUserRaw,
    "\n",
  );

user.username = "updated_panda";
updatedUserRaw = await user.update().ok().result<TUser>(),
  console.log(
    "updated user, raw data, from instance method without return new:\n",
    updatedUserRaw,
    "\n",
  );

user.username = "updated_panda_inception";
user.random_properties.panda_weapon = "bamboo stick";
updatedUser = await user.update().ok().toModel(),
  console.log("updated nested document:\n", updatedUser, "\n");

user.username = "replaced_panda";
user.random_properties = { panda_weapon: "bamboo sword" };
updatedUser = await user.replace().ok().toModel(),
  console.log("replaced nested document:\n", updatedUser, "\n");

// Clean collection
await User.truncateCollection().ok().result();
