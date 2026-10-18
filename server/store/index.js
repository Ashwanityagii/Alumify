require('../env');
const crypto = require('crypto');
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_SECRET, NODE_ENV } = process.env;

function create(overrides = {}) {
  if (!overrides.forceMemory && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY) {
    return require('./supabase')({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, serviceKey: SUPABASE_SERVICE_ROLE_KEY });
  }
  if (NODE_ENV === 'production' && !APP_SECRET && !overrides.secret) {
    throw new Error('APP_SECRET is required in production when Supabase is not configured');
  }
  return require('./memory')({ secret: overrides.secret || APP_SECRET || crypto.randomBytes(32).toString('hex'),
    file: overrides.file, seed: overrides.seed });
}
module.exports = { create };
