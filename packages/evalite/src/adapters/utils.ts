type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type JsonParseFields<T extends object, K extends keyof T> = Prettify<
  Omit<T, K> & Record<K, unknown>
>;

export const jsonParseFields = <T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): JsonParseFields<T, K> => {
  const objToReturn: any = {};

  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if ((fields as any).includes(key)) {
      objToReturn[key] = JSON.parse(value);
    } else {
      objToReturn[key] = value;
    }
  }

  return objToReturn;
};

export const jsonParseFieldsArray = <T extends object, K extends keyof T>(
  obj: T[],
  fields: K[]
): JsonParseFields<T, K>[] => {
  return obj.map((o) => jsonParseFields(o, fields));
};
