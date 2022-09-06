import { buildUser, User } from "./config.ts";

const user = await buildUser().create().ok().toModel();

let updatedUser: User;
let updatedUserRaw: any;

user.username = "updated_panda";

updatedUser = await User.update(user).ok().toModel(),
  console.log("updated user, toModel, from static method: ", updatedUser);

user.username = "updated_panda_inception";
updatedUser = await user.update().ok().toModel(),
  console.log("updated user, toModel, from instance method: ", updatedUser);

user.username = "updated_panda";
updatedUserRaw = await user.update().ok().returnNew().result(),
  console.log("updated user, raw data, from instance method: ", updatedUserRaw);

user.username = "updated_panda_inception";
updatedUserRaw = await user.update().ok().returnNew().dataLookup("new")
  .result(),
  console.log(
    "updated user, raw data, from instance method with dataLookup: ",
    updatedUserRaw,
  );

user.username = "updated_panda";
updatedUserRaw = await user.update().ok().result(),
  console.log(
    "updated user, raw data, from instance method without return new: ",
    updatedUserRaw,
  );

user.username = "updated_panda_inception";
user.random_properties.panda_weapon = "bamboo stick";
updatedUser = await user.update().ok().toModel(),
  console.log("updated nested document: ", updatedUser);

user.username = "replaced_panda";
user.random_properties = { panda_weapon: "bamboo sword" };
updatedUser = await user.replace().ok().toModel(),
  console.log("replaced nested document: ", updatedUser);
