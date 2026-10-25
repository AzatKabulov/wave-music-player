export type Locale = "en" | "ru" | "tk";
export function resolveLocale(language: string | null | undefined): Locale {
  const base = language?.toLowerCase().split(/[-_]/)[0];
  return base === "ru" || base === "tk" ? base : "en";
}
export function translateMessage(
  dictionary: Record<string, string>,
  message: string,
  values: Record<string, string | number> = {},
) {
  return (dictionary[message] || message).replace(
    /\{(\w+)\}/g,
    (match, key: string) => String(values[key] ?? match),
  );
}
