const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number) {
  return inr.format(cents / 100);
}

export function discountPercent(
  priceCents: number,
  compareAtPriceCents: number | null,
) {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) {
    return 0;
  }

  return Math.round((1 - priceCents / compareAtPriceCents) * 100);
}
