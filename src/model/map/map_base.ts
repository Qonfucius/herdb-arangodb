import { ModelInterface } from "../model.ts";
import { DocumentInfer } from "../document.ts";
import { DalClassInterface } from "../dal.ts";
import { Query, ResolvedQueryResponse } from "../../query.ts";
import { aql } from "../../aql.ts";

export abstract class MapBase<
  MS extends ModelInterface<DS>, // Model Source
  MD extends ModelInterface<DD>, // ModelDestination
  TMD, // type of the relation, for model response, one or many
  TDD, // type of the relation, for document response, one or many
  DS = DocumentInfer<MS>, // Document Source
  DD = DocumentInfer<MD>, // Document Destination
> {
  protected query?: Query<TDD, TMD>;
  protected resolved = false;

  constructor(
    protected model: MS,
    protected property: keyof DS,
    protected Model: DalClassInterface<MD, DD>,
  ) {
  }

  public get() {
    return (this.query ||= this.getQuery());
  }

  public async toModel() {
    return (await this.get()).toModel();
  }

  public set(value: TMD) {
    this.query ||= this.getQuery();
    const initValue = this.initValue(value);
    this.query.resolveWith(
      new ResolvedQueryResponse(null, initValue),
    );
    return initValue;
  }

  protected getQuery() {
    return this.Model.query<TDD, TMD>(
      aql`
        FOR doc IN ${this.Model}
        FILTER doc._key IN ${this.model.getDocument()[this.property]}
        RETURN doc
      `,
    );
  }

  protected abstract initValue(value: TMD): TMD;
}
