import { create } from 'zustand';
import { createConversationsSlice, type ConversationsSlice } from './features/conversations/store';
import { createChatSlice, type ChatSlice } from './features/chat/store';
import { createSettingsSlice, type SettingsSlice } from './features/settings/store';
import { createSDKSlice, type SDKSlice } from './features/sdk/store';

export type AppStore = ConversationsSlice & ChatSlice & SettingsSlice & SDKSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createConversationsSlice(...a),
  ...createChatSlice(...a),
  ...createSettingsSlice(...a),
  ...createSDKSlice(...a),
}));
