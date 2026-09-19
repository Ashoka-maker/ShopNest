type StarRatingProps = {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
};

export function StarRating({
  rating,
  reviewCount,
  size = "sm",
}: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, index) => {
    const fill = Math.min(1, Math.max(0, rating - index));
    return fill;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5</span>
      <span className="flex items-center gap-0.5" aria-hidden>
        {stars.map((fill, index) => (
          <Star key={index} fill={fill} size={size} />
        ))}
      </span>
      <span
        className={
          size === "md" ? "text-sm text-muted" : "text-xs text-muted"
        }
      >
        {rating.toFixed(1)}
        {typeof reviewCount === "number" ? ` (${reviewCount})` : null}
      </span>
    </div>
  );
}

function Star({ fill, size }: { fill: number; size: "sm" | "md" }) {
  const dim = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <span className={`relative inline-block ${dim}`}>
      <svg viewBox="0 0 20 20" className={`${dim} text-[#e7e0d4]`}>
        <path
          fill="currentColor"
          d="M10 1.6 12.4 7l5.9.5-4.5 3.8 1.4 5.7L10 13.8 4.8 17l1.4-5.7L1.7 7.5 7.6 7z"
        />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fill * 100}%` }}
      >
        <svg viewBox="0 0 20 20" className={`${dim} text-accent`}>
          <path
            fill="currentColor"
            d="M10 1.6 12.4 7l5.9.5-4.5 3.8 1.4 5.7L10 13.8 4.8 17l1.4-5.7L1.7 7.5 7.6 7z"
          />
        </svg>
      </span>
    </span>
  );
}
