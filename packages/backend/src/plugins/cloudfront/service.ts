import {
  CloudFrontClient,
  ListDistributionsCommand,
  GetDistributionCommand,
  CreateDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  ListInvalidationsCommand,
  GetInvalidationCommand,
  CreateInvalidationCommand,
  type Method,
} from "@aws-sdk/client-cloudfront";
import { AppError } from "../../shared/errors.js";
import type {
  DistributionSummary,
  DistributionDetail,
  CreateDistributionBody,
  UpdateDistributionBody,
  Invalidation,
} from "./schemas.js";

export class CloudFrontService {
  constructor(private client: CloudFrontClient) {}

  async listDistributions(): Promise<{ distributions: DistributionSummary[] }> {
    try {
      const response = await this.client.send(new ListDistributionsCommand({}));
      const items = response.DistributionList?.Items ?? [];
      return {
        distributions: items.map((d) => ({
          id: d.Id ?? "",
          domainName: d.DomainName ?? "",
          status: d.Status ?? "",
          enabled: d.Enabled ?? false,
          originsCount: d.Origins?.Quantity ?? 0,
          lastModified: d.LastModifiedTime?.toISOString(),
        })),
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async getDistribution(id: string): Promise<DistributionDetail> {
    try {
      const response = await this.client.send(
        new GetDistributionCommand({ Id: id })
      );
      const dist = response.Distribution;
      if (!dist) {
        throw new AppError(`Distribution '${id}' not found`, 404, "DISTRIBUTION_NOT_FOUND");
      }
      const config = dist.DistributionConfig;
      const defaultCB = config?.DefaultCacheBehavior;

      return {
        id: dist.Id ?? "",
        arn: dist.ARN ?? "",
        domainName: dist.DomainName ?? "",
        status: dist.Status ?? "",
        enabled: config?.Enabled ?? false,
        comment: config?.Comment,
        defaultRootObject: config?.DefaultRootObject,
        origins: (config?.Origins?.Items ?? []).map((o) => ({
          id: o.Id ?? "",
          domainName: o.DomainName ?? "",
          originPath: o.OriginPath,
          httpPort: o.CustomOriginConfig?.HTTPPort ?? 80,
          httpsPort: o.CustomOriginConfig?.HTTPSPort ?? 443,
          protocolPolicy: (o.CustomOriginConfig?.OriginProtocolPolicy ?? "match-viewer") as
            "http-only" | "https-only" | "match-viewer",
        })),
        defaultCacheBehavior: {
          pathPattern: "*",
          targetOriginId: defaultCB?.TargetOriginId ?? "",
          viewerProtocolPolicy: (defaultCB?.ViewerProtocolPolicy ?? "allow-all") as
            "allow-all" | "https-only" | "redirect-to-https",
          allowedMethods: defaultCB?.AllowedMethods?.Items ?? [],
          cachedMethods: defaultCB?.AllowedMethods?.CachedMethods?.Items ?? [],
          defaultTTL: defaultCB?.DefaultTTL ?? 86400,
          maxTTL: defaultCB?.MaxTTL ?? 31536000,
          minTTL: defaultCB?.MinTTL ?? 0,
          compress: defaultCB?.Compress ?? false,
        },
        cacheBehaviors: (config?.CacheBehaviors?.Items ?? []).map((cb) => ({
          pathPattern: cb.PathPattern ?? "",
          targetOriginId: cb.TargetOriginId ?? "",
          viewerProtocolPolicy: (cb.ViewerProtocolPolicy ?? "allow-all") as
            "allow-all" | "https-only" | "redirect-to-https",
          allowedMethods: cb.AllowedMethods?.Items ?? [],
          cachedMethods: cb.AllowedMethods?.CachedMethods?.Items ?? [],
          defaultTTL: cb.DefaultTTL ?? 86400,
          maxTTL: cb.MaxTTL ?? 31536000,
          minTTL: cb.MinTTL ?? 0,
          compress: cb.Compress ?? false,
        })),
        lastModified: dist.LastModifiedTime?.toISOString(),
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw this.mapError(err);
    }
  }

  async createDistribution(config: CreateDistributionBody): Promise<{ message: string }> {
    try {
      const defaultCB = config.defaultCacheBehavior;
      await this.client.send(
        new CreateDistributionCommand({
          DistributionConfig: {
            CallerReference: Date.now().toString(),
            Origins: {
              Quantity: config.origins.length,
              Items: config.origins.map((o) => ({
                Id: o.id,
                DomainName: o.domainName,
                OriginPath: o.originPath,
                CustomOriginConfig: {
                  HTTPPort: o.httpPort ?? 80,
                  HTTPSPort: o.httpsPort ?? 443,
                  OriginProtocolPolicy: o.protocolPolicy,
                },
              })),
            },
            DefaultCacheBehavior: {
              TargetOriginId: defaultCB.targetOriginId,
              ViewerProtocolPolicy: defaultCB.viewerProtocolPolicy,
              AllowedMethods: {
                Quantity: defaultCB.allowedMethods.length,
                Items: defaultCB.allowedMethods as Method[],
                CachedMethods: {
                  Quantity: defaultCB.cachedMethods.length,
                  Items: defaultCB.cachedMethods as Method[],
                },
              },
              Compress: defaultCB.compress,
              DefaultTTL: defaultCB.defaultTTL,
              MaxTTL: defaultCB.maxTTL,
              MinTTL: defaultCB.minTTL,
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: "none" },
              },
            },
            Comment: config.comment ?? "",
            Enabled: config.enabled,
            DefaultRootObject: config.defaultRootObject ?? "",
          },
        })
      );
      return { message: "Distribution created successfully" };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async updateDistribution(id: string, config: UpdateDistributionBody): Promise<{ message: string }> {
    try {
      const getResponse = await this.client.send(
        new GetDistributionCommand({ Id: id })
      );
      const etag = getResponse.ETag;
      const existingConfig = getResponse.Distribution?.DistributionConfig;

      if (!existingConfig) {
        throw new AppError(`Distribution '${id}' not found`, 404, "DISTRIBUTION_NOT_FOUND");
      }

      await this.client.send(
        new UpdateDistributionCommand({
          Id: id,
          IfMatch: etag,
          DistributionConfig: {
            ...existingConfig,
            Comment: config.comment ?? existingConfig.Comment,
            Enabled: config.enabled ?? existingConfig.Enabled,
            DefaultRootObject: config.defaultRootObject ?? existingConfig.DefaultRootObject,
          },
        })
      );
      return { message: "Distribution updated successfully" };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw this.mapError(err);
    }
  }

  async deleteDistribution(id: string): Promise<{ success: boolean }> {
    try {
      const getResponse = await this.client.send(
        new GetDistributionCommand({ Id: id })
      );
      const etag = getResponse.ETag;

      await this.client.send(
        new DeleteDistributionCommand({ Id: id, IfMatch: etag })
      );
      return { success: true };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async listInvalidations(distributionId: string): Promise<{ invalidations: Invalidation[] }> {
    try {
      const response = await this.client.send(
        new ListInvalidationsCommand({ DistributionId: distributionId })
      );
      const items = response.InvalidationList?.Items ?? [];

      const invalidations: Invalidation[] = await Promise.all(
        items.map(async (item) => {
          const detail = await this.client.send(
            new GetInvalidationCommand({
              DistributionId: distributionId,
              Id: item.Id,
            })
          );
          return {
            id: item.Id ?? "",
            status: item.Status ?? "",
            createTime: item.CreateTime?.toISOString() ?? "",
            paths: detail.Invalidation?.InvalidationBatch?.Paths?.Items ?? [],
          };
        })
      );

      return { invalidations };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async createInvalidation(
    distributionId: string,
    paths: string[]
  ): Promise<{ message: string }> {
    try {
      await this.client.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            Paths: {
              Quantity: paths.length,
              Items: paths,
            },
            CallerReference: Date.now().toString(),
          },
        })
      );
      return { message: "Invalidation created successfully" };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private mapError(err: unknown): Error {
    const error = err as Error & { name: string };
    switch (error.name) {
      case "NoSuchDistribution":
        return new AppError("Distribution not found", 404, "DISTRIBUTION_NOT_FOUND");
      case "DistributionNotDisabled":
        return new AppError(
          "Distribution must be disabled before deletion",
          409,
          "DISTRIBUTION_NOT_DISABLED"
        );
      case "InvalidOrigin":
        return new AppError("Invalid origin configuration", 400, "INVALID_ORIGIN");
      case "PreconditionFailed":
        return new AppError(
          "Distribution was modified concurrently",
          409,
          "PRECONDITION_FAILED"
        );
      case "TooManyInvalidationsInProgress":
        return new AppError(
          "Too many invalidations in progress",
          429,
          "TOO_MANY_INVALIDATIONS"
        );
      default: {
        const message = (error as Error & { message?: string }).message ?? "";
        if (
          error.name === "InternalFailure" ||
          message.includes("not yet implemented") ||
          message.includes("pro feature")
        ) {
          return new AppError(
            "CloudFront is not available. It requires LocalStack Pro — see https://docs.localstack.cloud/references/coverage/",
            501,
            "SERVICE_NOT_AVAILABLE"
          );
        }
        return error;
      }
    }
  }
}
