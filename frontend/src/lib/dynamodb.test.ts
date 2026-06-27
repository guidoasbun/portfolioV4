/**
 * @jest-environment node
 */

/**
 * Tests for DynamoDB client helpers — key generation and generic operations.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Key Generation Tests ───────────────────────────────────────────────────

describe("Keys", () => {
  // Import directly — key generation is pure and doesn't need mocks.
  // We dynamically import to avoid module-level side effects from the real SDK client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Keys: any;

  beforeEach(async () => {
    jest.resetModules();
    // Mock the SDK clients to avoid real network initialization
    jest.mock("@aws-sdk/client-dynamodb", () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({})),
    }));
    jest.mock("@aws-sdk/lib-dynamodb", () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({ send: jest.fn() }),
      },
      GetCommand: jest.fn(),
      PutCommand: jest.fn(),
      QueryCommand: jest.fn(),
      DeleteCommand: jest.fn(),
      UpdateCommand: jest.fn(),
    }));
    const mod = await import("./dynamodb");
    Keys = mod.Keys;
  });

  describe("about", () => {
    it("generates correct PK and SK", () => {
      expect(Keys.about.pk()).toBe("ABOUT");
      expect(Keys.about.sk()).toBe("CONTENT");
    });
  });

  describe("project", () => {
    it("generates correct PK with id", () => {
      expect(Keys.project.pk("abc123")).toBe("PROJECT#abc123");
    });

    it("generates correct SK", () => {
      expect(Keys.project.sk()).toBe("META");
    });

    it("generates correct GSI1PK", () => {
      expect(Keys.project.gsi1pk()).toBe("PROJECTS");
    });

    it("generates zero-padded GSI1SK for display order", () => {
      expect(Keys.project.gsi1sk(1)).toBe("ORDER#00001");
      expect(Keys.project.gsi1sk(42)).toBe("ORDER#00042");
      expect(Keys.project.gsi1sk(99999)).toBe("ORDER#99999");
    });
  });

  describe("projectImage", () => {
    it("generates correct PK using project id", () => {
      expect(Keys.projectImage.pk("proj1")).toBe("PROJECT#proj1");
    });

    it("generates zero-padded SK for image order", () => {
      expect(Keys.projectImage.sk(1)).toBe("IMAGE#00001");
      expect(Keys.projectImage.sk(10)).toBe("IMAGE#00010");
    });
  });

  describe("experience", () => {
    it("generates correct PK with id", () => {
      expect(Keys.experience.pk("exp1")).toBe("EXP#exp1");
    });

    it("generates correct SK", () => {
      expect(Keys.experience.sk()).toBe("META");
    });

    it("generates correct GSI1PK", () => {
      expect(Keys.experience.gsi1pk()).toBe("EXPERIENCE");
    });

    it("generates correct GSI1SK with start date", () => {
      expect(Keys.experience.gsi1sk("2023-01-15")).toBe("DATE#2023-01-15");
    });
  });

  describe("skill", () => {
    it("generates correct PK with id", () => {
      expect(Keys.skill.pk("skill1")).toBe("SKILL#skill1");
    });

    it("generates correct SK", () => {
      expect(Keys.skill.sk()).toBe("META");
    });

    it("generates correct GSI1PK with category", () => {
      expect(Keys.skill.gsi1pk("Languages")).toBe("SKILLS#Languages");
    });

    it("generates correct GSI1SK with name", () => {
      expect(Keys.skill.gsi1sk("TypeScript")).toBe("NAME#TypeScript");
    });
  });

  describe("skillCategory", () => {
    it("generates correct PK with id", () => {
      expect(Keys.skillCategory.pk("cat1")).toBe("SKILLCAT#cat1");
    });

    it("generates correct SK", () => {
      expect(Keys.skillCategory.sk()).toBe("META");
    });

    it("generates correct GSI1PK", () => {
      expect(Keys.skillCategory.gsi1pk()).toBe("SKILLCATS");
    });

    it("generates zero-padded GSI1SK for display order", () => {
      expect(Keys.skillCategory.gsi1sk(3)).toBe("ORDER#00003");
    });
  });

  describe("resume", () => {
    it("generates correct PK with id", () => {
      expect(Keys.resume.pk("resume1")).toBe("RESUME#resume1");
    });

    it("generates correct SK", () => {
      expect(Keys.resume.sk()).toBe("META");
    });

    it("generates correct GSI1PK", () => {
      expect(Keys.resume.gsi1pk()).toBe("RESUMES");
    });

    it("generates correct GSI1SK with upload date", () => {
      expect(Keys.resume.gsi1sk("2024-03-15T10:30:00Z")).toBe(
        "DATE#2024-03-15T10:30:00Z",
      );
    });
  });

  describe("message", () => {
    it("generates correct PK with id", () => {
      expect(Keys.message.pk("msg1")).toBe("MSG#msg1");
    });

    it("generates correct SK", () => {
      expect(Keys.message.sk()).toBe("META");
    });

    it("generates correct GSI1PK", () => {
      expect(Keys.message.gsi1pk()).toBe("MESSAGES");
    });

    it("generates correct GSI1SK with timestamp", () => {
      expect(Keys.message.gsi1sk("2024-03-15T10:30:00Z")).toBe(
        "DATE#2024-03-15T10:30:00Z",
      );
    });
  });

  describe("webResume", () => {
    it("generates correct PK and SK", () => {
      expect(Keys.webResume.pk()).toBe("WEBRESUME");
      expect(Keys.webResume.sk()).toBe("CONTENT");
    });
  });
});

// ─── Generic Operations (mocked) ───────────────────────────────────────────

describe("Generic operations", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSend = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();

    jest.mock("@aws-sdk/client-dynamodb", () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({})),
    }));

    jest.mock("@aws-sdk/lib-dynamodb", () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({ send: mockSend }),
      },
      GetCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
      PutCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
      QueryCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      DeleteCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      UpdateCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
  });

  describe("getItem", () => {
    it("returns item when found", async () => {
      const { getItem } = await import("./dynamodb");
      const mockItem = { PK: "ABOUT", SK: "CONTENT", data: "test" };
      mockSend.mockResolvedValueOnce({ Item: mockItem });

      const result = await getItem({ PK: "ABOUT", SK: "CONTENT" });
      expect(result).toEqual(mockItem);
    });

    it("returns null when item not found", async () => {
      const { getItem } = await import("./dynamodb");
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await getItem({ PK: "ABOUT", SK: "CONTENT" });
      expect(result).toBeNull();
    });
  });

  describe("putItem", () => {
    it("sends a PutCommand with the item", async () => {
      const { putItem } = await import("./dynamodb");
      mockSend.mockResolvedValueOnce({});

      const item = { PK: "ABOUT", SK: "CONTENT", data: "hello" };
      await putItem(item);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("queryItems", () => {
    it("returns items and lastEvaluatedKey", async () => {
      const { queryItems } = await import("./dynamodb");
      const mockItems = [
        { PK: "PROJECT#1", SK: "META" },
        { PK: "PROJECT#2", SK: "META" },
      ];
      mockSend.mockResolvedValueOnce({
        Items: mockItems,
        LastEvaluatedKey: { PK: "PROJECT#2", SK: "META" },
      });

      const result = await queryItems({
        keyConditionExpression: "GSI1PK = :pk",
        expressionAttributeValues: { ":pk": "PROJECTS" },
        indexName: "GSI1",
      });

      expect(result.items).toEqual(mockItems);
      expect(result.lastEvaluatedKey).toEqual({
        PK: "PROJECT#2",
        SK: "META",
      });
    });

    it("returns empty array when no items found", async () => {
      const { queryItems } = await import("./dynamodb");
      mockSend.mockResolvedValueOnce({ Items: undefined });

      const result = await queryItems({
        keyConditionExpression: "PK = :pk",
        expressionAttributeValues: { ":pk": "NONEXISTENT" },
      });

      expect(result.items).toEqual([]);
      expect(result.lastEvaluatedKey).toBeUndefined();
    });
  });

  describe("deleteItem", () => {
    it("sends a DeleteCommand with the key", async () => {
      const { deleteItem } = await import("./dynamodb");
      mockSend.mockResolvedValueOnce({});

      await deleteItem({ PK: "MSG#1", SK: "META" });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateItem", () => {
    it("returns updated attributes", async () => {
      const { updateItem } = await import("./dynamodb");
      const updatedItem = { PK: "ABOUT", SK: "CONTENT", data: "updated" };
      mockSend.mockResolvedValueOnce({ Attributes: updatedItem });

      const result = await updateItem({
        key: { PK: "ABOUT", SK: "CONTENT" },
        updateExpression: "SET #data = :data",
        expressionAttributeValues: { ":data": "updated" },
        expressionAttributeNames: { "#data": "data" },
      });

      expect(result).toEqual(updatedItem);
    });

    it("returns null when no attributes returned", async () => {
      const { updateItem } = await import("./dynamodb");
      mockSend.mockResolvedValueOnce({ Attributes: undefined });

      const result = await updateItem({
        key: { PK: "ABOUT", SK: "CONTENT" },
        updateExpression: "SET #data = :data",
        expressionAttributeValues: { ":data": "test" },
      });

      expect(result).toBeNull();
    });
  });
});

// ─── TABLE_NAME ─────────────────────────────────────────────────────────────

describe("TABLE_NAME", () => {
  it("defaults to PortfolioTable when env is not set", async () => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-dynamodb", () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({})),
    }));
    jest.mock("@aws-sdk/lib-dynamodb", () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({ send: jest.fn() }),
      },
      GetCommand: jest.fn(),
      PutCommand: jest.fn(),
      QueryCommand: jest.fn(),
      DeleteCommand: jest.fn(),
      UpdateCommand: jest.fn(),
    }));
    const { TABLE_NAME } = await import("./dynamodb");
    expect(TABLE_NAME).toBe("PortfolioTable");
  });
});
