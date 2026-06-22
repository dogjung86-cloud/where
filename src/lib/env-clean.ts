export function cleanEnvValue(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

export function cleanAsciiEnvValue(value: string) {
  return cleanEnvValue(value).replace(/[^\x20-\x7E]/g, "");
}
