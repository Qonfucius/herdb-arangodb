import { MapBase } from "./map_base.ts";
import { ModelBase, ModelInterface } from "../model.ts";
import { DocumentInfer, DocumentMetadata } from "../document.ts";

export class MapMany<
  MS extends ModelInterface<DS>,
  MD extends ModelInterface<DD>,
  DS extends DocumentMetadata = DocumentInfer<MS>,
  DD extends DocumentMetadata = DocumentInfer<MD>,
> extends MapBase<MS, MD, MD[], DD[], DS, DD> {
  protected getQuery() {
    return super.getQuery()
      .dataLookup("result")
      .setToModelFactory(this.proxify.bind(this));
  }

  protected initValue(value: MD[]): MD[] {
    return this.proxify(value);
  }

  protected proxify(result: DD[] | MD[]): MD[] {
    const documentCollection =
      (this.model.getDocument()[this.property] as unknown) = result
        .map((item) => item._key!);
    const models = this.Model.defaultToModelCollectionFactory(
      result.map(
        (item) => item instanceof ModelBase ? item.getDocument() : item,
      ),
    );

    return new Proxy<MD[]>(models, {
      set: (target, prop, value) => {
        const index = parseInt(prop as string);

        if (isNaN(index)) {
          target[prop as keyof MD[]] = value;
          // Why `as keyof Array` don't work ?
          // deno-lint-ignore no-explicit-any
          documentCollection[prop as any] = value;
          return true;
        }

        if (!value._key) {
          throw new TypeError(
            `Unable to insert element in '${this.property.toString()}',
              only instance of Model with a '_key' can be inserted`,
          );
        }

        documentCollection[index] = value._key!;
        target[index] = value instanceof ModelBase
          ? value as MD
          : this.Model.defaultToModelFactory(value);

        return true;
      },
    });
  }
}
