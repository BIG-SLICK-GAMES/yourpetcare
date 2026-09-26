import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
let token: string | null = null;
export async function restoreToken() { token = Platform.OS === 'web' ? null : await SecureStore.getItemAsync('yourpetcare.session'); return token; }
export async function setToken(value: string | null) {
  token = value;
  if (Platform.OS !== 'web') {
    if (value) await SecureStore.setItemAsync('yourpetcare.session', value);
    else await SecureStore.deleteItemAsync('yourpetcare.session');
  }
}
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  if (!API_URL) throw new ApiError('The app service is not connected yet. You can browse the directory preview.', 503);
  if (!__DEV__ && !API_URL.startsWith('https://')) throw new ApiError('The release app requires a secure server connection.', 503);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(API_URL + '/v1/' + path, { method, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.error || 'Please try again.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not reach the app service. Check your connection and try again.', 503);
  } finally { clearTimeout(timeout); }
}
