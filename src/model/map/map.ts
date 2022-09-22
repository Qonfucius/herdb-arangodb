import { MapMany } from "./map_many.ts";
import { MapOne } from "./map_one.ts";
import { MapBase } from "./map_base.ts";
import {
  ModelBaseClassInterface,
  ModelClassInterface,
  ModelInterface,
} from "../model.ts";
import { DocumentInfer, DocumentMetadata } from "../document.ts";

const MAP_CACHE = Symbol();

// deno-lint-ignore no-explicit-any
type GenericMapBase = MapBase<any, any, any, any, any, any>;

export interface MapInterface {
  [MAP_CACHE]?: Record<keyof this, GenericMapBase>;
  clearMapCache(): void;
}

// deno-lint-ignore no-empty-interface
export interface MapClassInterface {}

export function MapMixin() {
  return function <
    B extends ModelBaseClassInterface,
  >(BaseModel: B) {
    return class Map extends BaseModel implements MapInterface {
      public [MAP_CACHE]?: Record<keyof this, GenericMapBase>;

      public clearMapCache() {
        this[MAP_CACHE] = {} as Record<keyof this, GenericMapBase>;
      }
    };
  };
}

/**
 * Base class allowing to map model properties to the document
 */
export abstract class Mapper<I, O> {
  public abstract get(docval: I): O;
  public abstract set(modval: O): I;
}

class MapperDefault<I, O> extends Mapper<I, O> {
  public get(docval: I): O {
    return docval as unknown as O;
  }
  public set(modval: O): I {
    return modval as unknown as I;
  }
}

// Type helper, to retrieve from A intersecting properties with the same type from B
type InterWith<A, B> = {
  [P in keyof A & keyof B]: A[P] extends B[P] ? A[P] : never;
};

// Type helper, to retrieve from A properties with the given type B
type InterType<A, B> = {
  [P in keyof A]: A[P] extends B ? A[P] : never;
};

// Type helper, removes type never from a compound type
type OmitNever<I> = {
  [K in keyof I as I[K] extends never ? never : K]: I[K];
};

export function mapFactory<
  M extends ModelInterface<D>,
  D extends DocumentMetadata,
>() {
  return new class {
    /**
     * Create a mapping between the model and document properties
     *
     * @returns The Descriptor object
     */
    map() {
      return function <
        I extends OmitNever<InterWith<M, D>>,
        K extends keyof I,
      >(
        target: M,
        key: K,
      ) {
        const mapper: Mapper<I[K], I[K]> = new MapperDefault<I[K], I[K]>();
        Object.defineProperty(target, key, {
          get: function (this: M): I[K] {
            return mapper.get((this.getDocument() as unknown as I)[key]);
          },
          set: function (this: M, modval: I[K]) {
            (this.getDocument() as unknown as I)[key] = mapper.set(modval);
          },
        });
      };
    }

    /**
     * Create a mapping between the model and document properties with a custom Mapper
     *
     * @param mapper The mapper object
     * @returns The Descriptor object
     */
    mapWith<I extends M[keyof M], O extends D[keyof D]>(
      mapper: Mapper<I, O>,
    ) {
      return function<
        K extends
          & keyof D
          & keyof OmitNever<InterType<D, I>>
          & keyof OmitNever<InterType<M, O>>,
      >(
        target: M,
        key: K,
      ) {
        Object.defineProperty(target, key, {
          get: function (this: M) {
            return mapper.get(this.getDocument()[key] as unknown as I);
          },
          set: function (this: M, modval: O) {
            (this.getDocument()[key] as unknown as I) = mapper.set(modval);
          },
        });
      };
    }
    /**
     * Defines a oneToOne mapping.
     * The model must have a key with a '_key' value pointing to the relationship to join
     *
     * @param modelScope The model joined in a function to avoid dependency initialization problems
     * @returns The Descriptor object
     */
    mapOne<
      MD extends ModelInterface<DD>,
      DD = DocumentInfer<MD>,
    >(
      modelScope: () => ModelClassInterface<MD, DD>,
    ) {
      return function <
        I extends OmitNever<InterType<M, MapOne<M, MD, D, DD>>>,
        K extends keyof I,
      >(
        target: M,
        key: K,
      ) {
        Object.defineProperty(target, key, {
          get: function (this: M) {
            const cache = this[MAP_CACHE] ||
              (this[MAP_CACHE] = {} as Record<keyof M, GenericMapBase>);
            return (cache[key as keyof M] as MapOne<M, MD, D, DD>) ||
              (cache[key as keyof M] = new MapOne<M, MD, D, DD>(
                this,
                key as keyof D,
                modelScope(),
              ));
          },
          set: function () {
            throw new Error(
              "A 'mapOne' cannot be defined directly, use the 'set' method instead",
            );
          },
        });
      };
    }

    /**
     * Defines a oneToMany mapping.
     * The model must have a key with a list of '_key' values pointing to the relationship to join
     *
     * @param modelScope The model joined in a function to avoid dependency initialization problems
     * @returns The Descriptor object
     */
    mapMany<
      MD extends ModelInterface<DD>,
      DD extends DocumentMetadata = DocumentInfer<MD>,
    >(
      modelScope: () => ModelClassInterface<MD, DD>,
    ) {
      return function <
        I extends OmitNever<InterType<M, MapMany<M, MD, D, DD>>>,
        K extends keyof I,
      >(
        target: M,
        key: K,
      ) {
        Object.defineProperty(target, key, {
          get: function (this: M) {
            const cache = this[MAP_CACHE] ||
              (this[MAP_CACHE] = {} as Record<keyof M, GenericMapBase>);
            return (cache[key as keyof M] as MapMany<M, MD, D, DD>) ||
              (cache[key as keyof M] = new MapMany<M, MD, D, DD>(
                this,
                key as keyof D,
                modelScope(),
              ));
          },
          set: function () {
            throw new Error(
              "A 'mapMany' cannot be defined directly, use the 'set' method instead",
            );
          },
        });
      };
    }
  }();
}
