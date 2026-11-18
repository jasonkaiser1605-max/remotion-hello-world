import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Your Anthropic API key lives in the iOS Keychain (via expo-secure-store), never in
// plain app storage and never in this repository.

const KEY = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) globalThis.localStorage?.setItem(KEY, value);
    else globalThis.localStorage?.removeItem(KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
}
