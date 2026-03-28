import { envSchema } from "env-schema";
import Type, { type Static } from "typebox";

const ALL_SERVICES = ["s3", "sqs", "sns", "iam", "cloudfront", "cloudformation"] as const;
export type ServiceName = (typeof ALL_SERVICES)[number];

const configSchema = Type.Object({
  PORT: Type.Number({ default: 3001 }),
  LOCALSTACK_ENDPOINT: Type.String({ default: "http://localhost:4566" }),
  ENABLED_SERVICES: Type.String({ default: "s3,sqs,sns,iam,cloudformation" }),
});

type ConfigSchema = Static<typeof configSchema>;

const env = envSchema<ConfigSchema>({
  schema: configSchema,
  dotenv: true
});

function parseEnabledServices(raw: string): ServiceName[] {
  if (!raw.trim()) return [...ALL_SERVICES];
  const requested = raw.split(",").map((s) => s.trim().toLowerCase());
  return requested.filter((s): s is ServiceName =>
    (ALL_SERVICES as readonly string[]).includes(s)
  );
}

export interface Config {
  port: number;
  localstackEndpoint: string;
  enabledServices: ServiceName[];
}

export const config: Config = {
  port: env.PORT,
  localstackEndpoint: env.LOCALSTACK_ENDPOINT,
  enabledServices: parseEnabledServices(env.ENABLED_SERVICES),
};
