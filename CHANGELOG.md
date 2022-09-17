# Changelog

A lot of design changes in this MR:

### ⚠ BREAKING CHANGE

- `Collection` has been removed. It was duplicating the old `Document`.
- Document' has been renamed to 'Model'. A `Document` representing the raw type
  stored in base, the `Model`, the mapped object.
- Object.assign`has been replaced by a mapping to the`Document` to allow for
  property decoration.
- Query is now idempotent. If the `Query` has been resolved, it will still
  return the same `QueryResponse` held in memory. This was necessary to solve
  problems with the `MapOne` and `MapMany` relationships that return `Query`
  objects to the `get`. Without idempotency, it would be necessary to add an
  interface between `Query` and the relations, to keep the result of the first
  resolution somewhere else in memory.

#### Features

- Add Mapping, on properties and on relationships
- Add update/replace/delete methods
- Add Index methods

#### Features

- Many Fixes on type resolution

### [v0.0.4](https://gitlab.com/qonfucius/herdb/herdb_arangodb/compare/v0.0.3...v0.0.4) (2022-09-08)

#### Fixes

- add a generic constructor
  ([9445d09](https://gitlab.com/qonfucius/herdb/herdb_arangodb/commit/9445d09f426f46c9f7e640157b7192c0884c44a6))
- expose aql function
  ([03b469a](https://gitlab.com/qonfucius/herdb/herdb_arangodb/commit/03b469a5c5804fd204771669a97e174df02ed227))

### [v0.0.3](https://gitlab.com/qonfucius/herdb/herdb_arangodb/compare/v0.0.2...v0.0.3) (2022-08-29)

### [v0.0.2](https://gitlab.com/qonfucius/herdb/herdb_arangodb/compare/v0.0.1...v0.0.2) (2022-08-29)

### ⚠ BREAKING CHANGE

- option url is not longer working

### v0.0.1 (2022-08-04)

#### Features

- Add query & aql logical
  ([45b07c3](https://gitlab.com/qonfucius/herdb/herdb_arangodb/commit/45b07c37050fd7bd9d26edde2d64bb0c0c7ca3d7))
- Initial commit
  ([e3537ed](https://gitlab.com/qonfucius/herdb/herdb_arangodb/commit/e3537ed552a0bc1a074084cdec66a329dd28f328))
