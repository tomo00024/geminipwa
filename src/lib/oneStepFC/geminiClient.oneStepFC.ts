//src/lib/oneStepFC/geminiClient.oneStepFC.ts

import type { AppSettings, ConversationContext, GoodwillFeatureData } from '$lib/types'; // [修正] AppSettings をインポート
import { geminiModelConfig } from '$lib/utils';
import { getGoodwillSchemaProperty } from './features/goodwill';
import { getInventorySchemaProperty } from './features/inventory';

// ===================================================================
// 型定義
// ===================================================================
interface GenerateResponseAndStateArgs {
	// "Args" という接尾辞を追加し、関数の引数であることを明確化
	responseText: string;
	goodwillFluctuation?: number;
}
export interface OneStepFCChatResponse {
	responseText: string;
	goodwillFluctuation: number;
	metadata: any;
}
interface GeminiApiResponse {
	candidates: Array<{
		content: {
			parts: Array<{
				text?: string;
				functionCall?: { name: string; args: GenerateResponseAndStateArgs };
			}>;
		};
	}>;
}

// ===================================================================
// ユーティリティ/ヘルパー関数群
// ===================================================================

/**
 * 1ステップFCアプローチで使用するFunction Callingの`tools`定義を構築します。
 * 'generateResponseAndState'という単一の関数を定義します。
 */
function buildOneStepFCTool(context: ConversationContext) {
	// 関数名をより具体的に
	const baseProperties = {
		responseText: {
			type: 'string',
			description: 'ユーザーへの応答として生成されたテキストメッセージ。'
		}
	};

	let combinedProperties: Record<string, any> = { ...baseProperties };
	let isAnyFeatureEnabled = false;

	// --- 機能ごとのスキーマ追加 ---
	const goodwillSettings = context.featureSettings.goodwill;
	if (context.featureSettings.apiMode === 'oneStepFC' && goodwillSettings) {
		const goodwillSchema = getGoodwillSchemaProperty(goodwillSettings.descriptionForAI);
		combinedProperties = { ...combinedProperties, ...goodwillSchema };
		isAnyFeatureEnabled = true;
	}

	const inventorySettings = context.featureSettings.inventory;
	if (inventorySettings?.isEnabled) {
		const inventorySchema = getInventorySchemaProperty();
		combinedProperties = { ...combinedProperties, ...inventorySchema };
		isAnyFeatureEnabled = true;
	}

	// --- 組み立て処理 ---
	if (!isAnyFeatureEnabled) {
		return undefined;
	}

	return [
		{
			functionDeclarations: [
				{
					name: 'generateResponseAndState', // 関数名を役割がわかるように変更
					description:
						'ユーザーへの応答テキストと、それに伴う内部状態の変化（好感度など）をまとめて一度に生成します。',
					parameters: {
						type: 'OBJECT',
						properties: combinedProperties,
						required: ['responseText']
					}
				}
			]
		}
	];
}

/**
 * Gemini APIに渡す対話履歴(`contents`)を準備します。
 * 好感度に応じたプロンプトの付与もここで行います。
 */
function prepareGeminiContents(
	appSettings: AppSettings,
	context: ConversationContext,
	userInput: string
) {
	const history = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'model' : 'model', // userのログもmodelとして扱うことで、一貫した会話履歴を表現
		parts: [{ text: log.text }]
	}));

	let finalPrompt = userInput;
	const goodwillSettings = context.featureSettings.goodwill;
	if (context.featureSettings.apiMode === 'oneStepFC' && goodwillSettings?.thresholds) {
		const sortedThresholds = [...goodwillSettings.thresholds].sort((a, b) => b.level - a.level);
		const applicableThreshold = sortedThresholds.find(
			(t) => goodwillSettings.currentValue >= t.level
		);
		if (applicableThreshold) {
			finalPrompt = `${applicableThreshold.prompt_addon} ${userInput}`;
		}
	}

	// ユーザーの現在の入力(好感度プロンプト付与後)を含む会話履歴を作成
	const contents = [...history, { role: 'user', parts: [{ text: finalPrompt }] }];

	// ダミーユーザープロンプトが有効で、テキストが空でない場合、contentsの末尾に追加
	if (appSettings.dummyUserPrompt.isEnabled && appSettings.dummyUserPrompt.text.trim()) {
		contents.push({
			role: 'user',
			parts: [{ text: appSettings.dummyUserPrompt.text }]
		});
	}

	return contents;
}

/**
 * Gemini APIからのレスポンス(1ステップFC用)を解析し、ChatResponse形式に変換します。
 */
function parseOneStepFCResponse(data: GeminiApiResponse): OneStepFCChatResponse {
	const part = data.candidates?.[0]?.content?.parts?.[0];

	if (part?.functionCall?.name === 'generateResponseAndState') {
		const args = part.functionCall.args;
		return {
			responseText: args.responseText,
			goodwillFluctuation: args.goodwillFluctuation ?? 0,
			metadata: data // APIレスポンス全体をメタデータとして追加
		};
	}

	if (part?.text) {
		return {
			responseText: part.text,
			goodwillFluctuation: 0,
			metadata: data // APIレスポンス全体をメタデータとして追加
		};
	}

	console.error('Unexpected API response format for OneStepFC:', data);
	return {
		responseText: '予期せぬ形式の応答がありました。',
		goodwillFluctuation: 0,
		metadata: data // 予期せぬ形式でも、データ自体はメタデータとして保持
	};
}

// ===================================================================
// Gemini API を呼び出すメイン関数 (1ステップFC)
// ===================================================================
/**
 * Gemini APIを呼び出し、応答生成と状態更新を一度に行います（1ステップFC）。
 * @param apiKey - Google AIのAPIキー
 * @param context - 現在の会話コンテキスト
 * @param userInput - ユーザーからの最新の入力
 * @returns {Promise<ChatResponse>} - 生成された応答と好感度の変動値を含むオブジェクト
 */
export async function callGeminiApiWithOneStepFC( // 関数名を役割がわかるように変更
	apiKey: string,
	model: string,
	appSettings: AppSettings,
	context: ConversationContext,
	userInput: string
): Promise<OneStepFCChatResponse> {
	const tools = buildOneStepFCTool(context);
	const contents = prepareGeminiContents(appSettings, context, userInput);
	const requestBody = {
		contents,
		tools,
		safetySettings: geminiModelConfig.safetySettings
	};
	const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorBody = await response.json();
			console.error('Gemini API Error (OneStepFC):', errorBody.error.message);
			// ▼▼▼【変更】エラー時も metadata を含める ▼▼▼
			return {
				responseText: `APIエラーが発生しました: ${errorBody.error.message}`,
				goodwillFluctuation: 0,
				metadata: { error: errorBody }
			};
			// ▲▲▲【変更ここまで】▲▲▲
		}

		const data = (await response.json()) as GeminiApiResponse;
		return parseOneStepFCResponse(data);
	} catch (error) {
		console.error('Network or other error calling Gemini API (OneStepFC):', error);
		const errorMessage = error instanceof Error ? error.message : '不明なエラー';
		// ▼▼▼【変更】エラー時も metadata を含める ▼▼▼
		return {
			responseText: `通信エラーが発生しました: ${errorMessage}`,
			goodwillFluctuation: 0,
			metadata: { error: String(error) }
		};
		// ▲▲▲【変更ここまで】▲▲▲
	}
}
