//src/lib/geminiService.ts

import type { AppSettings, ConversationContext } from './types';
import { callGeminiApiOnClient, type StandardChatResponse } from './standard/geminiClient.standard';
import {
	callGeminiApiWithOneStepFC,
	type OneStepFCChatResponse
} from './oneStepFC/geminiClient.oneStepFC';
// import { callGeminiApiWithTwoStepFC, type TwoStepFCChatResponse } from './twoStepFC/geminiClient.twoStepFC';

// 型を再エクスポートして、他の場所で使えるようにします
export type { StandardChatResponse, OneStepFCChatResponse };

/**
 * レスポンスオブジェクトが `OneStepFCChatResponse` 型であるかを判定するユーザー定義型ガード。
 * この関数が true を返した場合、TypeScriptはそのオブジェクトが OneStepFCChatResponse 型であると認識します。
 * @param response チェックするレスポンスオブジェクト
 * @returns オブジェクトが OneStepFCChatResponse 型であれば true
 */
export function isOneStepResponse(
	response: StandardChatResponse | OneStepFCChatResponse
): response is OneStepFCChatResponse {
	// goodwillFluctuationプロパティが存在し、undefinedではないことをもって判定します
	return (response as OneStepFCChatResponse).goodwillFluctuation !== undefined;
}

/**
 * Gemini APIを呼び出すための統一されたインターフェース（Facade）。
 * contextの内容に応じて、呼び出すAPIクライアントを自動的に切り替えます。
 * @returns 応答テキスト、または応答テキストと好感度変動を含むオブジェクト
 */
export async function callGeminiApi(
	apiKey: string,
	model: string,
	appSettings: AppSettings,
	context: ConversationContext,
	userInput: string,
	signal?: AbortSignal
): Promise<StandardChatResponse | OneStepFCChatResponse /* | TwoStepFCChatResponse */> {
	switch (context.featureSettings.apiMode) {
		case 'oneStepFC':
			// oneStepFCのクライアントにも appSettings を渡す (今回は実装対象外だが、インターフェースを統一)
			return callGeminiApiWithOneStepFC(apiKey, model, appSettings, context, userInput);

		case 'twoStepFC':
			// alert('TwoStepFC is not implemented yet.'); // 未実装なことを示す仮のアラート
			// return callGeminiApiWithTwoStepFC(apiKey, context, userInput);
			// 現時点ではTwoStepFCは未実装のため、一旦Standardを呼び出すようにしておきます
			return callGeminiApiOnClient(apiKey, model, appSettings, context, userInput, signal);

		case 'standard':
		default:
			return callGeminiApiOnClient(apiKey, model, appSettings, context, userInput, signal);
	}
}

/**
 * Google APIから利用可能なモデル一覧を取得します。
 * @param apiKey APIキー
 * @returns モデル名の配列 (例: ['gemini-1.5-pro', 'gemini-1.5-flash'])
 */
export async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
	try {
		// APIキーを使ってモデルリストを取得
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch models: ${response.statusText}`);
		}

		const data = await response.json();

		if (!data.models) return [];

		return (
			data.models
				// チャット生成 ('generateContent') に対応しているモデルのみをフィルタリング
				.filter(
					(m: any) =>
						m.supportedGenerationMethods &&
						m.supportedGenerationMethods.includes('generateContent') &&
						m.name.includes('gemini') // geminiシリーズに限定
				)
				// 'models/gemini-1.5-pro' のような形式から 'gemini-1.5-pro' の部分だけ抽出
				.map((m: any) => m.name.replace('models/', ''))
		);
	} catch (error) {
		console.error('Error fetching models:', error);
		throw error;
	}
}
