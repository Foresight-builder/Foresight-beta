import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, ApiResponses } from "../apiResponse";
import { ApiErrorCode } from "@/types/api";

describe("API Response Helpers", () => {
  describe("successResponse", () => {
    it("should create success response with data", () => {
      const data = { id: 123, name: "Test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);

      // 验证响应体结构
      const body = JSON.parse(JSON.stringify(response));
      expect(body).toMatchObject({
        success: true,
        data,
      });
    });

    it("should include optional message", () => {
      const data = { id: 123 };
      const message = "Operation successful";
      const response = successResponse(data, message);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.message).toBe(message);
    });

    it("should include pagination meta", () => {
      const data = [1, 2, 3];
      const meta = { page: 1, limit: 10, total: 100 };
      const response = successResponse(data, undefined, meta);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.meta).toEqual(meta);
    });
  });

  describe("errorResponse", () => {
    it("should create error response with message", () => {
      const message = "Something went wrong";
      const response = errorResponse(message);

      expect(response.status).toBe(500);

      const body = JSON.parse(JSON.stringify(response));
      expect(body).toMatchObject({
        success: false,
        error: {
          message,
          code: ApiErrorCode.INTERNAL_ERROR,
        },
      });
    });

    it("should include custom error code and status", () => {
      const message = "Not found";
      const code = ApiErrorCode.NOT_FOUND;
      const status = 404;
      const response = errorResponse(message, code, status);

      expect(response.status).toBe(404);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(code);
    });

    it("should include timestamp", () => {
      const response = errorResponse("Error");
      const body = JSON.parse(JSON.stringify(response));

      expect(body.error.timestamp).toBeDefined();
      expect(new Date(body.error.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("ApiResponses helpers", () => {
    it("should create badRequest response", () => {
      const response = ApiResponses.badRequest("Invalid input");

      expect(response.status).toBe(400);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it("should create unauthorized response", () => {
      const response = ApiResponses.unauthorized();

      expect(response.status).toBe(401);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(body.error.message).toContain("未授权");
    });

    it("should create notFound response", () => {
      const response = ApiResponses.notFound("Resource not found");

      expect(response.status).toBe(404);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(ApiErrorCode.NOT_FOUND);
    });

    it("should create rateLimit response", () => {
      const response = ApiResponses.rateLimit();

      expect(response.status).toBe(429);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(ApiErrorCode.RATE_LIMIT);
    });

    it("should create invalidSignature response", () => {
      const response = ApiResponses.invalidSignature("Signature verification failed");

      expect(response.status).toBe(401);

      const body = JSON.parse(JSON.stringify(response));
      expect(body.error.code).toBe(ApiErrorCode.INVALID_SIGNATURE);
    });
  });
});
