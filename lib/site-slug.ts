export function siteSlug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
