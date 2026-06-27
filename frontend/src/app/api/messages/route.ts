/**
 * GET /api/messages
 *
 * Lists contact messages with pagination, sorted by timestamp descending.
 * Message bodies are truncated to 100 characters in the list view.
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Message } from "@/types/entities";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

interface MessageDynamoItem extends DynamoDBItem {
  id: string;
  name: string;
  email: string;
  body: string;
  isRead: boolean;
  submittedAt: string;
}

const MAX_PAGE_SIZE = 20;
const DEFAULT_PAGE_SIZE = 20;
const BODY_TRUNCATE_LENGTH = 100;

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    );

    // Query all messages sorted by timestamp descending
    const allItems = await queryAllItems<MessageDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": Keys.message.gsi1pk(),
      },
      scanIndexForward: false,
    });

    const total = allItems.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pageItems = allItems.slice(startIndex, startIndex + pageSize);

    // Map to Message entities with truncated body
    const items: Message[] = pageItems.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      body:
        item.body.length > BODY_TRUNCATE_LENGTH
          ? item.body.slice(0, BODY_TRUNCATE_LENGTH) + "..."
          : item.body,
      isRead: item.isRead,
      submittedAt: item.submittedAt,
    }));

    const paginatedData: PaginatedResponse<Message> = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };

    const response: ApiResponse<PaginatedResponse<Message>> = {
      success: true,
      data: paginatedData,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error listing messages:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch messages",
    };
    return Response.json(response, { status: 500 });
  }
}
