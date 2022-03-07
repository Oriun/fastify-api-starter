import { webcrypto } from "crypto";

declare module "crypto" {
  namespace webcrypto {
    function randomUUID(): string;
  }
}

export default webcrypto