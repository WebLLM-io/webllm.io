import { get, set } from 'idb-keyval';
import { IDB_STORE_KEY, SETTINGS_STORE_KEY } from '../../shared/constants';
import type { Conversation } from './types';

export async function loadConversations(): Promise<Conversation[]> {
  const data = await get<Conversation[]>(IDB_STORE_KEY);
  return data ?? [];
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  await set(IDB_STORE_KEY, conversations);
}

export interface PersistedSettings {
  mode: string;
  localModel: string;
  localWebWorker: boolean;
  localCache: boolean;
  cloudBaseURL: string;
  cloudApiKey: string;
  cloudModel: string;
  cloudTimeout: string;
  cloudRetries: string;
}

export async function loadSettings(): Promise<PersistedSettings | null> {
  const data = await get<PersistedSettings>(SETTINGS_STORE_KEY);
  return data ?? null;
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await set(SETTINGS_STORE_KEY, settings);
}
