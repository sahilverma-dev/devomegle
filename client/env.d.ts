// env.d.ts
import { Env } from "./env";

declare global {
  type ProcessEnv = Env;
}
