import {
	CreateQueueCommand,
	DeleteMessageCommand,
	DeleteQueueCommand,
	GetQueueAttributesCommand,
	GetQueueUrlCommand,
	ListQueuesCommand,
	type MessageAttributeValue,
	PurgeQueueCommand,
	ReceiveMessageCommand,
	SendMessageCommand,
	type SQSClient,
} from "@aws-sdk/client-sqs";
import { AppError } from "../../shared/errors.js";

export class SQSService {
	constructor(private client: SQSClient) {}

	async getQueueUrl(name: string): Promise<string> {
		try {
			const response = await this.client.send(
				new GetQueueUrlCommand({ QueueName: name }),
			);
			return response.QueueUrl ?? "";
		} catch (err) {
			const error = err as Error & { name: string };
			if (
				error.name === "QueueDoesNotExist" ||
				error.name === "NonExistentQueue"
			) {
				throw new AppError(`Queue '${name}' not found`, 404, "QUEUE_NOT_FOUND");
			}
			throw error;
		}
	}

	async listQueues() {
		const response = await this.client.send(new ListQueuesCommand({}));
		const queueUrls = response.QueueUrls ?? [];
		const queues = queueUrls.map((url) => {
			const parts = url.split("/");
			const queueName = parts[parts.length - 1] ?? "";
			return { queueUrl: url, queueName };
		});
		return { queues };
	}

	async createQueue(name: string) {
		// TODO: FIFO support
		// - Add `fifo` boolean parameter to createQueue
		// - When fifo=true, append `.fifo` suffix to queue name if not present
		// - Pass FifoQueue: "true" and optionally ContentBasedDeduplication: "true" as Attributes
		try {
			const response = await this.client.send(
				new CreateQueueCommand({ QueueName: name }),
			);
			return {
				message: `Queue '${name}' created successfully`,
				queueUrl: response.QueueUrl,
			};
		} catch (err) {
			const error = err as Error & { name: string };
			if (error.name === "QueueAlreadyExists") {
				throw new AppError(
					`Queue '${name}' already exists`,
					409,
					"QUEUE_EXISTS",
				);
			}
			throw error;
		}
	}

	async deleteQueue(queueUrl: string) {
		try {
			await this.client.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
			return { success: true };
		} catch (err) {
			const error = err as Error & { name: string };
			if (error.name === "NonExistentQueue") {
				throw new AppError(
					`Queue '${queueUrl}' not found`,
					404,
					"QUEUE_NOT_FOUND",
				);
			}
			throw error;
		}
	}

	async purgeQueue(queueUrl: string) {
		try {
			await this.client.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
			return { success: true };
		} catch (err) {
			const error = err as Error & { name: string };
			if (error.name === "NonExistentQueue") {
				throw new AppError(
					`Queue '${queueUrl}' not found`,
					404,
					"QUEUE_NOT_FOUND",
				);
			}
			if (error.name === "PurgeQueueInProgress") {
				throw new AppError(
					`Queue '${queueUrl}' purge already in progress`,
					409,
					"PURGE_IN_PROGRESS",
				);
			}
			throw error;
		}
	}

	async getQueueDetail(queueName: string) {
		// TODO: FIFO support
		// - getQueueDetail should also return FifoQueue and ContentBasedDeduplication attributes
		const queueUrl = await this.getQueueUrl(queueName);
		try {
			const response = await this.client.send(
				new GetQueueAttributesCommand({
					QueueUrl: queueUrl,
					AttributeNames: ["All"],
				}),
			);
			const attrs = response.Attributes ?? {};
			return {
				queueUrl,
				queueName,
				queueArn: attrs.QueueArn,
				approximateNumberOfMessages: Number(
					attrs.ApproximateNumberOfMessages ?? 0,
				),
				approximateNumberOfMessagesNotVisible: Number(
					attrs.ApproximateNumberOfMessagesNotVisible ?? 0,
				),
				approximateNumberOfMessagesDelayed: Number(
					attrs.ApproximateNumberOfMessagesDelayed ?? 0,
				),
				createdTimestamp: attrs.CreatedTimestamp,
				lastModifiedTimestamp: attrs.LastModifiedTimestamp,
				visibilityTimeout: Number(attrs.VisibilityTimeout ?? 0),
				maximumMessageSize: Number(attrs.MaximumMessageSize ?? 0),
				messageRetentionPeriod: Number(attrs.MessageRetentionPeriod ?? 0),
				delaySeconds: Number(attrs.DelaySeconds ?? 0),
				receiveMessageWaitTimeSeconds: Number(
					attrs.ReceiveMessageWaitTimeSeconds ?? 0,
				),
			};
		} catch (err) {
			const error = err as Error & { name: string };
			if (error.name === "NonExistentQueue") {
				throw new AppError(
					`Queue '${queueName}' not found`,
					404,
					"QUEUE_NOT_FOUND",
				);
			}
			throw error;
		}
	}

	async sendMessage(
		queueName: string,
		body: string,
		delaySeconds?: number,
		messageAttributes?: Record<
			string,
			{ DataType: string; StringValue: string }
		>,
		// TODO: FIFO support
		// - Accept optional MessageGroupId (required for FIFO queues) and MessageDeduplicationId
		// - Pass these to SendMessageCommand when provided
	) {
		const queueUrl = await this.getQueueUrl(queueName);

		const attrs: Record<string, MessageAttributeValue> | undefined =
			messageAttributes
				? Object.fromEntries(
						Object.entries(messageAttributes).map(([k, v]) => [
							k,
							{ DataType: v.DataType, StringValue: v.StringValue },
						]),
					)
				: undefined;

		const response = await this.client.send(
			new SendMessageCommand({
				QueueUrl: queueUrl,
				MessageBody: body,
				...(delaySeconds !== undefined && { DelaySeconds: delaySeconds }),
				...(attrs && { MessageAttributes: attrs }),
			}),
		);

		return { messageId: response.MessageId };
	}

	async receiveMessages(
		queueName: string,
		maxMessages: number = 1,
		waitTimeSeconds: number = 20,
		abortSignal?: AbortSignal,
		// TODO: FIFO support
		// - receiveMessages should return SequenceNumber for FIFO messages
	) {
		const queueUrl = await this.getQueueUrl(queueName);

		const response = await this.client.send(
			new ReceiveMessageCommand({
				QueueUrl: queueUrl,
				MaxNumberOfMessages: maxMessages,
				WaitTimeSeconds: waitTimeSeconds,
				MessageAttributeNames: ["All"],
			}),
			{ abortSignal },
		);

		const messages = (response.Messages ?? []).map((msg) => ({
			messageId: msg.MessageId,
			body: msg.Body,
			receiptHandle: msg.ReceiptHandle,
			attributes: msg.Attributes,
			messageAttributes: msg.MessageAttributes
				? Object.fromEntries(
						Object.entries(msg.MessageAttributes).map(([k, v]) => [
							k,
							{ DataType: v.DataType, StringValue: v.StringValue },
						]),
					)
				: undefined,
		}));

		return messages;
	}

	async deleteMessage(queueName: string, receiptHandle: string) {
		const queueUrl = await this.getQueueUrl(queueName);

		await this.client.send(
			new DeleteMessageCommand({
				QueueUrl: queueUrl,
				ReceiptHandle: receiptHandle,
			}),
		);

		return { success: true };
	}
}
