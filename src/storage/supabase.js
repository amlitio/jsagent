import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../config/env.js';

const env = getEnv();

export async function savePdfAndGetUrlSupabase(filename, buffer) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  });

  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;

  const { data, error: err2 } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .createSignedUrl(filename, 15 * 60);
  if (err2) throw err2;

  return data.signedUrl;
}
