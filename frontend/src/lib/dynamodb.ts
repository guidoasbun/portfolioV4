/**
 * DynamoDB Document Client and single-table helpers.
 *
 * Uses a single table design with composite keys (PK, SK) and GSI1
 * for alternate access patterns. All entity-specific key generation
 * and generic CRUD operations are exposed from this module.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

// ─── Client Initialization ─────────────────────────────────────────────────

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "PortfolioTable";

// ─── Key Generation Helpers ─────────────────────────────────────────────────

export const Keys = {
  about: {
    pk: () => "ABOUT" as const,
    sk: () => "CONTENT" as const,
  },

  project: {
    pk: (id: string) => `PROJECT#${id}`,
    sk: () => "META" as const,
    gsi1pk: () => "PROJECTS" as const,
    gsi1sk: (displayOrder: number) => `ORDER#${String(displayOrder).padStart(5, "0")}`,
  },

  projectImage: {
    pk: (projectId: string) => `PROJECT#${projectId}`,
    sk: (order: number) => `IMAGE#${String(order).padStart(5, "0")}`,
  },

  experience: {
    pk: (id: string) => `EXP#${id}`,
    sk: () => "META" as const,
    gsi1pk: () => "EXPERIENCE" as const,
    gsi1sk: (startDate: string) => `DATE#${startDate}`,
  },

  skill: {
    pk: (id: string) => `SKILL#${id}`,
    sk: () => "META" as const,
    gsi1pk: (category: string) => `SKILLS#${category}`,
    gsi1sk: (name: string) => `NAME#${name}`,
  },

  skillCategory: {
    pk: (id: string) => `SKILLCAT#${id}`,
    sk: () => "META" as const,
    gsi1pk: () => "SKILLCATS" as const,
    gsi1sk: (displayOrder: number) => `ORDER#${String(displayOrder).padStart(5, "0")}`,
  },

  resume: {
    pk: (id: string) => `RESUME#${id}`,
    sk: () => "META" as const,
    gsi1pk: () => "RESUMES" as const,
    gsi1sk: (uploadDate: string) => `DATE#${uploadDate}`,
  },

  message: {
    pk: (id: string) => `MSG#${id}`,
    sk: () => "META" as const,
    gsi1pk: () => "MESSAGES" as const,
    gsi1sk: (timestamp: string) => `DATE#${timestamp}`,
  },

  webResume: {
    pk: () => "WEBRESUME" as const,
    sk: () => "CONTENT" as const,
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DynamoDBKey {
  PK: string;
  SK: string;
}

export interface DynamoDBItem extends DynamoDBKey {
  type?: string;
  GSI1PK?: string;
  GSI1SK?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: NativeAttributeValue;
}

export interface QueryOptions {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeValues: Record<string, NativeAttributeValue>;
  expressionAttributeNames?: Record<string, string>;
  scanIndexForward?: boolean;
  limit?: number;
  exclusiveStartKey?: Record<string, NativeAttributeValue>;
  filterExpression?: string;
}

export interface UpdateOptions {
  key: DynamoDBKey;
  updateExpression: string;
  expressionAttributeValues: Record<string, NativeAttributeValue>;
  expressionAttributeNames?: Record<string, string>;
  conditionExpression?: string;
}

// ─── Generic Operations ─────────────────────────────────────────────────────

/**
 * Get a single item by its primary key (PK + SK).
 */
export async function getItem<T extends DynamoDBItem>(
  key: DynamoDBKey,
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: key,
    }),
  );

  return (result.Item as T) ?? null;
}

/**
 * Put (create or overwrite) an item in the table.
 */
export async function putItem(item: DynamoDBItem): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
}

/**
 * Query items using a key condition expression.
 * Supports both the main table and GSI indexes.
 */
export async function queryItems<T extends DynamoDBItem>(
  options: QueryOptions,
): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, NativeAttributeValue> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: options.indexName,
      KeyConditionExpression: options.keyConditionExpression,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ScanIndexForward: options.scanIndexForward,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
      FilterExpression: options.filterExpression,
    }),
  );

  return {
    items: (result.Items as T[]) ?? [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Delete an item by its primary key (PK + SK).
 */
export async function deleteItem(key: DynamoDBKey): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: key,
    }),
  );
}

/**
 * Update an item using an update expression.
 * Returns the updated item attributes.
 */
export async function updateItem<T extends DynamoDBItem>(
  options: UpdateOptions,
): Promise<T | null> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: options.key,
      UpdateExpression: options.updateExpression,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ConditionExpression: options.conditionExpression,
      ReturnValues: "ALL_NEW",
    }),
  );

  return (result.Attributes as T) ?? null;
}
