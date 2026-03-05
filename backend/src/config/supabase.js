/**
 * 数据库配置
 * 支持 Supabase 或本地 PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import { createLocalDbClient } from './localDb.js';

const useLocalDb = process.env.USE_LOCAL_DB === 'true' || !process.env.SUPABASE_URL;

let supabase;

if (useLocalDb) {
  console.log('Using local PostgreSQL database');
  supabase = createLocalDbClient();
} else {
  console.log('Using Supabase database');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabase };
