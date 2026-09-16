export const AMAZON_ASSOCIATE_TAG =
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
export function getAmazonSearchUrl(
  searchTerm: string,
  tag: string | undefined = AMAZON_ASSOCIATE_TAG,
) {
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", searchTerm);
  if (tag?.trim()) url.searchParams.set("tag", tag.trim());
  return url.toString();
}
