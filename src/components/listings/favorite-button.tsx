"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/actions/favorite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  listingId: string;
  initialFavorited: boolean;
  className?: string;
}

export function FavoriteButton({
  listingId,
  initialFavorited,
  className,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const prev = favorited;
    setFavorited(!prev); // optimistic

    startTransition(async () => {
      try {
        const result = await toggleFavorite(listingId);
        setFavorited(result.favorited);
      } catch {
        setFavorited(prev); // revert
        toast.error("Failed to update favorites");
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "p-1.5 rounded-full bg-white/80 hover:bg-white shadow transition-all",
        isPending && "opacity-50",
        className
      )}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className={cn(
          "w-5 h-5 transition-colors",
          favorited ? "fill-red-500 stroke-red-500" : "fill-none stroke-gray-600"
        )}
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
