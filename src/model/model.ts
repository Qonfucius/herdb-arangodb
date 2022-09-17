import { Connection } from "../connection.ts";
import {
  DocumentClassInterface,
  DocumentInterface,
  DocumentMetadata,
  DocumentMixin,
} from "./document.ts";
import {
  CollectionClassInterface,
  CollectionInterface,
  CollectionMixin,
} from "./collection.ts";
import { DalClassInterface, DalInterface, DalMixin } from "./dal.ts";
import { IndexClassInterface, IndexInterface, IndexMixin } from "./index.ts";
import { MapClassInterface, MapInterface, MapMixin } from "./map/map.ts";

export interface ModelBaseClassInterface {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): ModelBase;
  connection: Connection;
}

/**
 * Base class of a Model
 * Inspired by ActiveRecord (RoR) and Eloquent (laravel)
 */
export class ModelBase {
  /**
   * Connection to the ArangoDB database. Automatically set on 'register'.
   * See Connection#register
   */
  public static connection: Connection;
}

/**
 * Constructor of the base class of a Model
 *
 * This method resolves the generics of the static definitions of the class
 * with the same types as those of the instance.
 *
 * Composition of the class with its mixins
 *
 * @returns The base class with the resolved generics serving as base inheritance
 */
export function ModelClassFactory<
  M,
  D extends DocumentMetadata,
>() {
  return class ModelClassFactory extends IndexMixin()(
    MapMixin()(
      DalMixin<M, D>()(
        CollectionMixin()(
          DocumentMixin<D>()(
            ModelBase,
          ),
        ),
      ),
    ),
  ) {
    constructor(document: D) {
      super();
      this.initialize(document);
    }
  };
}

/**
 * Static interface of a Model including its generics
 */
export interface ModelClassInterface<
  M extends ModelInterface<D>,
  D extends DocumentMetadata,
> extends
  ModelBaseClassInterface,
  DocumentClassInterface,
  CollectionClassInterface,
  DalClassInterface<M, D>,
  MapClassInterface,
  IndexClassInterface<D> {
  new (document: D): ModelInterface<D>;
}

/**
 * Interface of Model
 */
export interface ModelInterface<D extends DocumentMetadata>
  extends
    ModelBase,
    DocumentInterface<D>,
    CollectionInterface,
    DalInterface<D>,
    MapInterface,
    IndexInterface {}
