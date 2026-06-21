import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message || "Invalid request", 400);
  }

  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }

  return jsonError("Invalid request", 400);
}
