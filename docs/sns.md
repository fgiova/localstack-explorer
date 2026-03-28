# SNS Service Guide

SNS is a fully implemented service in LocalStack Explorer. It supports topic management, subscriptions with multiple protocols, message publishing (single and batch), topic attributes editing, filter policies, and tag management.

## Features

- List, create, and delete topics
- View and edit topic attributes (DisplayName, Policy, DeliveryPolicy)
- Create subscriptions with support for SQS, HTTP/S, Email, Email-JSON, and Lambda protocols
- SQS subscriptions link directly to the corresponding queue detail page
- Delete subscriptions
- View and edit subscription filter policies (JSON editor)
- Publish messages with optional Subject, Message Attributes, and Target ARN
- JSON editor (Monaco, lazy-loaded) for composing message bodies with validation and formatting
- Batch publish with per-entry results (successful/failed)
- Tag management: list, add, and remove tags
- Search/filter topics by name

## API Endpoints

All endpoints are prefixed with `/api/sns`.

### Topics

| Method | Path                       | Description        | Request                                     | Response               |
|--------|----------------------------|--------------------|---------------------------------------------|------------------------|
| GET    | `/`                        | List topics        | --                                          | `{ topics: [...] }`    |
| POST   | `/`                        | Create topic       | `{ name: string }`                          | `{ message: string }`  |
| DELETE | `/:topicName`              | Delete topic       | --                                          | `{ success: boolean }` |
| GET    | `/:topicName/attributes`   | Topic attributes   | --                                          | `{ topic: {...} }`     |
| PUT    | `/:topicName/attributes`   | Set topic attribute| `{ attributeName, attributeValue }`         | `{ success: boolean }` |

### Subscriptions

| Method | Path                                             | Description              | Request                        | Response                    |
|--------|--------------------------------------------------|--------------------------|--------------------------------|-----------------------------|
| GET    | `/:topicName/subscriptions`                      | List subscriptions       | --                             | `{ subscriptions: [...] }`  |
| POST   | `/:topicName/subscriptions`                      | Create subscription      | `{ protocol, endpoint }`      | `{ message, subscriptionArn }` |
| DELETE | `/subscriptions/:subscriptionArn`                | Delete subscription      | --                             | `{ success: boolean }`      |
| GET    | `/subscriptions/:subscriptionArn/attributes`     | Subscription attributes  | --                             | `{ subscription: {...} }`   |
| PUT    | `/subscriptions/:subscriptionArn/filter-policy`  | Set filter policy        | `{ filterPolicy: object }`    | `{ success: boolean }`      |

> **Note:** Subscription ARNs in URL parameters must be URL-encoded since they contain colons.

### Publish

| Method | Path                           | Description    | Request                                              | Response                              |
|--------|--------------------------------|----------------|------------------------------------------------------|---------------------------------------|
| POST   | `/:topicName/publish`          | Publish message| `{ message, subject?, messageAttributes?, targetArn? }` | `{ messageId: string }`           |
| POST   | `/:topicName/publish-batch`    | Publish batch  | `{ entries: [{ id, message, subject?, messageAttributes? }] }` | `{ successful: [...], failed: [...] }` |

### Tags

| Method | Path                  | Description  | Request                              | Response               |
|--------|-----------------------|--------------|--------------------------------------|------------------------|
| GET    | `/:topicName/tags`    | List tags    | --                                   | `{ tags: [...] }`      |
| POST   | `/:topicName/tags`    | Add tags     | `{ tags: [{ key, value }] }`        | `{ success: boolean }` |
| DELETE | `/:topicName/tags`    | Remove tags  | `{ tagKeys: [string] }`             | `{ success: boolean }` |

### Request/Response Examples

**List topics:**

```bash
curl http://localhost:3001/api/sns
```

```json
{
  "topics": [
    {
      "topicArn": "arn:aws:sns:us-east-1:000000000000:my-topic",
      "name": "my-topic"
    }
  ]
}
```

**Create topic:**

```bash
curl -X POST http://localhost:3001/api/sns \
  -H "Content-Type: application/json" \
  -d '{"name": "my-topic"}'
```

**Get topic attributes:**

```bash
curl http://localhost:3001/api/sns/my-topic/attributes
```

```json
{
  "topic": {
    "topicArn": "arn:aws:sns:us-east-1:000000000000:my-topic",
    "displayName": "",
    "owner": "000000000000",
    "policy": "{...}",
    "deliveryPolicy": "",
    "effectiveDeliveryPolicy": "{...}",
    "subscriptionsConfirmed": 2,
    "subscriptionsPending": 0,
    "subscriptionsDeleted": 0
  }
}
```

**Set topic display name:**

```bash
curl -X PUT http://localhost:3001/api/sns/my-topic/attributes \
  -H "Content-Type: application/json" \
  -d '{"attributeName": "DisplayName", "attributeValue": "My Topic"}'
```

**Create SQS subscription:**

```bash
curl -X POST http://localhost:3001/api/sns/my-topic/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"protocol": "sqs", "endpoint": "arn:aws:sqs:us-east-1:000000000000:my-queue"}'
```

**Publish message:**

```bash
curl -X POST http://localhost:3001/api/sns/my-topic/publish \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, World!", "subject": "Test"}'
```

**Publish message with attributes:**

```bash
curl -X POST http://localhost:3001/api/sns/my-topic/publish \
  -H "Content-Type: application/json" \
  -d '{
    "message": "{\"event\": \"order.created\", \"orderId\": 123}",
    "subject": "Order Event",
    "messageAttributes": {
      "eventType": { "dataType": "String", "stringValue": "order.created" }
    }
  }'
```

```json
{
  "messageId": "abc-123-def-456"
}
```

**Publish batch:**

```bash
curl -X POST http://localhost:3001/api/sns/my-topic/publish-batch \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      { "id": "msg-1", "message": "First message" },
      { "id": "msg-2", "message": "Second message", "subject": "Batch" }
    ]
  }'
```

```json
{
  "successful": [
    { "id": "msg-1", "messageId": "abc-123" },
    { "id": "msg-2", "messageId": "def-456" }
  ],
  "failed": []
}
```

**Set subscription filter policy:**

```bash
curl -X PUT "http://localhost:3001/api/sns/subscriptions/arn%3Aaws%3Asns%3Aus-east-1%3A000000000000%3Amy-topic%3Aabc-123/filter-policy" \
  -H "Content-Type: application/json" \
  -d '{"filterPolicy": {"eventType": ["order.created", "order.updated"]}}'
```

**Add tags:**

```bash
curl -X POST http://localhost:3001/api/sns/my-topic/tags \
  -H "Content-Type: application/json" \
  -d '{"tags": [{"key": "environment", "value": "development"}]}'
```

**Remove tags:**

```bash
curl -X DELETE http://localhost:3001/api/sns/my-topic/tags \
  -H "Content-Type: application/json" \
  -d '{"tagKeys": ["environment"]}'
```

## Error Handling

The SNS service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                    | Status | Error Code           |
|-----------------------------|--------|----------------------|
| Topic not found             | 404    | `NOT_FOUND`          |
| Subscription not found      | 404    | `NOT_FOUND`          |
| Invalid parameter           | 400    | `INVALID_PARAMETER`  |
| Authorization error         | 403    | `AUTHORIZATION_ERROR`|

All errors return a consistent JSON shape:

```json
{
  "error": "NOT_FOUND",
  "message": "Topic 'arn:aws:sns:...' not found",
  "statusCode": 404
}
```

## Backend Implementation

The SNS plugin consists of four files in `packages/backend/src/plugins/sns/`:

| File          | Purpose                                                                             |
|---------------|-------------------------------------------------------------------------------------|
| `index.ts`    | Plugin registration -- creates the SNS client and service, registers routes         |
| `service.ts`  | `SNSService` class -- business logic wrapping AWS SDK calls                         |
| `routes.ts`   | Fastify route definitions with TypeBox validation schemas                           |
| `schemas.ts`  | TypeBox schemas for all request inputs and response outputs                         |

### SNSService Methods

#### Topic Operations

| Method                                          | AWS SDK Command              | Description                                    |
|-------------------------------------------------|------------------------------|------------------------------------------------|
| `listTopics()`                                  | `ListTopicsCommand`          | Returns all topics with name extracted from ARN |
| `createTopic(name)`                             | `CreateTopicCommand`         | Creates a new standard topic                    |
| `deleteTopic(topicArn)`                         | `DeleteTopicCommand`         | Deletes a topic                                 |
| `getTopicAttributes(topicArn)`                  | `GetTopicAttributesCommand`  | Returns all topic attributes                    |
| `setTopicAttributes(arn, name, value)`          | `SetTopicAttributesCommand`  | Modifies a single topic attribute               |

#### Subscription Operations

| Method                                              | AWS SDK Command                    | Description                                 |
|-----------------------------------------------------|------------------------------------|---------------------------------------------|
| `listSubscriptionsByTopic(topicArn)`                | `ListSubscriptionsByTopicCommand`  | Returns subscriptions for a topic           |
| `createSubscription(topicArn, protocol, endpoint)`  | `SubscribeCommand`                 | Creates a new subscription                  |
| `deleteSubscription(subscriptionArn)`               | `UnsubscribeCommand`               | Removes a subscription                      |
| `getSubscriptionAttributes(subscriptionArn)`        | `GetSubscriptionAttributesCommand` | Returns all subscription attributes         |
| `setSubscriptionFilterPolicy(arn, policy)`          | `SetSubscriptionAttributesCommand` | Sets the FilterPolicy attribute             |

#### Publish Operations

| Method                                             | AWS SDK Command        | Description                                             |
|----------------------------------------------------|------------------------|---------------------------------------------------------|
| `publishMessage(topicArn, message, options?)`      | `PublishCommand`       | Publishes a single message with optional subject/attrs  |
| `publishBatch(topicArn, entries)`                  | `PublishBatchCommand`  | Publishes multiple messages, returns success/failure     |

#### Tag Operations

| Method                               | AWS SDK Command             | Description             |
|--------------------------------------|-----------------------------|-------------------------|
| `listTagsForResource(topicArn)`      | `ListTagsForResourceCommand`| Returns all topic tags  |
| `tagResource(topicArn, tags)`        | `TagResourceCommand`        | Adds tags to a topic    |
| `untagResource(topicArn, tagKeys)`   | `UntagResourceCommand`      | Removes tags by key     |

### ARN Construction

Routes use `:topicName` as a URL parameter and reconstruct the full ARN using LocalStack defaults:

```
arn:aws:sns:us-east-1:000000000000:{topicName}
```

Subscription ARNs in URL parameters are URL-encoded/decoded since they contain colons.

## Frontend Components

The SNS frontend is in `packages/frontend/src/components/sns/` and `packages/frontend/src/routes/sns/`.

| Component                  | Description                                                                         |
|----------------------------|-------------------------------------------------------------------------------------|
| `TopicList`                | Table of topics with search, create dialog, and delete with confirmation            |
| `TopicCreateDialog`        | Modal dialog for creating a new topic                                               |
| `TopicDetail`              | Tabbed view: Attributes, Subscriptions, Publish, Tags                               |
| `TopicAttributes`          | View/edit topic attributes with inline editing for DisplayName and JSON policies    |
| `SubscriptionList`         | Subscription table with protocol badges, SQS queue links, and filter policy access  |
| `SubscriptionCreateDialog` | Multi-protocol subscription form with SQS queue selector                            |
| `FilterPolicyDialog`       | JSON editor for viewing and editing subscription filter policies                    |
| `PublishMessageForm`       | Single and batch publish with Monaco editor, message attributes, subject, targetArn |
| `TagManager`               | Tag CRUD with inline add form and per-tag deletion                                  |

### Routes

| Route                | Component       | Description                          |
|----------------------|-----------------|--------------------------------------|
| `/sns`               | `TopicList`     | List and manage topics               |
| `/sns/:topicName`    | `TopicDetail`   | Topic detail with tabbed view        |

### TopicDetail Tabs

| Tab           | Component              | Description                                              |
|---------------|------------------------|----------------------------------------------------------|
| Attributes    | `TopicAttributes`      | Topic configuration, subscription counts, JSON policies  |
| Subscriptions | `SubscriptionList`     | Manage subscriptions with protocol-specific features     |
| Publish       | `PublishMessageForm`   | Compose and publish messages (single or batch)           |
| Tags          | `TagManager`           | Add and remove resource tags                             |

### Subscription Protocols

The subscription creation dialog adapts its endpoint input based on the selected protocol:

| Protocol    | Endpoint Input                                                        |
|-------------|-----------------------------------------------------------------------|
| SQS         | Dropdown of existing queues (from SQS service) or manual ARN input   |
| HTTP/HTTPS  | URL text input                                                        |
| Email       | Email address input                                                   |
| Email-JSON  | Email address input                                                   |
| Lambda      | Lambda function ARN input                                             |

SQS subscriptions in the subscription list include a clickable link that navigates to `/sqs/:queueName`.

### PublishMessageForm

The publish form includes a Monaco JSON editor (same as SQS):

- **Monaco Editor** loaded lazily (`React.lazy` + `Suspense`) to keep the initial bundle small
- **JSON mode toggle**: switch between plain text and JSON editing with validation
- **Format button**: pretty-prints JSON in the editor
- **Single publish**: message body, optional subject, target ARN, and dynamic message attributes (name, type, value)
- **Batch publish**: add multiple entries each with ID, message, and optional subject; results show successful/failed entries

### React Query Hooks

All hooks are in `packages/frontend/src/api/sns.ts`:

| Hook / Function                      | Type     | Query Key / Notes                                          |
|--------------------------------------|----------|------------------------------------------------------------|
| `useListTopics()`                    | Query    | `["sns", "topics"]`                                        |
| `useTopicAttributes(topicName)`      | Query    | `["sns", "topic", topicName, "attributes"]`                |
| `useTopicSubscriptions(topicName)`   | Query    | `["sns", "topic", topicName, "subscriptions"]`             |
| `useSubscriptionAttributes(arn)`     | Query    | `["sns", "subscription", arn, "attributes"]`               |
| `useTopicTags(topicName)`            | Query    | `["sns", "topic", topicName, "tags"]`                      |
| `useCreateTopic()`                   | Mutation | Invalidates `["sns", "topics"]`                            |
| `useDeleteTopic()`                   | Mutation | Invalidates `["sns", "topics"]`                            |
| `useSetTopicAttribute(topicName)`    | Mutation | Invalidates topic attributes                               |
| `useCreateSubscription(topicName)`   | Mutation | Invalidates topic subscriptions                            |
| `useDeleteSubscription(topicName)`   | Mutation | Invalidates topic subscriptions                            |
| `useSetFilterPolicy(arn)`            | Mutation | Invalidates subscription attributes                        |
| `usePublishMessage(topicName)`       | Mutation | Invalidates topic attributes (subscription counts)         |
| `usePublishBatch(topicName)`         | Mutation | Invalidates topic attributes (subscription counts)         |
| `useAddTags(topicName)`              | Mutation | Invalidates topic tags                                     |
| `useRemoveTags(topicName)`           | Mutation | Invalidates topic tags                                     |

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, delete, publish, or tag operation.
