import path from 'path';

export function getEnv() {
  const {
    PORT = '8080',
    APP_BASE_URL,
    INTERNAL_FILE_DIR = './files',
    API_KEY_ALLOWLIST = '',
    SUPABASE_URL = '',
    SUPABASE_SERVICE_ROLE = '',
    SUPABASE_BUCKET = '',
    OPENAI_API_KEY = ''
  } = process.env;

  const allow = API_KEY_ALLOWLIST.split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const base =
    APP_BASE_URL ||
    `http://localhost:${PORT}`;

  return {
    PORT: Number(PORT),
    APP_BASE_URL: base,
    INTERNAL_FILE_DIR: path.resolve(INTERNAL_FILE_DIR),
    API_KEY_ALLOWLIST: allow,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE,
    SUPABASE_BUCKET,
    OPENAI_API_KEY
  };
}
