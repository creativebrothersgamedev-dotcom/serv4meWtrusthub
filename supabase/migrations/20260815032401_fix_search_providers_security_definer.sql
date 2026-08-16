/*
# Fix search_providers returning no results

## Problem
The `search_providers` function queries `provider_profiles` joined with
`profiles` (to filter out suspended users). It runs as the caller, so RLS
applies. The `profiles` table only allows authenticated users to read their
own row — there is no public/anon SELECT policy. This means the JOIN
eliminates every provider row for both anonymous and authenticated callers,
and the search always returns zero results.

## Fix
Recreate `search_providers` as `SECURITY DEFINER` so it bypasses RLS.
This is safe because:
- It only reads public-facing data (provider_profiles has a public SELECT
  policy, services has a public SELECT policy, ratings are filtered to
  approved-only).
- The only non-public table it touches is `profiles`, and it only reads
  the `suspended` boolean to exclude suspended providers — no sensitive
  columns are exposed.
- The function return type only includes columns from `provider_profiles`
  plus aggregate rating data — no profile columns are returned.

## Security
- Function is granted to both `anon` and `authenticated`.
- `search_path` is pinned to `public` to prevent search-path injection.
- No changes to any RLS policies.
*/

CREATE OR REPLACE FUNCTION search_providers(
  p_query text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_service_name text DEFAULT NULL,
  p_languages text[] DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_home_city text DEFAULT NULL,
  p_home_state text DEFAULT NULL,
  p_home_country text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  company_name text,
  alias text,
  website text,
  social_links jsonb,
  address text,
  city text,
  state text,
  country text,
  phone text,
  logo_url text,
  languages text[],
  avg_rating numeric,
  rating_count bigint,
  location_score int,
  match_rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.user_id, pp.company_name, pp.alias, pp.website, pp.social_links,
    pp.address, pp.city, pp.state, pp.country, pp.phone, pp.logo_url, pp.languages,
    COALESCE(r.avg_rating, 0) AS avg_rating,
    COALESCE(r.rating_count, 0) AS rating_count,
    (CASE WHEN p_home_city IS NOT NULL AND p_home_city <> '' AND pp.city ILIKE p_home_city THEN 3
          WHEN p_home_state IS NOT NULL AND p_home_state <> '' AND pp.state ILIKE p_home_state THEN 2
          WHEN p_home_country IS NOT NULL AND p_home_country <> '' AND pp.country ILIKE p_home_country THEN 1
          ELSE 0 END) AS location_score,
    (CASE WHEN p_query IS NOT NULL AND p_query <> '' THEN
        GREATEST(similarity(pp.company_name, p_query), similarity(COALESCE(pp.alias, ''), p_query))
     ELSE 0 END)::real AS match_rank
  FROM provider_profiles pp
  JOIN profiles pr ON pr.id = pp.user_id AND pr.suspended = false
  LEFT JOIN LATERAL (
    SELECT avg(stars)::numeric(3, 2) AS avg_rating, count(*) AS rating_count
    FROM ratings WHERE ratings.provider_id = pp.user_id AND ratings.status = 'approved'
  ) r ON true
  WHERE
    (p_category_id IS NULL OR EXISTS (SELECT 1 FROM services s WHERE s.provider_id = pp.user_id AND s.category_id = p_category_id))
    AND (p_service_name IS NULL OR p_service_name = '' OR EXISTS (
      SELECT 1 FROM services s WHERE s.provider_id = pp.user_id
        AND (s.name ILIKE '%' || p_service_name || '%' OR similarity(s.name, p_service_name) > 0.2)
    ))
    AND (p_languages IS NULL OR array_length(p_languages, 1) IS NULL OR pp.languages && p_languages)
    AND (p_min_rating IS NULL OR COALESCE(r.avg_rating, 0) >= p_min_rating)
    AND (p_location IS NULL OR p_location = '' OR (
      pp.address ILIKE '%' || p_location || '%' OR pp.city ILIKE '%' || p_location || '%'
      OR pp.state ILIKE '%' || p_location || '%' OR pp.country ILIKE '%' || p_location || '%'
    ))
    AND (p_query IS NULL OR p_query = '' OR (
      pp.company_name ILIKE '%' || p_query || '%' OR pp.alias ILIKE '%' || p_query || '%'
      OR similarity(pp.company_name, p_query) > 0.15 OR similarity(COALESCE(pp.alias, ''), p_query) > 0.15
      OR EXISTS (
        SELECT 1 FROM services s WHERE s.provider_id = pp.user_id
          AND (s.name ILIKE '%' || p_query || '%' OR similarity(s.name, p_query) > 0.15)
      )
    ))
  ORDER BY location_score DESC, match_rank DESC, avg_rating DESC, pp.created_at DESC;
$$;

REVOKE ALL ON FUNCTION search_providers(text, uuid, text, text[], numeric, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION search_providers(text, uuid, text, text[], numeric, text, text, text, text) TO anon, authenticated;
