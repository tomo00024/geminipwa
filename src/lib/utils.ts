//src/lib/utils.ts

import type { Session } from './types';

// ===================================================================
// LLMモデル関連の共通設定
// ===================================================================

const commonSafetySettings = [
	{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

/**
 * アプリケーション全体で使用するGeminiモデルの設定
 * モデル名や設定の変更は、このオブジェクトを修正するだけで完了します
 */
export const geminiModelConfig = {
	model: 'gemini-2.5-flash-lite',
	safetySettings: commonSafetySettings
};


// ===================================================================
// セッション関連のヘルパー関数
// ===================================================================

/**
 * 新しいセッションのデフォルトオブジェクトを生成して返す関数
 * @returns 新しいSessionオブジェクト
 */
export function createNewSession(): Session {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        createdAt: now,
        lastUpdatedAt: now,
        logs: [],
        featureSettings: {
            goodwill: {
                isEnabled: true,
                currentValue: 0,
                thresholds: [] 
            }
        }
    };
}