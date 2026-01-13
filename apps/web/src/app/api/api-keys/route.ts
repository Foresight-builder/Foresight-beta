import { NextRequest } from "next/server";
import { successResponse, withErrorHandler, ApiResponses } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  // API Keys feature is under development
  return successResponse([], "API keys retrieved successfully");
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // API Keys feature is under development
  return ApiResponses.badRequest("API Keys feature is under development");
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  // API Keys feature is under development
  return ApiResponses.badRequest("API Keys feature is under development");
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  // API Keys feature is under development
  return ApiResponses.badRequest("API Keys feature is under development");
});
