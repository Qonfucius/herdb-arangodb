import { buildUser, User } from "./models/user.ts";

await User.truncateCollection();

const persistedUser = (await buildUser().create()).toModel();
(await buildUser({ username: "white_panda" }).create()).toModel();

const user = (await User.findByKey(persistedUser._key!)).toModel();
console.log("recovered user model:\n", user, "\n");

const userDocument = (await User.findByKey(persistedUser._key!)).result();
console.log("recovered user document data:\n", userDocument, "\n");

const users = (await User.find()).ok().toModel();
console.log("all recovered users model:\n", users, "\n");

// Clean collection
await User.truncateCollection();

