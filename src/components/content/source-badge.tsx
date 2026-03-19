import Link from "next/link";

interface SourceBadgeProps {
  name: string;
  slug: string;
}

export function SourceBadge({ name, slug }: SourceBadgeProps) {
  return (
    <Link href={`/sources/${slug}`} className="badge-chip badge-chip--soft">
      {name}
    </Link>
  );
}
