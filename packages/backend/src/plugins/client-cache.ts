import fp from "fastify-plugin";
import { ClientCache } from "../aws/client-cache.js";

declare module "fastify" {
  interface FastifyInstance {
    clientCache: ClientCache;
  }
}

export default fp(async function clientCachePlugin(fastify) {
  const clientCache = new ClientCache();
  fastify.decorate("clientCache", clientCache);
});
