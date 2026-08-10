import type { Provenance, VerificationStatus } from "@/types";

/**
 * Shows where a piece of content came from and when a human last checked it.
 *
 * This is a deliberately plain first implementation. #38 owns the site-wide
 * treatment of verification badges — when it lands, adopt its visual language
 * here rather than growing a second, competing variant.
 *
 * Two rules this encodes, both from #10:
 *  - the difference between `verified` and `machine-draft` is the whole point,
 *    so the states must not read as interchangeable grey chips;
 *  - `machine-draft` explains what it means. "Draft" on its own tells a reader
 *    nothing about whether they can rely on the text.
 */

const STATUS_TEXT: Record<VerificationStatus, { label: string; meaning: string }> = {
  verified: {
    label: "Kontrollerad",
    meaning: "En människa har kontrollerat den här informationen mot källan.",
  },
  "needs-review": {
    label: "Behöver kontrolleras",
    meaning:
      "Informationen har inte kontrollerats mot källan på ett tag. Läs den med försiktighet och följ länken till källan.",
  },
  community: {
    label: "Tips från andra",
    meaning:
      "Det här kommer från andra användare, inte från en myndighet. Kontrollera alltid mot källan innan du agerar.",
  },
  "machine-draft": {
    label: "Maskinöversatt utkast",
    meaning:
      "Den här texten är översatt automatiskt och inte granskad av en människa. Den kan innehålla fel — kontrollera mot källan.",
  },
};

function formatVerifiedAt(value: string | undefined, locale: string): string {
  if (!value) {
    // Never render "Invalid Date", and never omit the line entirely — a missing
    // date must not look like a verified one.
    return "Inte kontrollerad";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Inte kontrollerad";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function ProvenanceNotice({
  provenance,
  locale,
}: {
  provenance?: Provenance;
  locale: string;
}) {
  if (!provenance) {
    return null;
  }

  const status = STATUS_TEXT[provenance.verificationStatus] ?? STATUS_TEXT["needs-review"];

  return (
    <aside className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
      <p className="font-medium text-gray-900">{status.label}</p>
      <p className="mt-1 text-gray-700">{status.meaning}</p>
      <dl className="mt-3 space-y-1 text-gray-600">
        <div className="flex gap-2">
          <dt className="font-medium">Senast kontrollerad:</dt>
          <dd>{formatVerifiedAt(provenance.lastVerifiedAt, locale)}</dd>
        </div>
        {provenance.sourceUrl && (
          <div className="flex gap-2">
            <dt className="font-medium">Källa:</dt>
            <dd>
              <a
                className="underline"
                href={provenance.sourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {provenance.sourceAuthority?.name ?? provenance.sourceUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>
      {provenance.legalDisclaimer && (
        <p className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
          {provenance.legalDisclaimer}
        </p>
      )}
    </aside>
  );
}
