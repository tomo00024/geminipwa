// src/lib/stores.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppSettings, Session } from './types';

const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// --- AppSettings Store ---
// 1. まずはビルド時にも安全なデフォルト値でストアを作成する
const initialAppSettings: AppSettings = { apiKey: '' };
export const appSettings = writable<AppSettings>(initialAppSettings);

// --- Sessions Store ---
// 1. こちらも同様に、デフォルト値で作成
const initialSessions: Session[] = [];
export const sessions = writable<Session[]>(initialSessions);


// 2. ブラウザ環境でのみ、localStorageとの同期処理を実行する
if (browser) {
  // ページが読み込まれた時に、localStorageからデータを読み込んでストアを更新（Hydration）
  const storedAppSettings = localStorage.getItem(APP_SETTINGS_KEY);
  if (storedAppSettings) {
    appSettings.set(JSON.parse(storedAppSettings));
  }
  const storedSessions = localStorage.getItem(SESSIONS_KEY);
  if (storedSessions) {
    sessions.set(JSON.parse(storedSessions));
  }

  // ストアの値が変更されたら、localStorageに書き戻す
  appSettings.subscribe((value) => {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
  });
  sessions.subscribe((value) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(value));
  });
}