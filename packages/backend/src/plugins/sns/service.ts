import {
  type SNSClient,
  ListTopicsCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  GetTopicAttributesCommand,
  SetTopicAttributesCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
  ListSubscriptionsCommand,
  GetSubscriptionAttributesCommand,
  SetSubscriptionAttributesCommand,
  PublishCommand,
  PublishBatchCommand,
  TagResourceCommand,
  UntagResourceCommand,
  ListTagsForResourceCommand,
  type MessageAttributeValue,
  type PublishBatchRequestEntry,
} from "@aws-sdk/client-sns";
import { AppError } from "../../shared/errors.js";

function mapSnsError(err: unknown, fallbackMessage: string): never {
  const error = err as Error & { name: string };
  switch (error.name) {
    case "NotFoundException":
    case "NotFound":
      throw new AppError(fallbackMessage, 404, "NOT_FOUND");
    case "InvalidParameterException":
    case "InvalidParameterValueException":
    case "InvalidParameter":
    case "ValidationException":
      throw new AppError(error.message || fallbackMessage, 400, "INVALID_PARAMETER");
    case "AuthorizationErrorException":
    case "AuthorizationError":
      throw new AppError(error.message || fallbackMessage, 403, "AUTHORIZATION_ERROR");
    default:
      throw error;
  }
}

export class SNSService {
  constructor(private client: SNSClient) {}

  // ── Topic Operations ──────────────────────────────────────────────

  async listTopics() {
    const response = await this.client.send(new ListTopicsCommand({}));
    const topics = (response.Topics ?? []).map((topic) => {
      const topicArn = topic.TopicArn ?? "";
      const parts = topicArn.split(":");
      const name = parts[parts.length - 1] ?? "";
      return { topicArn, name };
    });
    return { topics };
  }

  async createTopic(name: string) {
    try {
      const response = await this.client.send(
        new CreateTopicCommand({ Name: name })
      );
      return {
        message: `Topic '${name}' created successfully`,
        topicArn: response.TopicArn,
      };
    } catch (err) {
      mapSnsError(err, `Failed to create topic '${name}'`);
    }
  }

  async deleteTopic(topicArn: string) {
    try {
      await this.client.send(new DeleteTopicCommand({ TopicArn: topicArn }));
      return { success: true };
    } catch (err) {
      mapSnsError(err, `Topic '${topicArn}' not found`);
    }
  }

  async getTopicAttributes(topicArn: string) {
    try {
      const response = await this.client.send(
        new GetTopicAttributesCommand({ TopicArn: topicArn })
      );
      const attrs = response.Attributes ?? {};
      return {
        topicArn: attrs.TopicArn ?? topicArn,
        displayName: attrs.DisplayName ?? "",
        owner: attrs.Owner ?? "",
        policy: attrs.Policy ?? "",
        subscriptionsConfirmed: Number(attrs.SubscriptionsConfirmed ?? 0),
        subscriptionsPending: Number(attrs.SubscriptionsPending ?? 0),
        subscriptionsDeleted: Number(attrs.SubscriptionsDeleted ?? 0),
        deliveryPolicy: attrs.DeliveryPolicy ?? "",
        effectiveDeliveryPolicy: attrs.EffectiveDeliveryPolicy ?? "",
        kmsMasterKeyId: attrs.KmsMasterKeyId ?? "",
        fifoTopic: attrs.FifoTopic === "true",
        contentBasedDeduplication: attrs.ContentBasedDeduplication === "true",
      };
    } catch (err) {
      mapSnsError(err, `Topic '${topicArn}' not found`);
    }
  }

  async setTopicAttributes(
    topicArn: string,
    attributeName: string,
    attributeValue: string
  ) {
    try {
      await this.client.send(
        new SetTopicAttributesCommand({
          TopicArn: topicArn,
          AttributeName: attributeName,
          AttributeValue: attributeValue,
        })
      );
      return { success: true };
    } catch (err) {
      mapSnsError(err, `Failed to set attribute on topic '${topicArn}'`);
    }
  }

  // ── Subscription Operations ───────────────────────────────────────

  async listAllSubscriptions() {
    try {
      const response = await this.client.send(
        new ListSubscriptionsCommand({})
      );
      const subscriptions = (response.Subscriptions ?? []).map((sub) => ({
        subscriptionArn: sub.SubscriptionArn ?? "",
        owner: sub.Owner ?? "",
        protocol: sub.Protocol ?? "",
        endpoint: sub.Endpoint ?? "",
        topicArn: sub.TopicArn ?? "",
      }));
      return { subscriptions };
    } catch (err) {
      mapSnsError(err, "Failed to list subscriptions");
    }
  }

  async listSubscriptionsByTopic(topicArn: string) {
    try {
      const response = await this.client.send(
        new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })
      );
      const subscriptions = (response.Subscriptions ?? []).map((sub) => ({
        subscriptionArn: sub.SubscriptionArn ?? "",
        owner: sub.Owner ?? "",
        protocol: sub.Protocol ?? "",
        endpoint: sub.Endpoint ?? "",
        topicArn: sub.TopicArn ?? "",
      }));
      return { subscriptions };
    } catch (err) {
      mapSnsError(err, `Topic '${topicArn}' not found`);
    }
  }

  async createSubscription(
    topicArn: string,
    protocol: string,
    endpoint: string,
    options?: { rawMessageDelivery?: boolean; filterPolicy?: string }
  ) {
    try {
      const response = await this.client.send(
        new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: protocol,
          Endpoint: endpoint,
        })
      );

      if (response.SubscriptionArn) {
        if (options?.rawMessageDelivery) {
          await this.client.send(
            new SetSubscriptionAttributesCommand({
              SubscriptionArn: response.SubscriptionArn,
              AttributeName: "RawMessageDelivery",
              AttributeValue: "true",
            })
          );
        }
        if (options?.filterPolicy) {
          await this.client.send(
            new SetSubscriptionAttributesCommand({
              SubscriptionArn: response.SubscriptionArn,
              AttributeName: "FilterPolicy",
              AttributeValue: options.filterPolicy,
            })
          );
        }
      }

      return {
        message: "Subscription created successfully",
        subscriptionArn: response.SubscriptionArn,
      };
    } catch (err) {
      mapSnsError(err, `Failed to create subscription for topic '${topicArn}'`);
    }
  }

  async deleteSubscription(subscriptionArn: string) {
    try {
      await this.client.send(
        new UnsubscribeCommand({ SubscriptionArn: subscriptionArn })
      );
      return { success: true };
    } catch (err) {
      mapSnsError(err, `Subscription '${subscriptionArn}' not found`);
    }
  }

  async getSubscriptionAttributes(subscriptionArn: string) {
    try {
      const response = await this.client.send(
        new GetSubscriptionAttributesCommand({
          SubscriptionArn: subscriptionArn,
        })
      );
      const attrs = response.Attributes ?? {};
      return {
        subscriptionArn: attrs.SubscriptionArn ?? subscriptionArn,
        topicArn: attrs.TopicArn ?? "",
        owner: attrs.Owner ?? "",
        protocol: attrs.Protocol ?? "",
        endpoint: attrs.Endpoint ?? "",
        confirmationWasAuthenticated:
          attrs.ConfirmationWasAuthenticated === "true",
        pendingConfirmation: attrs.PendingConfirmation === "true",
        rawMessageDelivery: attrs.RawMessageDelivery === "true",
        filterPolicy: attrs.FilterPolicy ?? "",
        filterPolicyScope: attrs.FilterPolicyScope ?? "",
        deliveryPolicy: attrs.DeliveryPolicy ?? "",
        effectiveDeliveryPolicy: attrs.EffectiveDeliveryPolicy ?? "",
      };
    } catch (err) {
      mapSnsError(err, `Subscription '${subscriptionArn}' not found`);
    }
  }

  async setSubscriptionFilterPolicy(
    subscriptionArn: string,
    filterPolicy: string
  ) {
    try {
      await this.client.send(
        new SetSubscriptionAttributesCommand({
          SubscriptionArn: subscriptionArn,
          AttributeName: "FilterPolicy",
          AttributeValue: filterPolicy,
        })
      );
      return { success: true };
    } catch (err) {
      mapSnsError(
        err,
        `Failed to set filter policy on subscription '${subscriptionArn}'`
      );
    }
  }

  // ── Publish Operations ────────────────────────────────────────────

  async publishMessage(
    topicArn: string,
    message: string,
    options?: {
      subject?: string;
      messageAttributes?: Record<
        string,
        { DataType: string; StringValue: string }
      >;
      targetArn?: string;
    }
  ) {
    try {
      const attrs: Record<string, MessageAttributeValue> | undefined =
        options?.messageAttributes
          ? Object.fromEntries(
              Object.entries(options.messageAttributes).map(([k, v]) => [
                k,
                { DataType: v.DataType, StringValue: v.StringValue },
              ])
            )
          : undefined;

      const response = await this.client.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: message,
          ...(options?.subject && { Subject: options.subject }),
          ...(attrs && { MessageAttributes: attrs }),
          ...(options?.targetArn && { TargetArn: options.targetArn }),
        })
      );
      return { messageId: response.MessageId };
    } catch (err) {
      mapSnsError(err, `Failed to publish message to topic '${topicArn}'`);
    }
  }

  async publishBatch(
    topicArn: string,
    entries: Array<{
      id: string;
      message: string;
      subject?: string;
      messageAttributes?: Record<
        string,
        { DataType: string; StringValue: string }
      >;
    }>
  ) {
    try {
      const batchEntries: PublishBatchRequestEntry[] = entries.map((entry) => {
        const attrs: Record<string, MessageAttributeValue> | undefined =
          entry.messageAttributes
            ? Object.fromEntries(
                Object.entries(entry.messageAttributes).map(([k, v]) => [
                  k,
                  { DataType: v.DataType, StringValue: v.StringValue },
                ])
              )
            : undefined;

        return {
          Id: entry.id,
          Message: entry.message,
          ...(entry.subject && { Subject: entry.subject }),
          ...(attrs && { MessageAttributes: attrs }),
        };
      });

      const response = await this.client.send(
        new PublishBatchCommand({
          TopicArn: topicArn,
          PublishBatchRequestEntries: batchEntries,
        })
      );
      return {
        successful: (response.Successful ?? []).map((s) => ({
          id: s.Id,
          messageId: s.MessageId,
        })),
        failed: (response.Failed ?? []).map((f) => ({
          id: f.Id,
          code: f.Code,
          message: f.Message,
          senderFault: f.SenderFault,
        })),
      };
    } catch (err) {
      mapSnsError(err, `Failed to publish batch to topic '${topicArn}'`);
    }
  }

  // ── Tag Operations ────────────────────────────────────────────────

  async listTagsForResource(topicArn: string) {
    try {
      const response = await this.client.send(
        new ListTagsForResourceCommand({ ResourceArn: topicArn })
      );
      const tags = (response.Tags ?? []).map((tag) => ({
        key: tag.Key ?? "",
        value: tag.Value ?? "",
      }));
      return { tags };
    } catch (err) {
      mapSnsError(err, `Failed to list tags for '${topicArn}'`);
    }
  }

  async tagResource(
    topicArn: string,
    tags: Array<{ key: string; value: string }>
  ) {
    try {
      await this.client.send(
        new TagResourceCommand({
          ResourceArn: topicArn,
          Tags: tags.map((t) => ({ Key: t.key, Value: t.value })),
        })
      );
      return { success: true };
    } catch (err) {
      mapSnsError(err, `Failed to tag resource '${topicArn}'`);
    }
  }

  async untagResource(topicArn: string, tagKeys: string[]) {
    try {
      await this.client.send(
        new UntagResourceCommand({
          ResourceArn: topicArn,
          TagKeys: tagKeys,
        })
      );
      return { success: true };
    } catch (err) {
      mapSnsError(err, `Failed to untag resource '${topicArn}'`);
    }
  }
}
