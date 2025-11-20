//src/lib/standard/geminiClient.standard.ts

import type { AppSettings, ConversationContext } from '$lib/types';
import { geminiModelConfig } from '$lib/utils';

export interface StandardChatResponse {
	responseText: string;
	metadata: any;
	requestBody: any;
	usageMetadata?: {
		promptTokenCount: number;
		candidatesTokenCount: number;
		thoughtsTokenCount?: number;
		totalTokenCount: number;
	};
}

interface GeminiApiResponse {
	candidates: Array<{
		content: { parts: Array<{ text?: string }> };
	}>;
}

/**
 * Gemini APIに渡す対話履歴(contents)を準備します。
 * ユーザー入力、ダミーユーザープロンプト、ダミーモデルプロンプトを結合します。
 */
function prepareGeminiContents(
	appSettings: AppSettings,
	context: ConversationContext,
	userInput: string
) {
	const history = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'user' : 'model',
		parts: [{ text: log.text }]
	}));

	// ユーザーの現在の入力を含む会話履歴を作成
	const contents = [...history, { role: 'user', parts: [{ text: userInput }] }];

	// ダミーユーザープロンプトが有効で、テキストが空でない場合、contentsの末尾に追加
	if (appSettings.dummyUserPrompt.isEnabled && appSettings.dummyUserPrompt.text.trim()) {
		contents.push({
			role: 'user',
			parts: [{ text: appSettings.dummyUserPrompt.text }]
		});
	}

	// --- 追加: ダミーモデルプロンプトの実装 ---
	// AIの応答の書き出しを指定（Pre-fill）します。
	// これを配列の最後に role: 'model' として置くことで、AIはこの続きを生成します。
	if (appSettings.dummyModelPrompt.isEnabled && appSettings.dummyModelPrompt.text.trim()) {
		contents.push({
			role: 'model',
			parts: [{ text: appSettings.dummyModelPrompt.text }]
		});
	}

	return contents;
}

/**
 * Gemini APIからのレスポンスを解析し、ChatResponse形式に変換します。
 */
function parseGeminiResponse(data: GeminiApiResponse): Omit<StandardChatResponse, 'requestBody'> {
	// parts配列全体を取得します。もし存在しない場合は空の配列とします。
	const parts = data.candidates?.[0]?.content?.parts ?? [];

	// parts配列内の各要素からtextプロパティを取り出し、それらを連結して一つの文字列にします。
	const responseText = parts
		.map((part) => part.text) // 各partからtextプロパティを抽出
		.filter((text) => text) // textがnullやundefinedでないものだけを対象にする
		.join(''); // 全てのテキストを結合する

	// 連結したテキストが空だった場合のフォールバック処理
	if (!responseText) {
		console.error('Unexpected API response format or empty text:', data);
		return {
			responseText: '予期せぬ形式の応答がありました。',
			metadata: data
		};
	}

	// usageMetadataの抽出
	const usageMetadata = (data as any).usageMetadata;

	return { responseText, metadata: data, usageMetadata };
}

export async function callGeminiApiOnClient(
	apiKey: string,
	model: string,
	appSettings: AppSettings,
	context: ConversationContext,
	userInput: string
): Promise<StandardChatResponse> {
	const contents = prepareGeminiContents(appSettings, context, userInput);

	const generationSettings = appSettings.generation;
	const generationConfig: { [key: string]: number | string[] } = {};

	if (generationSettings.temperature !== null) {
		generationConfig.temperature = generationSettings.temperature;
	}
	if (generationSettings.topP !== null) {
		generationConfig.topP = generationSettings.topP;
	}
	if (generationSettings.topK !== null) {
		generationConfig.topK = generationSettings.topK;
	}
	if (generationSettings.maxOutputTokens !== null) {
		generationConfig.maxOutputTokens = generationSettings.maxOutputTokens;
	}
	if (generationSettings.thinkingBudget !== null) {
		(generationConfig as any).thinkingBudget = generationSettings.thinkingBudget;
	}

	// --- 変更: リクエストボディの型定義と構築 ---
	// systemInstruction を含められるように型を拡張します。
	const requestBody: {
		contents: typeof contents;
		safetySettings: typeof geminiModelConfig.safetySettings;
		generationConfig?: typeof generationConfig;
		systemInstruction?: { parts: { text: string }[] }; // システムプロンプト用
	} = {
		contents,
		safetySettings: geminiModelConfig.safetySettings
	};

	// --- 追加: システムプロンプトの実装 ---
	if (appSettings.systemPrompt.isEnabled && appSettings.systemPrompt.text.trim()) {
		requestBody.systemInstruction = {
			parts: [{ text: appSettings.systemPrompt.text }]
		};
	}

	// generationConfigオブジェクトに何かしらのキーが含まれている場合のみ追加
	if (Object.keys(generationConfig).length > 0) {
		requestBody.generationConfig = generationConfig;
	}

	const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const { exponentialBackoff, maxRetries, initialWaitTime } = appSettings.apiErrorHandling;
	const maxAttempts = exponentialBackoff ? maxRetries : 1;
	let lastError: any = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			if (response.ok) {
				const data = (await response.json()) as GeminiApiResponse;
				const parsedResponse = parseGeminiResponse(data);

				// --- 追加: ダミーモデルプロンプトの結合処理 ---
				// ダミーモデルプロンプトを使用した場合、APIは「続き」しか返さないことが多いため、
				// UI表示用にダミーテキストと生成テキストを結合します。
				if (appSettings.dummyModelPrompt.isEnabled && appSettings.dummyModelPrompt.text.trim()) {
					parsedResponse.responseText =
						appSettings.dummyModelPrompt.text + parsedResponse.responseText;
				}

				return {
					...parsedResponse,
					requestBody: requestBody
				};
			}

			// OKではない場合、エラーハンドリング
			const errorBody = await response.json();
			lastError = errorBody;

			if (
				response.status === 429 &&
				appSettings.apiErrorHandling.loopApiKeys &&
				appSettings.apiKeys &&
				appSettings.apiKeys.length >= 2
			) {
				return {
					responseText: '',
					metadata: { error: errorBody, requiresApiKeyLoop: true },
					requestBody: requestBody
				};
			}

			const retryableStatuses = [500, 502, 503];
			if (
				exponentialBackoff &&
				retryableStatuses.includes(response.status) &&
				attempt < maxAttempts - 1
			) {
				const backoffTime = initialWaitTime * 2 ** attempt;
				const jitter = Math.random() * 500;
				const waitTime = backoffTime + jitter;

				console.log(
					`Attempt ${attempt + 1} failed with status ${response.status
					}. Retrying in ${waitTime.toFixed(0)}ms...`
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				continue;
			} else if (retryableStatuses.includes(response.status) && attempt === maxAttempts - 1) {
				break;
			} else {
				const errorMessage = errorBody.error?.message || '不明なAPIエラーです。';
				const errorCode = errorBody.error?.code || response.status;
				const errorStatus = errorBody.error?.status || '';
				const userFacingMessage = `APIエラーが発生しました (${errorCode} ${errorStatus}): ${errorMessage}`;
				console.error('Gemini API Error:', userFacingMessage);
				return {
					responseText: userFacingMessage,
					metadata: { error: errorBody },
					requestBody: requestBody
				};
			}
		} catch (error) {
			lastError = error;
			if (exponentialBackoff && attempt < maxAttempts - 1) {
				const backoffTime = initialWaitTime * 2 ** attempt;
				const jitter = Math.random() * 500;
				const waitTime = backoffTime + jitter;

				console.warn(
					`Attempt ${attempt + 1
					} failed with a network error. Retrying in ${waitTime.toFixed(0)}ms...`,
					error
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				continue;
			}
		}
	}

	console.error('All retry attempts failed. Last error:', lastError);
	let finalErrorMessage: string;

	if (lastError?.error?.message) {
		const message = lastError.error.message;
		const code = lastError.error.code;
		const status = lastError.error.status;
		finalErrorMessage = `APIエラー (${code} ${status}): ${message}`;
	} else if (lastError instanceof Error) {
		finalErrorMessage = `通信エラー: ${lastError.message}`;
	} else {
		finalErrorMessage = '不明なエラーが発生しました。';
	}

	return {
		responseText: `処理に失敗しました (全${maxAttempts}回の試行に失敗): ${finalErrorMessage}`,
		metadata: { error: lastError },
		requestBody: requestBody
	};
}