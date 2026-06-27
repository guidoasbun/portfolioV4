/**
 * POST /api/contact
 *
 * Accepts a contact form submission from visitors.
 * Validates input fields, saves the message to DynamoDB,
 * and returns a success confirmation or field-specific errors.
 */

import { putItem, Keys } from "@/lib/dynamodb";
import { validateContactForm } from "@/lib/validation";
import type { ContactFormRequest, ApiResponse } from "@/types/api";

export async function POST(request: Request): Promise<Response> {
  let body: ContactFormRequest;

  try {
    body = await request.json();
  } catch {
    const response: ApiResponse = {
      success: false,
      error: "Invalid request body",
    };
    return Response.json(response, { status: 400 });
  }

  // Validate contact form input
  const validation = validateContactForm({
    name: body.name ?? "",
    email: body.email ?? "",
    message: body.message ?? "",
  });

  if (!validation.success) {
    const response: ApiResponse = {
      success: false,
      errors: validation.errors,
    };
    return Response.json(response, { status: 400 });
  }

  // Save message to DynamoDB
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();

  try {
    await putItem({
      PK: Keys.message.pk(id),
      SK: Keys.message.sk(),
      GSI1PK: Keys.message.gsi1pk(),
      GSI1SK: Keys.message.gsi1sk(submittedAt),
      type: "message",
      id,
      name: body.name.trim(),
      email: body.email.trim(),
      body: body.message.trim(),
      isRead: false,
      submittedAt,
    });
  } catch (error) {
    console.error("Error saving contact message:", error);
    const response: ApiResponse = {
      success: false,
      error: "Service temporarily unavailable",
    };
    return Response.json(response, { status: 503 });
  }

  const response: ApiResponse = {
    success: true,
    message: "Message sent successfully",
  };
  return Response.json(response, { status: 201 });
}
