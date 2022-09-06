import { buildUser, User } from "./config.ts";

await User.truncateCollection().ok().result();

const persistedUser = await buildUser().create().ok().toModel();
await buildUser({ username: "white_panda" }).create().ok().toModel();

let user: User;
let userRaw: any;
let users: User[];

user = await User.findByKey(persistedUser._key!).ok().toModel();
console.log("recovered user model: ", user);

userRaw = await User.findByKey(persistedUser._key!).ok().result();
console.log("recovered user raw data: ", userRaw);

users = await User.find().ok().toModels();
console.log("all recovered users model: ", users);

// FIXME, rebase https://gitlab.com/qonfucius/herdb/herdb_arangodb/-/merge_requests/3
// import { aql } from "../mod.ts";
//
// const username = "white_panda";
// console.log(
//   `Users model with username '${username}':`,
//   await User.find(
//     aql`
//       FOR doc IN users
//       FILTER doc.username == ${newUsername}
//       RETURN doc
//     `,
//   ).ok().toModel();
// );
