import { Button } from "@/components/ui/button";

type SearchFormProps = {
  id: string;
  className?: string;
  placeholder?: string;
  defaultQuery?: string;
  defaultCategory?: string;
  defaultSort?: string;
  defaultPrice?: string;
  defaultAvailability?: string;
  compact?: boolean;
  onSubmit?: () => void;
};

export function SearchForm({
  id,
  className,
  placeholder = "Search products, brands, and more",
  defaultQuery = "",
  defaultCategory,
  defaultSort,
  defaultPrice,
  defaultAvailability,
  compact = false,
  onSubmit,
}: SearchFormProps) {
  return (
    <form
      action="/products"
      method="get"
      role="search"
      className={className}
      onSubmit={onSubmit}
    >
      {defaultCategory ? (
        <input type="hidden" name="category" value={defaultCategory} />
      ) : null}
      {defaultSort && defaultSort !== "featured" ? (
        <input type="hidden" name="sort" value={defaultSort} />
      ) : null}
      {defaultPrice && defaultPrice !== "all" ? <input type="hidden" name="price" value={defaultPrice} /> : null}
      {defaultAvailability && defaultAvailability !== "all" ? <input type="hidden" name="availability" value={defaultAvailability} /> : null}
      <label className="sr-only" htmlFor={id}>
        Search products
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="q"
          defaultValue={defaultQuery}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none ring-brand/20 placeholder:text-muted focus:ring-4"
        />
        {compact ? (
          <Button type="submit" className="sr-only">
            Search
          </Button>
        ) : (
          <Button type="submit" className="shrink-0 px-4 sm:px-5">
            Search
          </Button>
        )}
      </div>
    </form>
  );
}
