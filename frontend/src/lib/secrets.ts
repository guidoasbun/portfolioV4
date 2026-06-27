/**
 * Secrets Manager client and startup validation.
 *
 * Retrieves all sensitive configuration from AWS Secrets Manager during
 * application startup. Validates that every required secret is present and
 * parseable before the app can serve requests. Caches secrets after first
 * successful load so subsequent calls return instantly.
 */

import "server-only";

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// ─── Client Initialization ─────────────────────────────────────────────────

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

// ─── Secret Interfaces ──────────────────────────────────────────────────────

/** DynamoDB connection configuration stored in Secrets Manager. */
export interface DynamoDBSecretConfig {
  tableName: string;
  region: string;
}

/** Cognito authentication configuration stored in Secrets Manager. */
export interface CognitoSecretConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
}

/** S3 storage configuration stored in Secrets Manager. */
export interface S3SecretConfig {
  bucketName: string;
  region: string;
}

/** API keys stored in Secrets Manager. */
export interface ApiKeysSecretConfig {
  [key: string]: string;
}

/** All application secrets loaded from Secrets Manager. */
export interface AppSecrets {
  dynamodb: DynamoDBSecretConfig;
  cognito: CognitoSecretConfig;
  s3: S3SecretConfig;
  apiKeys: ApiKeysSecretConfig;
}

// ─── Secret Definitions ─────────────────────────────────────────────────────

/**
 * Defines required secrets and the fields each must contain.
 * Used during validation to produce specific error messages.
 */
const SECRET_DEFINITIONS = {
  dynamodb: {
    envKey: "DYNAMODB_SECRET_NAME",
    defaultName: "portfolio-prod-dynamodb-config",
    requiredFields: ["tableName", "region"] as const,
    label: "DynamoDB configuration",
  },
  cognito: {
    envKey: "COGNITO_SECRET_NAME",
    defaultName: "portfolio-prod-cognito-config",
    requiredFields: ["userPoolId", "clientId", "clientSecret"] as const,
    label: "Cognito configuration",
  },
  s3: {
    envKey: "S3_SECRET_NAME",
    defaultName: "portfolio-prod-s3-config",
    requiredFields: ["bucketName", "region"] as const,
    label: "S3 configuration",
  },
  apiKeys: {
    envKey: "API_KEYS_SECRET_NAME",
    defaultName: "portfolio-prod-api-keys",
    requiredFields: [] as const,
    label: "API keys",
  },
} as const;

// ─── Cached Secrets ─────────────────────────────────────────────────────────

let cachedSecrets: AppSecrets | null = null;

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Fetch a single secret value from Secrets Manager by name.
 * Throws with a specific error if the secret cannot be retrieved.
 */
async function fetchSecret(secretName: string, label: string): Promise<string> {
  let response: { SecretString?: string };

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    response = await client.send(command);
  } catch (error: unknown) {
    throw new Error(
      `Failed to retrieve secret "${label}" (${secretName}): ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  if (!response.SecretString) {
    throw new Error(
      `Secret "${label}" (${secretName}) exists but has no string value`,
    );
  }

  return response.SecretString;
}

/**
 * Parse a secret string as JSON. Throws with a specific error if parsing fails.
 */
function parseSecret<T>(raw: string, label: string, secretName: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Secret "${label}" (${secretName}) is not valid JSON`,
    );
  }
}

/**
 * Validate that all required fields are present and non-empty in a parsed secret.
 * Throws with a message identifying which field is missing or empty.
 */
export function validateSecretFields(
  parsed: Record<string, unknown>,
  requiredFields: readonly string[],
  label: string,
  secretName: string,
): void {
  for (const field of requiredFields) {
    const value = parsed[field];
    if (value === undefined || value === null) {
      throw new Error(
        `Secret "${label}" (${secretName}) is missing required field "${field}"`,
      );
    }
    if (typeof value === "string" && value.trim() === "") {
      throw new Error(
        `Secret "${label}" (${secretName}) has empty value for field "${field}"`,
      );
    }
  }
}

/**
 * Load and validate all application secrets from Secrets Manager.
 *
 * This function:
 * 1. Fetches each required secret from Secrets Manager
 * 2. Validates each secret is present (not missing)
 * 3. Validates each secret is not empty
 * 4. Validates each secret can be parsed as JSON
 * 5. Validates required fields are present and non-empty
 *
 * On any failure, throws an error identifying WHICH secret failed and WHY.
 * Results are cached after first successful load.
 *
 * @throws {Error} If any secret is missing, empty, unparseable, or has missing fields
 */
export async function loadSecrets(): Promise<AppSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const secrets: Partial<AppSecrets> = {};

  // Load DynamoDB config
  const dynamodbName =
    process.env[SECRET_DEFINITIONS.dynamodb.envKey] ??
    SECRET_DEFINITIONS.dynamodb.defaultName;
  const dynamodbRaw = await fetchSecret(dynamodbName, SECRET_DEFINITIONS.dynamodb.label);
  const dynamodbParsed = parseSecret<DynamoDBSecretConfig>(
    dynamodbRaw,
    SECRET_DEFINITIONS.dynamodb.label,
    dynamodbName,
  );
  validateSecretFields(
    dynamodbParsed as unknown as Record<string, unknown>,
    SECRET_DEFINITIONS.dynamodb.requiredFields,
    SECRET_DEFINITIONS.dynamodb.label,
    dynamodbName,
  );
  secrets.dynamodb = dynamodbParsed;

  // Load Cognito config
  const cognitoName =
    process.env[SECRET_DEFINITIONS.cognito.envKey] ??
    SECRET_DEFINITIONS.cognito.defaultName;
  const cognitoRaw = await fetchSecret(cognitoName, SECRET_DEFINITIONS.cognito.label);
  const cognitoParsed = parseSecret<CognitoSecretConfig>(
    cognitoRaw,
    SECRET_DEFINITIONS.cognito.label,
    cognitoName,
  );
  validateSecretFields(
    cognitoParsed as unknown as Record<string, unknown>,
    SECRET_DEFINITIONS.cognito.requiredFields,
    SECRET_DEFINITIONS.cognito.label,
    cognitoName,
  );
  secrets.cognito = cognitoParsed;

  // Load S3 config
  const s3Name =
    process.env[SECRET_DEFINITIONS.s3.envKey] ??
    SECRET_DEFINITIONS.s3.defaultName;
  const s3Raw = await fetchSecret(s3Name, SECRET_DEFINITIONS.s3.label);
  const s3Parsed = parseSecret<S3SecretConfig>(
    s3Raw,
    SECRET_DEFINITIONS.s3.label,
    s3Name,
  );
  validateSecretFields(
    s3Parsed as unknown as Record<string, unknown>,
    SECRET_DEFINITIONS.s3.requiredFields,
    SECRET_DEFINITIONS.s3.label,
    s3Name,
  );
  secrets.s3 = s3Parsed;

  // Load API keys
  const apiKeysName =
    process.env[SECRET_DEFINITIONS.apiKeys.envKey] ??
    SECRET_DEFINITIONS.apiKeys.defaultName;
  const apiKeysRaw = await fetchSecret(apiKeysName, SECRET_DEFINITIONS.apiKeys.label);
  const apiKeysParsed = parseSecret<ApiKeysSecretConfig>(
    apiKeysRaw,
    SECRET_DEFINITIONS.apiKeys.label,
    apiKeysName,
  );
  validateSecretFields(
    apiKeysParsed as unknown as Record<string, unknown>,
    SECRET_DEFINITIONS.apiKeys.requiredFields,
    SECRET_DEFINITIONS.apiKeys.label,
    apiKeysName,
  );
  secrets.apiKeys = apiKeysParsed;

  cachedSecrets = secrets as AppSecrets;
  return cachedSecrets;
}

/**
 * Validate that all secrets are retrievable and correctly structured.
 * Intended to be called at application startup, before serving any requests.
 *
 * Logs a success message on completion, or throws with a specific error
 * identifying which secret is missing or invalid.
 *
 * @throws {Error} If any required secret is missing, empty, or unparseable
 */
export async function validateSecretsAtStartup(): Promise<void> {
  console.log("[secrets] Validating application secrets...");

  try {
    await loadSecrets();
    console.log("[secrets] All secrets validated successfully.");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown secret validation error";
    console.error(`[secrets] Startup validation failed: ${message}`);
    throw new Error(`Application startup failed: ${message}`);
  }
}

/**
 * Get the cached secrets. Throws if secrets have not been loaded yet.
 * Use `loadSecrets()` or `validateSecretsAtStartup()` first.
 */
export function getSecrets(): AppSecrets {
  if (!cachedSecrets) {
    throw new Error(
      "Secrets have not been loaded. Call loadSecrets() or validateSecretsAtStartup() first.",
    );
  }
  return cachedSecrets;
}

/**
 * Clear the cached secrets (useful for testing).
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
}
