import { redirect } from "next/navigation";

export default async function MsxPortfolioRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity } = await searchParams;
  const query = new URLSearchParams({ market: "MSX" });
  if (entity) query.set("entity", entity);
  redirect(`/portfolio/public-markets?${query.toString()}`);
}
