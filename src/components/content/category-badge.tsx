import Link from "next/link";

interface CategoryBadgeProps {
  name: string;
  slug: string;
}

export function CategoryBadge({ name, slug }: CategoryBadgeProps) {
  return (
    <Link href={`/categories/${slug}`} className="badge-chip">
      {name}
    </Link>
  );
}
