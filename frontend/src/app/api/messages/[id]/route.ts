/**
 * GET /api/messages/[id] - Returns a single message and marks it as read.
 * DELETE /api/messages/[id] - Deletes a message.
 */

import type { NextRequest } from "next/server";
import { getItem, deleteItem, updateItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Message } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

interface MessageDynamoItem extends DynamoDBItem {
  id: string;
  name: string;
  email: string;
  body: string;
  isRead: boolean;
  submittedAt: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      const response: ApiResponse = {
        success: false,
        error: "Message ID is required",
      };
      return Response.json(response, { status: 400 });
    }

    const item = await getItem<MessageDynamoItem>({
      PK: Keys.message.pk(id),
      SK: Keys.message.sk(),
    });

    if (!item) {
      const response: ApiResponse = {
        success: false,
        error: "Message not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Mark as read if not already
    if (!item.isRead) {
      await updateItem({
        key: {
          PK: Keys.message.pk(id),
          SK: Keys.message.sk(),
        },
        updateExpression: "SET isRead = :isRead",
        expressionAttributeValues: {
          ":isRead": true,
        },
      });
    }

    const message: Message = {
      id: item.id,
      name: item.name,
      email: item.email,
      body: item.body,
      isRead: true,
      submittedAt: item.submittedAt,
    };

    const response: ApiResponse<Message> = {
      success: true,
      data: message,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching message:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch message",
    };
    return Response.json(response, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      const response: ApiResponse = {
        success: false,
        error: "Message ID is required",
      };
      return Response.json(response, { status: 400 });
    }

    // Verify the message exists
    const item = await getItem<MessageDynamoItem>({
      PK: Keys.message.pk(id),
      SK: Keys.message.sk(),
    });

    if (!item) {
      const response: ApiResponse = {
        success: false,
        error: "Message not found",
      };
      return Response.json(response, { status: 404 });
    }

    await deleteItem({
      PK: Keys.message.pk(id),
      SK: Keys.message.sk(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Message deleted successfully",
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error deleting message:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete message",
    };
    return Response.json(response, { status: 500 });
  }
}
