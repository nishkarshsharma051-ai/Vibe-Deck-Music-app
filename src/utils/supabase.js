import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseCredentials = !!(supabaseUrl && supabaseAnonKey);

let supabase = null;

if (hasSupabaseCredentials) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Supabase client initialization failed:", error);
  }
}

export { supabase, hasSupabaseCredentials };

/**
 * SQL Schema for Supabase SQL Editor:
 * 
 * CREATE TABLE public.vibedeck_user_data (
 *     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     settings JSONB DEFAULT '{}'::jsonb,
 *     history JSONB DEFAULT '[]'::jsonb,
 *     analytics JSONB DEFAULT '{"totalListeningTime": 0, "songs": {}, "artists": {}}'::jsonb,
 *     favorites JSONB DEFAULT '[]'::jsonb,
 *     playlists JSONB DEFAULT '[]'::jsonb,
 *     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * 
 * ALTER TABLE public.vibedeck_user_data ENABLE ROW LEVEL SECURITY;
 * 
 * CREATE POLICY "Allow user insert" ON public.vibedeck_user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
 * CREATE POLICY "Allow user select" ON public.vibedeck_user_data FOR SELECT USING (auth.uid() = user_id);
 * CREATE POLICY "Allow user update" ON public.vibedeck_user_data FOR UPDATE USING (auth.uid() = user_id);
 */

// Upsert user state to Supabase
export async function syncUserData(userId, { settings, history, analytics, favorites, playlists }) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('vibedeck_user_data')
      .upsert({
        user_id: userId,
        settings,
        history,
        analytics,
        favorites,
        playlists,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Supabase syncUserData failed:', err.message);
    return null;
  }
}

// Fetch all user state from Supabase
export async function fetchUserData(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('vibedeck_user_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Row does not exist yet for new user, return empty skeleton
        return {
          settings: null,
          history: null,
          analytics: null,
          favorites: null,
          playlists: null
        };
      }
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Supabase fetchUserData failed:', err.message);
    return null;
  }
}
