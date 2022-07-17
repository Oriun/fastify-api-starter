/** @format */

import {
  TObject,
  Static,
  TypeBuilder,
  Type,
  TSchema,
  TUnion,
  TString,
  TNumber,
  TArray,
  OptionalModifier,
  TRecord,
  StringOptions,
  TProperties,
  ObjectOptions
} from '@sinclair/typebox';
import {
  Model,
  Schema,
  Types,
  model,
  SchemaDefinition,
  SchemaDefinitionType
} from 'mongoose';

export const ObjectId = Type.String({
  pattern: /^[a-f0-9]{24}$/.toString().slice(1, -1)
});

type ExtendedTypeBuilderMongoose<T extends TProperties> = TObject<
  T & {
    _id: TString;
    createdAt: TNumber;
    updatedAt: TNumber;
  }
>;
class ExtendedTypeBuilder extends TypeBuilder {
  Mongoose<T extends TProperties>(
    props: T,
    opts?: ObjectOptions
  ): ExtendedTypeBuilderMongoose<T> {
    return Type.Object(
      {
        ...props,
        _id: ObjectId,
        createdAt: Type.Number({ default: Date.now() }),
        updatedAt: Type.Number({ default: Date.now() })
      },
      opts
    );
  }
  Object<T extends TProperties>(
    obj: T,
    opts: ObjectOptions = {}
  ): TObject<T> {
    return Type.Object(obj, { additionalProperties: false, ...opts });
  }
  Reference<T extends TSchema>(obj: T, name: string): TUnion<[TString, T]> {
    const union = Type.Union([ObjectId, obj]);
    union.isRef = name;
    return union;
  }
  ReferenceArray<T extends TSchema>(
    obj: T,
    name: string
  ): TUnion<[TArray<TString>, TArray<T>]> {
    const union = Type.Union([Type.Array(ObjectId), Type.Array(obj)]);
    union.isRef = [name];
    return union;
  }
  Constraints<T extends TSchema>(
    obj: T,
    constraints: { [key: string]: any }
  ): T {
    // @ts-ignore
    obj.constraints = constraints;
    return obj;
  }
  Map<T extends TSchema>(
    obj: T,
    constraints?: StringOptions<string>
  ): TRecord<TString, T> {
    return Type.Record(Type.String(constraints), obj);
  }
}
export const µ = new ExtendedTypeBuilder();

const toMongooseTranscriptor: { [key: string]: string } = {
  pattern: 'match'
};

export function createEntity<T extends TObject<any>>(
  name: string,
  details: T,
  populateField?: string[]
): Model<Static<T>> {
  function parse(obj: TObject<any>) {
    // console.dir(details, { depth: 5 });
    const res = {} as { [key: string]: any };
    for (const p in obj.properties) {
      if (['_id'].includes(p)) continue;

      let field = obj.properties[p];

      if (field.patternProperties) {
        const pattern = Object.entries(field.patternProperties)[0] as [
          string,
          TObject<any>
        ];
        const oftype: string = pattern[1].type;
        res[p] = {
          type: Map,
          of:
            oftype === 'object'
              ? parse(pattern[1])
              : pattern[1].type
        };
        continue;
      }

      if (!field.type) {
        res[p] = Array.isArray(field.isRef)
          ? {
            type: [Types.ObjectId],
            ref: field.isRef[0],
            ...field.constraints
          }
          : {
            type: Types.ObjectId,
            ref: field.isRef,
            ...field.constraints
          };
        continue;
      }

      let isArray = false;
      let required = obj.required?.includes(p);
      required ??= field.modifier
        ? field.modifier !== OptionalModifier
        : false;

      if (field.type === 'array') {
        isArray = true;
        field = field.items;
      }

      let type = field.type;
      if (!field.type || field.type === 'object') {
        type = parse(field.items || field);
      }

      res[p] = {
        type: isArray ? [type] : type,
        required,
        ...(field.constraints as { [key: string]: any })
      };
      for (const h in field) {
        if (['type', '$static', 'constraints', 'kind'].includes(h))
          continue;
        res[p][toMongooseTranscriptor[h] || h] = field[h];
      }
    }
    return res as SchemaDefinition<SchemaDefinitionType<Static<T>>>;
  }

  const scheme = parse(details.$defs?.self || details);

  const schema = new Schema<Static<T>>(scheme, {
    timestamps: true
  });

  function transform(doc: any, ret: any) {
    ret._id = ret._id.toString();
    populateField?.forEach((f) => {
      if (!doc.populated(f)) {
        ret[f] = ret[f]?.toString();
      }
    });
    // Do something for nested paths
    // Ex :
    // if (!doc.populated("categories.img")) {
    //   ret.categories = ret.categories.map((item: any) => ({
    //     ...item,
    //     img: item.img.toString(),
    //   }));
    // }
    return ret;
  }

  schema.set('toObject', {
    flattenMaps: true,
    virtuals: true,
    transform
  });
  schema.set('toJSON', {
    flattenMaps: true,
    virtuals: true,
    transform
  });

  return model<Static<T>, Model<Static<T>>>(name, schema);
}

export { Static } from '@sinclair/typebox';
