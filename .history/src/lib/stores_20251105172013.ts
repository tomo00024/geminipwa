// src/lib/store.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment'; // browser環境かどうかを判定するためにインポート
import type { AppSettings, Session } from './types';

// localStorageに保存するためのキーを定義
const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// --- AppSettings Store ---
// 1. localStorageから初期値を読み込む
const storedAppSettings = browser ? localStorage.getItem(APP_SETTINGS_KEY) : null;
const initialAppSettings: AppSettings = storedAppSettings ? JSON.parse(storedAppSettings) : { apiKey: '' };

export const appSettings = writable<AppSettings>(initialAppSettings);

// 2. ストアの値が変更されたらlocalStorageに保存する
if (browser) {
  appSettings.subscribe((value) => {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
  });
}

// --- Sessions Store ---
// 1. localStorageから初期値を読み込む
const storedSessions = browser ? localStorage.getItem(SESSIONS_KEY) : null;
const initialSessions: Session[] = storedSessions ? JSON.parse(storedSessions) : [];

export const sessions = writable<Session[]>(initialSessions);

// 2. ストアの値が変更されたらlocalStorageに保存する
if (browser) {
  sessions.subscribe((value) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(value));
  });
}