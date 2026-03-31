import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";

// Mock the config module before importing the plugin
vi.mock("../../src/config.js", () => ({
  config: {
    localstackEndpoint: "http://localhost:4566",
    localstackRegion: "us-east-1",
    port: 3001,
    enabledServices: ["s3", "sqs"],
  },
}));

// Import the plugin after mocking
const { default: localstackConfigPlugin } = await import(
  "../../src/plugins/localstack-config.js"
);

describe("localstackConfigPlugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(localstackConfigPlugin);

    // Register a test route that returns the localstackConfig from the request
    app.get("/test-config", async (request, reply) => {
      return reply.send(request.localstackConfig);
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses header values when x-localstack-endpoint and x-localstack-region headers are provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-config",
      headers: {
        "x-localstack-endpoint": "http://custom-host:4566",
        "x-localstack-region": "eu-west-1",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ endpoint: string; region: string }>();
    expect(body.endpoint).toBe("http://custom-host:4566");
    expect(body.region).toBe("eu-west-1");
  });

  it("uses default config values when no headers are provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-config",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ endpoint: string; region: string }>();
    expect(body.endpoint).toBe("http://localhost:4566");
    expect(body.region).toBe("us-east-1");
  });

  it("uses default endpoint when only region header is provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-config",
      headers: {
        "x-localstack-region": "ap-southeast-1",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ endpoint: string; region: string }>();
    expect(body.endpoint).toBe("http://localhost:4566");
    expect(body.region).toBe("ap-southeast-1");
  });

  it("uses default region when only endpoint header is provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-config",
      headers: {
        "x-localstack-endpoint": "http://my-localstack:4566",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ endpoint: string; region: string }>();
    expect(body.endpoint).toBe("http://my-localstack:4566");
    expect(body.region).toBe("us-east-1");
  });
});
