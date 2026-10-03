-- Public catalog reads use anon, while row visibility remains constrained by RLS.
GRANT SELECT ON TABLE public.products, public.categories, public.product_variants TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.seller_owns_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_owns_product(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS products_select_public_owner_admin ON public.products;
CREATE POLICY products_select_public_owner_admin ON public.products
  FOR SELECT USING (
    (
      approval_status = 'approved'
      AND publish_status = 'published'
      AND (
        seller_id IS NULL
        OR public.is_public_seller(seller_id)
      )
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
        AND (
          p.seller_id IS NULL
          OR public.is_public_seller(p.seller_id)
        )
    )
  );
