import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials (SUPABASE_URL, SUPABASE_KEY) missing from .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get bucket name from env or default
export const bucketName = process.env.SUPABASE_BUCKET || 'chat_files';
