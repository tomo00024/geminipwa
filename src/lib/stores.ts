import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppSettings, Session } from './types';
import {
	availableModels,
	defaultUiSettings,
	defaultApiErrorHandlingSettings,
	defaultAssistSettings,
	defaultGenerationSettings
} from './utils';

const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// 1. デフォルトのアプリケーション設定を定義する
const defaultAppSettings: AppSettings = {
	apiKeys: [],
	activeApiKeyId: null,
	model: availableModels[0],
	// 新機能: デフォルト値を明示
	systemPrompt: {
		isEnabled: false,
		text: ''
	},
	dummyUserPrompt: {
		isEnabled: false,
		text: ''
	},
	dummyModelPrompt: {
		isEnabled: false,
		text: ''
	},
	ui: { ...defaultUiSettings },
	apiErrorHandling: { ...defaultApiErrorHandlingSettings },
	assist: { ...defaultAssistSettings },
	generation: { ...defaultGenerationSettings },
	backup: {
		isEnabled: false,
		autoBackup: false,
		lastBackupAt: null
	}
};

// 2. localStorageから初期値を読み込む
const storedAppSettingsJSON = browser ? localStorage.getItem(APP_SETTINGS_KEY) : null;

let initialAppSettings: AppSettings = defaultAppSettings;

if (storedAppSettingsJSON) {
	try {
		const parsedSettings = JSON.parse(storedAppSettingsJSON);

		// 3. 安全なマージ処理
		// スプレッド構文 (...) だけでなく、ネストされたオブジェクトごとに
		// (parsedSettings.xxx || {}) を使ってデフォルト値と合成します。
		// これにより、古い設定データに新しい項目(systemPrompt等)がなくても、
		// defaultAppSettingsの値が確実に使われるようになります。
		initialAppSettings = {
			...defaultAppSettings,
			...parsedSettings,

			// UI設定のマージ
			ui: {
				...defaultAppSettings.ui,
				...(parsedSettings.ui || {})
			},
			// APIエラーハンドリング設定のマージ
			apiErrorHandling: {
				...defaultAppSettings.apiErrorHandling,
				...(parsedSettings.apiErrorHandling || {})
			},
			// アシスト設定のマージ
			assist: {
				...defaultAppSettings.assist,
				...(parsedSettings.assist || {})
			},
			// 生成設定のマージ
			generation: {
				...defaultAppSettings.generation,
				...(parsedSettings.generation || {})
			},

			// --- 追加機能の安全なマージ ---
			// ここが重要: localStorageにデータがない(undefined)場合、空オブジェクト {} にフォールバックし、
			// 結果として ...defaultAppSettings.systemPrompt が採用されます。
			systemPrompt: {
				...defaultAppSettings.systemPrompt,
				...(parsedSettings.systemPrompt || {})
			},
			dummyUserPrompt: {
				...defaultAppSettings.dummyUserPrompt,
				...(parsedSettings.dummyUserPrompt || {})
			},
			dummyModelPrompt: {
				...defaultAppSettings.dummyModelPrompt,
				...(parsedSettings.dummyModelPrompt || {})
			},
			backup: {
				...defaultAppSettings.backup,
				...(parsedSettings.backup || {})
			}
		};
	} catch (e) {
		console.error('Failed to parse app settings from local storage:', e);
		// パースエラー時はデフォルトを使用
		initialAppSettings = defaultAppSettings;
	}
}

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