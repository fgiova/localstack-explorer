import { useState } from "react";
import { useReceiveMessages, useDeleteMessage } from "@/api/sqs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MessageViewerProps {
  queueName: string;
}

function formatBody(body: string): { isJson: boolean; content: string } {
  try {
    const parsed = JSON.parse(body);
    return { isJson: true, content: JSON.stringify(parsed, null, 2) };
  } catch {
    return { isJson: false, content: body };
  }
}

export function MessageViewer({ queueName }: MessageViewerProps) {
  const [enabled, setEnabled] = useState(false);

  const { data, isFetching, refetch } = useReceiveMessages(queueName, {
    maxNumberOfMessages: 10,
  });

  const deleteMessage = useDeleteMessage(queueName);

  const messages = data?.messages ?? [];

  function handleReceive() {
    setEnabled(true);
    refetch();
  }

  function handleDelete(receiptHandle: string) {
    deleteMessage.mutate({ receiptHandle });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={handleReceive} disabled={isFetching}>
          {isFetching ? "Receiving..." : "Receive Messages"}
        </Button>
        {enabled && !isFetching && (
          <span className="text-sm text-muted-foreground">
            {messages.length === 0
              ? "No messages available"
              : `${messages.length} message${messages.length === 1 ? "" : "s"} received`}
          </span>
        )}
      </div>

      {enabled && !isFetching && messages.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          The queue is empty or no messages are currently visible.
        </div>
      )}

      {messages.map((message) => {
        const { isJson, content } = formatBody(message.body);
        const hasAttributes =
          message.messageAttributes &&
          Object.keys(message.messageAttributes).length > 0;

        return (
          <Card key={message.messageId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground break-all">
                ID: {message.messageId}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Body */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Body
                </p>
                {isJson ? (
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm font-mono whitespace-pre-wrap break-all">
                    {content}
                  </pre>
                ) : (
                  <p className="text-sm break-all">{content}</p>
                )}
              </div>

              {/* Message Attributes */}
              {hasAttributes && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Message Attributes
                  </p>
                  <div className="space-y-1">
                    {Object.entries(message.messageAttributes!).map(
                      ([key, attr]) => (
                        <div
                          key={key}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <span className="font-medium">{key}:</span>
                          <span className="break-all">
                            {attr.stringValue ?? attr.binaryValue ?? ""}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {attr.dataType}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-0">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMessage.isPending}
                onClick={() => handleDelete(message.receiptHandle)}
              >
                {deleteMessage.isPending ? "Deleting..." : "Delete"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
