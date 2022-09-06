import { buildUser, User } from "./config.ts";
// import { aql } from "../mod.ts";

await User.truncateCollection().ok();

const user = await buildUser().create().ok().toModel();

console.log(
  "recovered user model: ",
  await User.findByKey(user._key!).ok().toModel(),
);

console.log(
  "recovered user raw data: ",
  await User.findByKey(user._key!).ok().result(),
);

await buildUser({ username: "white_panda" }).create().ok().toModel();

console.log(
  "all recovered users model: ",
  await User.find().ok().toModels(),
);

// FIXME, rebase https://gitlab.com/qonfucius/herdb/herdb_arangodb/-/merge_requests/3
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
