import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, ApiResponses } from "../apiResponse";
import { ApiErrorCode } from "@/types/api";

describe("API Response Helpers", () => {
  describe("successResponse", () => {
    it("should create success response with data", async () => {
      const data = { id: 123, name: "Test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);

      // 验证响应体结构
      const body = await response.json();
      expect(body).toMatchObject({
        success: true,
        data,
      });
    });

    it("should include optional message", async () => {
      const data = { id: 123 };
      const message = "Operation successful";
      const response = successResponse(data, message);

      const body = await response.json();
      expect(body.message).toBe(message);
    });

    it("should include pagination meta", async () => {
      const data = { id: 123 };
      const meta = { page: 1, limit: 10, total: 100 };
      const response = successResponse(data, undefined, meta);

      const body = await response.json();
      expect(body.meta).toEqual(meta);
    });
  });

  describe("errorResponse", () => {
    it("should create error response with message", async () => {
      const message = "Something went wrong";
      const response = errorResponse(message);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toMatchObject({
        success: false,
        error: {
          message,
        },
      });
    });

    it("should include custom error code and status", async () => {
      const message = "Bad request";
      const code = ApiErrorCode.VALIDATION_ERROR;
      const status = 400;
      const response = errorResponse(message, code, status);

      expect(response.status).toBe(status);

      const body = await response.json();
      expect(body.error.code).toBe(code);
    });

    it("should include timestamp", async () => {
      const response = errorResponse("Test error");
      const body = await response.json();

      expect(body.error.timestamp).toBeDefined();
      expect(new Date(body.error.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("ApiResponses helpers", () => {
    it("should create badRequest response", async () => {
      const message = "Invalid input";
      const response = ApiResponses.badRequest(message);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it("should create unauthorized response", async () => {
      const response = ApiResponses.unauthorized();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe(ApiErrorCode.UNAUTHORIZED);
    });

    it("should create notFound response", async () => {
      const response = ApiResponses.notFound();

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe(ApiErrorCode.NOT_FOUND);
    });

    it("should create rateLimit response", async () => {
      const response = ApiResponses.rateLimit();

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error.code).toBe(ApiErrorCode.RATE_LIMIT);
    });

    it("should create invalidSignature response", async () => {
      const response = ApiResponses.invalidSignature();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe(ApiErrorCode.INVALID_SIGNATURE);
    });
  });
});
