export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    const url = new URL(path, "com.tb.todo://app");

    if (
      url.hostname === "oauth2redirect" ||
      url.pathname === "/oauth2redirect"
    ) {
      return "/";
    }

    return path;
  } catch {
    return "/";
  }
}
