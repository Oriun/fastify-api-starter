import { createEntity, µ, Static } from "../../modules/entities";

export const ConfigJSON = µ.Mongoose({
  confirmed: µ.Number(),
  firstname: µ.String(),
  preferredColor: µ.String({ pattern: "^#[a-fA-F0-9]{3,8}$" }),
  lastname: µ.String(),
  email: µ.Constraints(µ.String(), { unique: true }),
  phone: µ.String(),
  permissions: µ.Map(µ.Number()),
  password: µ.String(),
  job: µ.String(),
  cgu: µ.Number(),
  cgv: µ.Number(),
  company: µ.Reference(µ.Any(), "Companies"),
});

export type ConfigType = Static<typeof ConfigJSON>

export const User = createEntity("Config", ConfigJSON, ["company"]);

