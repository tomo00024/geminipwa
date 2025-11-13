// src/lib/stores.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppSettings, Session } from './types';
import { availableModels } from './utils';

const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// 1. デフォルトのアプリケーション設定を定義する (APIキーの複数管理に対応)
const defaultAppSettings: AppSettings = {
	apiKeys: [],
	activeApiKeyId: null,
	model: availableModels[0],
	systemPrompt: {
		isEnabled: false,
		text: ''
	},
	dummyUserPrompt: {
		isEnabled: false,
		text: ''
	}
};

// 2. localStorageから初期値を読み込む
const storedAppSettingsJSON = browser ? localStorage.getItem(APP_SETTINGS_KEY) : null;

// ▼▼▼【変更】データ移行処理を削除し、シンプルなマージ処理のみに修正 ▼▼▼
let initialAppSettings: AppSettings = defaultAppSettings;

if (storedAppSettingsJSON) {
	const parsedSettings = JSON.parse(storedAppSettingsJSON);
	// 読み込んだ設定にデフォルト値をマージして、将来新しい設定項目が追加されても欠落しないようにする
	initialAppSettings = { ...defaultAppSettings, ...parsedSettings };
}
// ▲▲▲【変更】ここまで ▲▲▲

export const appSettings = writable<AppSettings>(initialAppSettings);

// 4. ストアの値が変更されたらlocalStorageに保存する
if (browser) {
	appSettings.subscribe((value) => {
		localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
	});
}

// --- Sessions Store ---
const storedSessions = browser ? localStorage.getItem(SESSIONS_KEY) : null;
const initialSessions: Session[] = storedSessions ? JSON.parse(storedSessions) : [];

export const sessions = writable<Session[]>(initialSessions);

if (browser) {
	sessions.subscribe((value) => {
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(value));
	});
}
