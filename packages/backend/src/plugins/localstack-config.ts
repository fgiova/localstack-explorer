import fp from "fastify-plugin";
import { config } from "../config.js";

export interface LocalstackConfig {
  endpoint: string;
  region: string;
}

declare module "fastify" {
  interface FastifyRequest {
    localstackConfig: LocalstackConfig;
  }
}

export default fp(async function localstackConfigPlugin(fastify) {
  fastify.decorateRequest("localstackConfig", null as unknown as LocalstackConfig);

  fastify.addHook("onRequest", async (request) => {
    request.localstackConfig = {
      endpoint: (request.headers["x-localstack-endpoint"] as string) || config.localstackEndpoint,
      region: (request.headers["x-localstack-region"] as string) || config.localstackRegion,
    };
  });
});
