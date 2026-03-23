import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('query_sql', {
    query: "SELECT pg_get_constraintdef(c.oid) AS constraint_def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE c.conname = 'projects_status_check' AND t.relname = 'projects';"
  });
  console.log("RPC Error:", error);
  console.log("RPC Data:", data);
}
test();
