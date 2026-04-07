import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xtpgbsdrfqnsolozybui.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cGdic2RyZnFuc29sb3p5YnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTM1OTMsImV4cCI6MjA3NTE2OTU5M30.zzTzLEOrWsxXB60VcQJst0VqO8YdpatF7YyDsf2vbWs';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
