import { envSchema } from "env-schema";
import Type, { type Static } from "typebox";

const configSchema = Type.Object({
  PORT: Type.Number({ default: 3001 }),
  LOCALSTACK_ENDPOINT: Type.String({ default: "http://localhost:4566" }),
});

type ConfigSchema = Static<typeof configSchema>;

const env = envSchema<ConfigSchema>({
  schema: configSchema,
  dotenv: true,
});

export interface Config {
  port: number;
  localstackEndpoint: string;
}

export const config: Config = {
  port: env.PORT,
  localstackEndpoint: env.LOCALSTACK_ENDPOINT,
};
