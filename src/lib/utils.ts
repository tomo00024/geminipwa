// src/lib/utils.ts

import type {
	Session,
	GameViewSettings,
	UiSettings,
	ApiErrorHandlingSettings,
	AssistSettings,
	GenerationSettings
} from './types';

// ===================================================================
// LLMモデル関連の共通設定
// ===================================================================
/**
 * ユーザーが設定画面で選択できるGeminiモデルのリスト。
 * [モデル名, 表示名] の形式で定義します。
 */
export const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const commonSafetySettings = [
	{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

/**
 * アプリケーション全体で使用するGeminiモデルの設定
 */
export const geminiModelConfig = {
	safetySettings: commonSafetySettings
};

// ===================================================================
// デフォルト設定値
// ===================================================================

/**
 * ゲームビュー設定のデフォルト値
 */
export const defaultGameViewSettings: GameViewSettings = {
	imageBaseUrl: 'https://dashing-fenglisu-4c8446.netlify.app',
	imageExtension: '.avif',
	sizing: {
		background: { mode: 'fit-width', scale: 100 },
		character: { mode: 'fit-height', scale: 80 },
		ichimaiE: { mode: 'fit-width', scale: 100 }
	}
};

/**
 * UI設定のデフォルト値
 */
export const defaultUiSettings: UiSettings = {
	showTokenCount: true,
	useCustomFontSize: false,
	chatFontSize: 16,
	chatDisplayMode: 'bubble',
	showSpeakerNameInTranscript: true
};

/**
 * APIエラー時の挙動のデフォルト値
 */
export const defaultApiErrorHandlingSettings: ApiErrorHandlingSettings = {
	loopApiKeys: false,
	exponentialBackoff: false,
	maxRetries: 5,
	initialWaitTime: 1000
};

/**
 * アシスト機能のデフォルト値
 */
export const defaultAssistSettings: AssistSettings = {
	autoCorrectUrl: false,
	summarizeOnTokenOverflow: false,
	tokenThreshold: 3000
};

/**
 * 生成設定のデフォルト値
 */
export const defaultGenerationSettings: GenerationSettings = {
	temperature: null,
	topK: null,
	topP: null,
	maxOutputTokens: null,
	thinkingBudget: null
};
// ===================================================================
// セッション関連のヘルパー関数
// ===================================================================

/**
 * 安全なUUID生成関数
 * crypto.randomUUIDが使えない環境でも簡易的なIDを生成する
 * @returns {string} UUID
 */
export function generateUUID(): string {
	if (crypto && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// フォールバック: タイムスタンプと乱数を組み合わせた簡易ID
	return `${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/**
 * 新しいセッションのデフォルトオブジェクトを生成して返す関数
 * @returns 新しいSessionオブジェクト
 */
export function createNewSession(): Session {
	const now = new Date().toISOString();
	return {
		id: generateUUID(),
		title: '無題のセッション',
		createdAt: now,
		lastUpdatedAt: now,
		logs: [],
		viewMode: 'standard',
		gameViewSettings: { ...defaultGameViewSettings },
		featureSettings: {
			apiMode: 'standard',
			goodwill: {
				currentValue: 0,
				thresholds: []
			}
		}
	};
}
