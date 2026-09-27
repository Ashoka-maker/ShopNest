-- Public catalog visibility without exposing private seller fields.

CREATE OR REPLACE FUNCTION public.is_public_seller(seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sellers AS s
    WHERE s.id = is_public_seller.seller_id
      AND s.approval_status = 'approved'
      AND s.is_active = true
  )
$$;

REVOKE ALL ON FUNCTION public.is_public_seller(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_seller(uuid) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_sellers;
CREATE VIEW public.public_sellers AS
SELECT
  id,
  store_name
FROM public.sellers
WHERE approval_status = 'approved' AND is_active = true;

GRANT SELECT ON public.public_sellers TO anon, authenticated;

DROP POLICY IF EXISTS products_select_public_owner_admin ON public.products;
CREATE POLICY products_select_public_owner_admin ON public.products
  FOR SELECT USING (
    (
      approval_status = 'approved'
      AND publish_status = 'published'
    )
    OR public.seller_owns_product(id)
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS product_variants_select_related ON public.product_variants;
CREATE POLICY product_variants_select_related ON public.product_variants
  FOR SELECT USING (
    public.is_admin_user()
    OR public.seller_owns_product(product_id)
    OR EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = product_variants.product_id
        AND p.approval_status = 'approved'
        AND p.publish_status = 'published'
    )
  );
