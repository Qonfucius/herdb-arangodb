import { ModelInterface } from "./model.ts";
import { DocumentMetadata } from "./document.ts";

export const MODEL_OPTIONS_SYMBOL = Symbol();

/**
 * Possible options for the configuration of a Model
 */
export interface ConfigureOptions {
  name?: string;
}

/**
 * Configures the Model class.
 * Allows to define options such as the name of the collection.
 *
 * This decorator is also a hack of the 'ClassFields' mechanism.
 * The definition of a 'ClassFields', evaluated in the constructor,
 * overrides the other decorators defined in the prototype.
 * We replace the original constructor, and call the `initialize` method with the same role.
 * The introduction of this hack prohibits the specification of default values for ClassFields.
 * You will have to use `initialize` to do this.
 */
export function configure<O extends ConfigureOptions = ConfigureOptions>(
  options: O = {} as O,
) {
  return function decorator<D extends DocumentMetadata>(
    // deno-lint-ignore no-explicit-any
    target: { new (...args: any[]): ModelInterface<D> },
  ) {
    // Add model options in metadata
    Reflect.defineMetadata(
      MODEL_OPTIONS_SYMBOL,
      options,
      target,
    );

    // Replaces the constructor of the class
    // Dynamically builds the new constructor so that it can be given the same name as the original
    const construct = new Function(
      `return function ${target.name}(...args){ this.initialize.call(this, ...args) }`,
    )();

    construct.prototype = target.prototype;

    // copy static properties
    let obj = target;
    const staticDescriptors: { [x: string]: PropertyDescriptor } = {};
    while (obj) {
      Object.assign(
        staticDescriptors,
        Object.getOwnPropertyDescriptors(obj),
      );
      obj = Object.getPrototypeOf(obj);
    }
    for (const name in staticDescriptors) {
      if (!(name in construct)) {
        Object.defineProperty(construct, name, staticDescriptors[name]);
      }
    }
    construct.prototype.constructor = construct;

    return construct;
  };
}
