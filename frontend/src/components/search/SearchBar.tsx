"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ className, autoFocus }: SearchBarProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { results, isLoading } = useSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            placeholder={t("placeholder")}
            className="w-full ps-12 pe-10 py-3 rounded-full border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus={autoFocus}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setShowDropdown(false);
                inputRef.current?.focus();
              }}
              className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown results */}
      {showDropdown && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {t("placeholder")}...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((hit) => (
                <Link
                  key={hit.id}
                  href={`/${locale}/articles/${hit.slug}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={() => setShowDropdown(false)}
                >
                  <p
                    className="text-sm font-medium text-gray-900"
                    dangerouslySetInnerHTML={{
                      __html: hit._formatted?.title || hit.title,
                    }}
                  />
                  {hit._formatted?.summary && (
                    <p
                      className="text-xs text-gray-500 mt-1 line-clamp-1"
                      dangerouslySetInnerHTML={{
                        __html: hit._formatted.summary,
                      }}
                    />
                  )}
                </Link>
              ))}
              <Link
                href={`/${locale}/search?q=${encodeURIComponent(query)}`}
                className="block px-4 py-3 text-center text-sm text-primary-600 font-medium hover:bg-primary-50 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                {t("title")} →
              </Link>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              {t("noResults", { query })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
