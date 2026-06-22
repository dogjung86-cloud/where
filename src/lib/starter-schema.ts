export function isMissingStarterSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";

  return (
    ["42P01", "42703", "PGRST200", "PGRST204"].includes(code) ||
    /starter_photos|starter_photo_id|schema cache/i.test(message)
  );
}
