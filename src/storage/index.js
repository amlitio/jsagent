import { savePdfAndGetUrlLocal } from './local.js';
import { savePdfAndGetUrlSupabase } from './supabase.js';
import { getEnv } from '../../config/env.js';

const env = getEnv();

function usingSupabase() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE && env.SUPABASE_BUCKET);
}

export async function savePdfAndGetUrl(filename, buffer) {
  if (usingSupabase()) {
    return savePdfAndGetUrlSupabase(filename, buffer);
  }
  return savePdfAndGetUrlLocal(filename, buffer);
}
