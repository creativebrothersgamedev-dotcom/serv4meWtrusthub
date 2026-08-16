/*
# Core schema for services marketplace (consumers, providers, admin)

## Plain-English summary
This migration builds the entire data foundation for a marketplace connecting
service providers with consumers: accounts and roles, provider/consumer
profile details, categories and services, real-time conversations and
messages, and a rating/dispute workflow. It also adds the security rules
that decide who can see and change each piece of data.

## New tables
- `profiles` - one row per signed-up account (mirrors auth.users). Holds the
  account's role (consumer / provider / admin), email, and suspended flag.
  This table is intentionally private; display names live in the role
  specific profile tables below.
- `provider_profiles` - public business profile for a provider: company
  name/alias, website, social links, address/city/state/country, phone,
  logo, languages offered. Publicly readable so consumers can browse without
  logging in.
- `consumer_profiles` - private profile for a consumer: name, city/state/
  country, preferred languages.
- `categories` - shared list of service categories (seeded with common
  categories), managed by admins.
- `services` - a service offered by a provider, always tied to a category.
- `conversations` - one thread between a consumer and a provider, optionally
  about a specific service.
- `messages` - individual chat messages inside a conversation, with a
  sent/delivered/read status.
- `ratings` - a consumer's 1-5 star rating + review of a provider, tied to a
  conversation, moving through pending -> approved/disputed -> (if disputed)
  admin resolved.

## Security
- Row level security is enabled on every table.
- `provider_profiles`, `services`, and `categories` are readable by anyone
  (including signed-out visitors) since browsing providers is a public
  feature.
- `profiles` and `consumer_profiles` are private to their owner, with full
  admin access via the `is_admin()` helper.
- `conversations` and `messages` are only visible to their two participants
  (plus admins).
- `ratings` are only publicly visible once `approved`; otherwise visible
  only to the consumer/provider involved and admins.
- Status changes on ratings (approve/deny/admin-resolve) go through two
  `SECURITY DEFINER` functions rather than direct table updates, so the
  business rules (who can move a rating from which state to which state)
  are enforced on the server, not just in the app UI.
- A `search_providers` function centralizes the public search/filter/fuzzy
  matching logic used by the browse page.
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- profiles (account + role)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('consumer', 'provider', 'admin')),
  email text NOT NULL,
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE ALL ON FUNCTION is_admin() FROM public;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id AND role IN ('consumer', 'provider'));

DROP POLICY IF EXISTS "profiles_update_admin_only" ON profiles;
CREATE POLICY "profiles_update_admin_only" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON profiles;
CREATE POLICY "profiles_delete_admin_only" ON profiles FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================================
-- provider_profiles (public business profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  alias text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  languages text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS provider_profiles_company_trgm_idx ON provider_profiles USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS provider_profiles_alias_trgm_idx ON provider_profiles USING gin (alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS provider_profiles_city_idx ON provider_profiles (city);

DROP POLICY IF EXISTS "provider_profiles_select_public" ON provider_profiles;
CREATE POLICY "provider_profiles_select_public" ON provider_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "provider_profiles_insert_own" ON provider_profiles;
CREATE POLICY "provider_profiles_insert_own" ON provider_profiles FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider')
  );

DROP POLICY IF EXISTS "provider_profiles_update_own_or_admin" ON provider_profiles;
CREATE POLICY "provider_profiles_update_own_or_admin" ON provider_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "provider_profiles_delete_own_or_admin" ON provider_profiles;
CREATE POLICY "provider_profiles_delete_own_or_admin" ON provider_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ============================================================================
-- consumer_profiles (private profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS consumer_profiles (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  preferred_languages text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consumer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consumer_profiles_select_own_or_admin" ON consumer_profiles;
CREATE POLICY "consumer_profiles_select_own_or_admin" ON consumer_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "consumer_profiles_insert_own" ON consumer_profiles;
CREATE POLICY "consumer_profiles_insert_own" ON consumer_profiles FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'consumer')
  );

DROP POLICY IF EXISTS "consumer_profiles_update_own_or_admin" ON consumer_profiles;
CREATE POLICY "consumer_profiles_update_own_or_admin" ON consumer_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "consumer_profiles_delete_own_or_admin" ON consumer_profiles;
CREATE POLICY "consumer_profiles_delete_own_or_admin" ON consumer_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ============================================================================
-- categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  TO authenticated USING (is_admin());

INSERT INTO categories (name)
VALUES ('Plumbing'), ('Electrical'), ('Cleaning'), ('Tutoring'), ('Photography'),
       ('Legal Services'), ('Beauty & Wellness'), ('IT & Tech Support'),
       ('Home Repair'), ('Event Planning'), ('Landscaping'), ('Accounting')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- services
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS services_provider_idx ON services (provider_id);
CREATE INDEX IF NOT EXISTS services_category_idx ON services (category_id);
CREATE INDEX IF NOT EXISTS services_name_trgm_idx ON services USING gin (name gin_trgm_ops);

DROP POLICY IF EXISTS "services_select_public" ON services;
CREATE POLICY "services_select_public" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "services_insert_own" ON services;
CREATE POLICY "services_insert_own" ON services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "services_update_own_or_admin" ON services;
CREATE POLICY "services_update_own_or_admin" ON services FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id OR is_admin())
  WITH CHECK (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "services_delete_own_or_admin" ON services;
CREATE POLICY "services_delete_own_or_admin" ON services FOR DELETE
  TO authenticated USING (auth.uid() = provider_id OR is_admin());

-- ============================================================================
-- conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consumer_id, provider_id, service_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS conversations_consumer_idx ON conversations (consumer_id);
CREATE INDEX IF NOT EXISTS conversations_provider_idx ON conversations (provider_id);

DROP POLICY IF EXISTS "conversations_select_participants_or_admin" ON conversations;
CREATE POLICY "conversations_select_participants_or_admin" ON conversations FOR SELECT
  TO authenticated USING (auth.uid() = consumer_id OR auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "conversations_insert_consumer" ON conversations;
CREATE POLICY "conversations_insert_consumer" ON conversations FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = consumer_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'consumer')
  );

DROP POLICY IF EXISTS "conversations_delete_admin" ON conversations;
CREATE POLICY "conversations_delete_admin" ON conversations FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================================
-- messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

DROP POLICY IF EXISTS "messages_select_participants_or_admin" ON messages;
CREATE POLICY "messages_select_participants_or_admin" ON messages FOR SELECT
  TO authenticated USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.consumer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.consumer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update_status_participant" ON messages;
CREATE POLICY "messages_update_status_participant" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.consumer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.consumer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

REVOKE UPDATE ON messages FROM authenticated;
GRANT UPDATE (status) ON messages TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- ratings
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ratings_provider_idx ON ratings (provider_id);

DROP POLICY IF EXISTS "ratings_select_approved_public" ON ratings;
CREATE POLICY "ratings_select_approved_public" ON ratings FOR SELECT
  TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "ratings_select_participants_or_admin" ON ratings;
CREATE POLICY "ratings_select_participants_or_admin" ON ratings FOR SELECT
  TO authenticated USING (auth.uid() = consumer_id OR auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "ratings_insert_consumer" ON ratings;
CREATE POLICY "ratings_insert_consumer" ON ratings FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = consumer_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND c.consumer_id = auth.uid() AND c.provider_id = ratings.provider_id
    )
  );

DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;
CREATE POLICY "ratings_delete_admin" ON ratings FOR DELETE
  TO authenticated USING (is_admin());

-- No direct UPDATE policy: status transitions only happen through the
-- SECURITY DEFINER functions below, which enforce the state machine.

CREATE OR REPLACE FUNCTION provider_review_rating(p_rating_id uuid, p_decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_decision NOT IN ('approve', 'deny') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  UPDATE ratings
  SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'disputed' END
  WHERE id = p_rating_id
    AND provider_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rating not found or not pending';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION provider_review_rating(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION provider_review_rating(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_resolve_rating(p_rating_id uuid, p_decision text, p_note text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  UPDATE ratings
  SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
      admin_note = COALESCE(p_note, '')
  WHERE id = p_rating_id
    AND status = 'disputed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rating not found or not disputed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_resolve_rating(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION admin_resolve_rating(uuid, text, text) TO authenticated;

-- ============================================================================
-- search_providers: public browse/search/filter/fuzzy-match function
-- ============================================================================
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

REVOKE ALL ON FUNCTION search_providers(text, uuid, text, text[], numeric, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION search_providers(text, uuid, text, text[], numeric, text, text, text, text) TO anon, authenticated;
