import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { getStrapiImageUrl } from "@/lib/strapi";

interface CardProps {
  title: string;
  description?: string;
  href: string;
  imageUrl?: string;
  imageAlt?: string;
  badge?: string;
  badgeColor?: string;
  meta?: string;
  className?: string;
}

export function Card({
  title,
  description,
  href,
  imageUrl,
  imageAlt,
  badge,
  badgeColor,
  meta,
  className,
}: CardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-lg border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-lg",
        className
      )}
    >
      {imageUrl && (
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          <Image
            src={getStrapiImageUrl(imageUrl)}
            alt={imageAlt || title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-5">
        {badge && (
          <span
            className={cn(
              "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-2",
              badgeColor || "bg-primary-100 text-primary-800"
            )}
          >
            {badge}
          </span>
        )}
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{description}</p>
        )}
        {meta && (
          <p className="mt-3 text-xs text-gray-500">{meta}</p>
        )}
      </div>
    </Link>
  );
}
