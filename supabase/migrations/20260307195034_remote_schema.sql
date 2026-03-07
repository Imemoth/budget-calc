


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "converted_user_id" "uuid"
);


ALTER TABLE "public"."guest_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'MEMBER'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."household_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" DEFAULT 'HUF'::"text" NOT NULL,
    "start_month" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "horizon_months" integer DEFAULT 18 NOT NULL,
    "theme" "text"
);


ALTER TABLE "public"."households" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT '''USER'''::"text",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Felhasználói adatok';



CREATE TABLE IF NOT EXISTS "public"."recurring_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "type" "text" NOT NULL,
    "category_id" "uuid",
    "cadence" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "start_month" "text" NOT NULL,
    "end_month" "text",
    "day_of_month" integer DEFAULT 1 NOT NULL,
    "person_id" "uuid",
    "enabled" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_items_cadence_check" CHECK (("cadence" = 'monthly'::"text")),
    CONSTRAINT "recurring_items_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."recurring_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saving_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0 NOT NULL,
    "due_date" "date",
    "priority" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saving_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_buckets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "start_month" "text" NOT NULL,
    "end_month" "text" NOT NULL,
    "monthly_planned" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."savings_buckets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'FREE'::"text" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_customer_id" "text",
    "provider_subscription_id" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'HUF'::"text" NOT NULL,
    "date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "note" "text",
    "user_id" "uuid",
    "guest_session_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_sessions"
    ADD CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_buckets"
    ADD CONSTRAINT "savings_buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guest_sessions"
    ADD CONSTRAINT "guest_sessions_converted_user_id_fkey" FOREIGN KEY ("converted_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_buckets"
    ADD CONSTRAINT "savings_buckets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Access categories of own households" ON "public"."categories" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Access recurring items of own households" ON "public"."recurring_items" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "recurring_items"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "recurring_items"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Access savings buckets of own households" ON "public"."savings_buckets" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "savings_buckets"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "savings_buckets"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Access transactions of own households" ON "public"."transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Delete people of own households" ON "public"."people" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "people"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Household owner can insert own households" ON "public"."households" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Household owner can select own households" ON "public"."households" FOR SELECT TO "authenticated" USING (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Household owner can update own households" ON "public"."households" FOR UPDATE TO "authenticated" USING (("owner_user_id" = "auth"."uid"())) WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Insert people of own households" ON "public"."people" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "people"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can add self as first member" ON "public"."household_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("role" = 'OWNER'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "household_members"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "Owner can manage members of own households" ON "public"."household_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "household_members"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "household_members"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can see members of own households" ON "public"."household_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "household_members"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Select own households" ON "public"."households" FOR SELECT USING (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "Select people of own households" ON "public"."people" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "people"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Update people of own households" ON "public"."people" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "people"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "people"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert categories in own households" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert saving goals in own households" ON "public"."saving_goals" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "saving_goals"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own subscriptions" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert transactions in own households" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can select categories in own households" ON "public"."categories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can select saving goals in own households" ON "public"."saving_goals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "saving_goals"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can select their own subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can select transactions in own households" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update categories in own households" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "categories"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update saving goals in own households" ON "public"."saving_goals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "saving_goals"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "saving_goals"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own subscriptions" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update transactions in own households" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "transactions"."household_id") AND ("h"."owner_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saving_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."savings_buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."guest_sessions" TO "anon";
GRANT ALL ON TABLE "public"."guest_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."household_members" TO "anon";
GRANT ALL ON TABLE "public"."household_members" TO "authenticated";
GRANT ALL ON TABLE "public"."household_members" TO "service_role";



GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_items" TO "anon";
GRANT ALL ON TABLE "public"."recurring_items" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_items" TO "service_role";



GRANT ALL ON TABLE "public"."saving_goals" TO "anon";
GRANT ALL ON TABLE "public"."saving_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."saving_goals" TO "service_role";



GRANT ALL ON TABLE "public"."savings_buckets" TO "anon";
GRANT ALL ON TABLE "public"."savings_buckets" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_buckets" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































