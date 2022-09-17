import { MapBase } from "./map_base.ts";
import { ModelBase, ModelInterface } from "../model.ts";
import { DocumentInfer, DocumentMetadata } from "../document.ts";

export class MapOne<
  MS extends ModelInterface<DS>,
  MD extends ModelInterface<DD>,
  DS extends DocumentMetadata = DocumentInfer<MS>,
  DD extends DocumentMetadata = DocumentInfer<MD>,
> extends MapBase<MS, MD, MD, DD, DS, DD> {
  protected getQuery() {
    return super.getQuery()
      .dataLookup("result", "0")
      .setToModelFactory(this.bind.bind(this));
  }

  protected initValue(value: MD): MD {
    return this.bind(value);
  }

  protected bind(value: DD | MD): MD {
    if (!value._key) {
      throw new TypeError(
        `Unable to set '${this.property.toString()}',
          only instance of Model with a '_key' can be defined`,
      );
    }

    (this.model.getDocument()[this.property] as unknown) = value._key;

    if (value instanceof ModelBase) {
      return value as MD;
    }

    return this.Model.defaultToModelFactory(value);
  }
}
