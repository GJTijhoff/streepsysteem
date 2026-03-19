import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const isWeb = Platform.OS === 'web'
const isBrowser = typeof window !== 'undefined'

const webStorage = {
  getItem: (key: string) => Promise.resolve(isBrowser ? window.localStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (isBrowser) {
      window.localStorage.setItem(key, value)
    }
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    if (isBrowser) {
      window.localStorage.removeItem(key)
    }
    return Promise.resolve()
  },
}

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: isWeb ? webStorage : nativeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
    },
  }
)