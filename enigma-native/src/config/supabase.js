import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const supabase = createClient(
  extra.supabaseUrl || '',
  extra.supabaseAnonKey || ''
);
