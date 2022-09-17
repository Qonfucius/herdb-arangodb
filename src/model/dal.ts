import { GenericResponseResult, Query } from "../query.ts";
import { aql, AqlQuery } from "../aql.ts";
import { ModelBaseClassInterface } from "./model.ts";
import { DocumentMetadata } from "./document.ts";
import { CollectionClassInterface } from "./collection.ts";

export interface DalInterface<
  D extends DocumentMetadata,
> {
  create(returnNew: boolean): Query<D, this>;
  replace(returnNew: boolean): Query<D, this>;
  update(returnNew: boolean): Query<D, this>;
  delete(): Query<GenericResponseResult, unknown>;
}

export interface DalClassInterface<
  M,
  D extends DocumentMetadata,
> {
  defaultToModelFactory(data: D): M;
  defaultToModelCollectionFactory(data: D[]): M[];
  create(object: M | D, returnNew: boolean): Query<D, M>;
  replace(object: M | D, returnNew: boolean): Query<D, M>;
  update(object: M | D, returnNew: boolean): Query<D, M>;
  delete(object: M | D): Query<GenericResponseResult, unknown>;
  query<ND = D[], NM = M[]>(query: AqlQuery): Query<ND, NM>;
  find(): Query<D[], M[]>;
  findByKey(key: string): Query<D, M>;
}

export function DalMixin<M, D extends DocumentMetadata>() {
  return function <
    B extends ModelBaseClassInterface & CollectionClassInterface,
  >(BaseModel: B) {
    return class Dal extends BaseModel implements DalInterface<D> {
      /**
       * The default method of creating a Modelinstance , at the execution of the
       * `toModel` method of a `Query`.
       */
      public static defaultToModelFactory(data: D) {
        return new this(data) as unknown as M;
      }

      /**
       * The default method of creating a Model instance collection,
       * at the execution of the `toModel` method of a `Query`.
       */
      public static defaultToModelCollectionFactory(data: D[]) {
        return data.map((item) => new this(item) as unknown as M);
      }

      public static create(object: M | D, returnNew = true) {
        const query = this.connection
          .query<D, M>(["document", this.collectionName])
          .setMethod("POST")
          .setBody(object)
          .basicAuth();

        if (returnNew) {
          query.setToModelFactory(this.defaultToModelFactory.bind(this))
            .setQueryParameters({ returnNew: "true" })
            .dataLookup("new");
        }

        return query;
      }

      public static replace(object: M | D, returnNew = true) {
        const key = (object as D)._key;
        if (!key) {
          throw new Error(
            `Unable to apply 'replace' for Collection ${this.collectionName}, 
            no _key defined`,
          );
        }

        const query = this.connection
          .query<D, M>(["document", this.collectionName, key])
          .setMethod("PUT")
          .setBody(object)
          .basicAuth();

        if (returnNew) {
          query.setToModelFactory(this.defaultToModelFactory.bind(this))
            .setQueryParameters({ returnNew: "true" })
            .dataLookup("new");
        }

        return query;
      }

      public static update(object: M | D, returnNew = true) {
        const key = (object as D)._key;
        if (!key) {
          throw new Error(
            `Unable to apply 'update' for Collection ${this.collectionName}, 
            no _key defined`,
          );
        }

        const query = this.connection
          .query<D, M>(["document", this.collectionName, key])
          .setMethod("PATCH")
          .setBody(object)
          .basicAuth();

        if (returnNew) {
          query.setToModelFactory(this.defaultToModelFactory.bind(this))
            .setQueryParameters({ returnNew: "true" })
            .dataLookup("new");
        }

        return query;
      }

      public static delete(object: M | D) {
        const key = (object as D)._key;
        if (!key) {
          throw new Error(
            `Unable to apply 'delete' for Collection ${this.collectionName}, 
            no _key defined`,
          );
        }
        return this.connection
          .query<GenericResponseResult>(["document", this.collectionName, key])
          .setMethod("DELETE")
          .basicAuth();
      }

      public static query<ND = D[], NM = M[]>(query: AqlQuery) {
        return this.connection
          .query<ND, NM>(["cursor"])
          .setMethod("POST")
          .setBody(query)
          .basicAuth();
      }

      public static find() {
        return this.query<D[], M[]>(aql`FOR doc IN ${this} RETURN doc`)
          .setToModelFactory(this.defaultToModelCollectionFactory.bind(this))
          .dataLookup("result");
      }

      public static findByKey(key: string) {
        return this.connection
          .query<D, M>(["document", this.collectionName, key])
          .setMethod("GET")
          .setToModelFactory(this.defaultToModelFactory.bind(this))
          .basicAuth();
      }

      public create(returnNew = true): Query<D, this> {
        return (Object.getPrototypeOf(this)
          .constructor as DalClassInterface<
            this,
            D
          >).create(this, returnNew);
      }

      public replace(returnNew = true): Query<D, this> {
        return (Object.getPrototypeOf(this)
          .constructor as DalClassInterface<
            this,
            D
          >).replace(this, returnNew);
      }

      public update(returnNew = true): Query<D, this> {
        return (Object.getPrototypeOf(this)
          .constructor as DalClassInterface<
            this,
            D
          >).update(this, returnNew);
      }

      public delete(): Query<GenericResponseResult, unknown> {
        return (Object.getPrototypeOf(this)
          .constructor as DalClassInterface<
            this,
            D
          >).delete(this);
      }
    };
  };
}
