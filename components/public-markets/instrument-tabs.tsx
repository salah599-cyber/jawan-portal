import Link from "next/link";
import type { PublicInstrumentSlug } from "@/lib/public-markets/constants";
import { PUBLIC_INSTRUMENT_SLUGS, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { PUBLIC_INSTRUMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";

const INSTRUMENT_LABELS: Record<PublicInstrumentSlug, string> = {
  equity: PUBLIC_INSTRUMENT_TYPE_LABELS.EQUITY,
  options: PUBLIC_INSTRUMENT_TYPE_LABELS.OPTION,
  "structured-notes": PUBLIC_INSTRUMENT_TYPE_LABELS.STRUCTURED_NOTE,
  all: "All instruments",
};

export function InstrumentTabs({
  activeInstrument,
  entityId,
  marketSlug,
}: {
  activeInstrument: PublicInstrumentSlug;
  entityId?: string;
  marketSlug: string;
}) {
  const params = new URLSearchParams();
  if (entityId) params.set("entity", entityId);
  params.set("market", marketSlug);

  return (
    <div className="flex flex-wrap gap-2">
      {PUBLIC_INSTRUMENT_SLUGS.map((slug) => {
        const nextParams = new URLSearchParams(params);
        nextParams.set("instrument", slug);
        const isActive = activeInstrument === slug;
        return (
          <Button key={slug} variant={isActive ? "default" : "outline"} size="sm" asChild>
            <Link href={`${PUBLIC_MARKETS_PATH}?${nextParams.toString()}`}>
              {INSTRUMENT_LABELS[slug]}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
