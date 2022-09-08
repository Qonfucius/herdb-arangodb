// Possible improvements, one interface per index type

export enum IndexType {
  Hash = "hash",
  Skiplist = "skiplist",
  Persistent = "persistent",
  Ttl = "ttl",
  Zkd = "zkd",
  Geo = "geo",
  Fulltext = "fulltext",
}

export interface IndexDef {
  type: IndexType;
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
  estimates?: boolean;
  inBackground?: boolean;
  minLength?: number;
  geoJson?: string;
  fieldValueTypes?: string;
  expireAfter?: number;
}
