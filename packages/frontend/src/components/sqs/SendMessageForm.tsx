import { useState } from "react";
import { useSendMessage } from "@/api/sqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// TODO: FIFO support
// - Add MessageGroupId input (required when queue is FIFO)
// - Add MessageDeduplicationId input (optional, auto-generated if content-based dedup is enabled)
// - QueueDetail should pass a `isFifo` prop to conditionally show these fields

type AttributeDataType = "String" | "Number" | "Binary";

interface MessageAttributeRow {
  id: number;
  name: string;
  dataType: AttributeDataType;
  value: string;
}

interface SendMessageFormProps {
  queueName: string;
}

let nextId = 1;

export function SendMessageForm({ queueName }: SendMessageFormProps) {
  const [body, setBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState<string>("");
  const [attributes, setAttributes] = useState<MessageAttributeRow[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMessage = useSendMessage(queueName);

  function addAttribute() {
    setAttributes((prev) => [
      ...prev,
      { id: nextId++, name: "", dataType: "String", value: "" },
    ]);
  }

  function removeAttribute(id: number) {
    setAttributes((prev) => prev.filter((attr) => attr.id !== id));
  }

  function updateAttribute(
    id: number,
    field: keyof Omit<MessageAttributeRow, "id">,
    value: string
  ) {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === id ? { ...attr, [field]: value } : attr
      )
    );
  }

  function resetForm() {
    setBody("");
    setDelaySeconds("");
    setAttributes([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const messageAttributes: Record<
      string,
      { dataType: string; stringValue?: string; binaryValue?: string }
    > = {};

    for (const attr of attributes) {
      if (!attr.name.trim()) continue;
      if (attr.dataType === "Binary") {
        messageAttributes[attr.name.trim()] = {
          dataType: attr.dataType,
          binaryValue: attr.value,
        };
      } else {
        messageAttributes[attr.name.trim()] = {
          dataType: attr.dataType,
          stringValue: attr.value,
        };
      }
    }

    const request = {
      body,
      ...(delaySeconds !== "" && {
        delaySeconds: Number(delaySeconds),
      }),
      ...(Object.keys(messageAttributes).length > 0 && { messageAttributes }),
    };

    sendMessage.mutate(request, {
      onSuccess: (data) => {
        setSuccessMessage(`Message sent successfully. ID: ${data.messageId}`);
        resetForm();
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to send message.";
        setErrorMessage(message);
      },
    });
  }

  const isPending = sendMessage.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Message Body */}
      <div className="space-y-1.5">
        <Label htmlFor="message-body">Message Body *</Label>
        <Textarea
          id="message-body"
          placeholder="Enter message body..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          disabled={isPending}
        />
      </div>

      {/* Delay Seconds */}
      <div className="space-y-1.5">
        <Label htmlFor="delay-seconds">Delay Seconds (optional, 0–900)</Label>
        <Input
          id="delay-seconds"
          type="number"
          min={0}
          max={900}
          placeholder="0"
          value={delaySeconds}
          onChange={(e) => setDelaySeconds(e.target.value)}
          disabled={isPending}
          className="w-40"
        />
      </div>

      {/* Message Attributes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message Attributes (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAttribute}
            disabled={isPending}
          >
            Add Attribute
          </Button>
        </div>

        {attributes.length > 0 && (
          <div className="space-y-2">
            {attributes.map((attr) => (
              <div
                key={attr.id}
                className="flex items-center gap-2 rounded-md border border-input p-2"
              >
                <Input
                  placeholder="Name"
                  value={attr.name}
                  onChange={(e) =>
                    updateAttribute(attr.id, "name", e.target.value)
                  }
                  disabled={isPending}
                  className="flex-1"
                  aria-label="Attribute name"
                />
                <Select
                  value={attr.dataType}
                  onChange={(e) =>
                    updateAttribute(
                      attr.id,
                      "dataType",
                      e.target.value as AttributeDataType
                    )
                  }
                  disabled={isPending}
                  className="w-28"
                  aria-label="Attribute data type"
                >
                  <option value="String">String</option>
                  <option value="Number">Number</option>
                  <option value="Binary">Binary</option>
                </Select>
                <Input
                  placeholder="Value"
                  value={attr.value}
                  onChange={(e) =>
                    updateAttribute(attr.id, "value", e.target.value)
                  }
                  disabled={isPending}
                  className="flex-1"
                  aria-label="Attribute value"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeAttribute(attr.id)}
                  disabled={isPending}
                  aria-label="Remove attribute"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback */}
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isPending || !body.trim()}>
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
