import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { TopicAttributes } from "./TopicAttributes";
import { SubscriptionList } from "./SubscriptionList";
import { PublishMessageForm } from "./PublishMessageForm";
import { TagManager } from "./TagManager";

interface TopicDetailProps {
  topicName: string;
}

export function TopicDetail({ topicName }: TopicDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/sns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{topicName}</h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attributes">
        <TabsList>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="attributes">
          <TopicAttributes topicName={topicName} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionList topicName={topicName} />
        </TabsContent>

        <TabsContent value="publish">
          <PublishMessageForm topicName={topicName} />
        </TabsContent>

        <TabsContent value="tags">
          <TagManager topicName={topicName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
