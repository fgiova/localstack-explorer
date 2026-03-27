import {
  CloudFormationClient,
  ListStacksCommand,
  DescribeStacksCommand,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStackEventsCommand,
  ListStackResourcesCommand,
  GetTemplateCommand,
  type Parameter,
} from "@aws-sdk/client-cloudformation";
import { AppError } from "../../shared/errors.js";
import type { Stack, StackDetail } from "./schemas.js";

export class CloudFormationService {
  constructor(private client: CloudFormationClient) {}

  async listStacks(): Promise<{ stacks: Stack[] }> {
    const command = new ListStacksCommand({
      StackStatusFilter: [
        "CREATE_COMPLETE",
        "UPDATE_COMPLETE",
        "CREATE_IN_PROGRESS",
        "UPDATE_IN_PROGRESS",
        "ROLLBACK_COMPLETE",
        "ROLLBACK_IN_PROGRESS",
        "DELETE_IN_PROGRESS",
      ],
    });
    const response = await this.client.send(command);
    const stacks: Stack[] = (response.StackSummaries ?? []).map((s) => ({
      stackId: s.StackId,
      stackName: s.StackName ?? "",
      status: s.StackStatus ?? "UNKNOWN",
      creationTime: s.CreationTime?.toISOString(),
      lastUpdatedTime: s.LastUpdatedTime?.toISOString(),
      description: s.TemplateDescription,
    }));
    return { stacks };
  }

  async getStack(stackName: string): Promise<StackDetail> {
    const describeCmd = new DescribeStacksCommand({ StackName: stackName });
    const describeRes = await this.client.send(describeCmd);
    const stack = describeRes.Stacks?.[0];
    if (!stack) {
      throw new AppError(`Stack '${stackName}' not found`, 404, "STACK_NOT_FOUND");
    }

    const resourcesCmd = new ListStackResourcesCommand({ StackName: stackName });
    const resourcesRes = await this.client.send(resourcesCmd);

    return {
      stackId: stack.StackId,
      stackName: stack.StackName ?? "",
      status: stack.StackStatus ?? "UNKNOWN",
      creationTime: stack.CreationTime?.toISOString(),
      lastUpdatedTime: stack.LastUpdatedTime?.toISOString(),
      description: stack.Description,
      outputs: (stack.Outputs ?? []).map((o) => ({
        outputKey: o.OutputKey,
        outputValue: o.OutputValue,
        description: o.Description,
      })),
      parameters: (stack.Parameters ?? []).map((p) => ({
        parameterKey: p.ParameterKey,
        parameterValue: p.ParameterValue,
      })),
      resources: (resourcesRes.StackResourceSummaries ?? []).map((r) => ({
        logicalResourceId: r.LogicalResourceId,
        physicalResourceId: r.PhysicalResourceId,
        resourceType: r.ResourceType,
        resourceStatus: r.ResourceStatus,
      })),
    };
  }

  async createStack(
    stackName: string,
    templateBody: string,
    parameters?: { parameterKey: string; parameterValue: string }[]
  ): Promise<{ message: string; stackId?: string }> {
    const params: Parameter[] | undefined = parameters?.map((p) => ({
      ParameterKey: p.parameterKey,
      ParameterValue: p.parameterValue,
    }));

    const command = new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: params,
    });
    const response = await this.client.send(command);
    return { message: `Stack '${stackName}' creation initiated`, stackId: response.StackId };
  }

  async deleteStack(stackName: string): Promise<{ success: boolean }> {
    const command = new DeleteStackCommand({ StackName: stackName });
    await this.client.send(command);
    return { success: true };
  }

  async getStackEvents(stackName: string): Promise<{ events: Array<Record<string, string | undefined>> }> {
    const command = new DescribeStackEventsCommand({ StackName: stackName });
    const response = await this.client.send(command);
    const events = (response.StackEvents ?? []).map((e) => ({
      eventId: e.EventId,
      logicalResourceId: e.LogicalResourceId,
      resourceType: e.ResourceType,
      resourceStatus: e.ResourceStatus,
      timestamp: e.Timestamp?.toISOString(),
      resourceStatusReason: e.ResourceStatusReason,
    }));
    return { events };
  }

  async getTemplate(stackName: string): Promise<{ templateBody: string }> {
    const command = new GetTemplateCommand({ StackName: stackName });
    const response = await this.client.send(command);
    return { templateBody: response.TemplateBody ?? "" };
  }
}