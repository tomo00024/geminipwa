//src/lib/standard/geminiClient.standard.ts

import type { AppSettings, ConversationContext } from '$lib/types';
import { geminiModelConfig } from '$lib/utils';

export interface StandardChatResponse {
	responseText: string;
	metadata: any;
	requestBody: any;
}

interface GeminiApiResponse {
	candidates: Array<{
		content: { parts: Array<{ text?: string }> };
	}>;
}

/**
 * Gemini APIに渡す対話履歴(`contents`)を準備します。
 *
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

	return contents;
}

/**
 * Gemini APIからのレスポンスを解析し、ChatResponse形式に変換します。
 *
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

	return { responseText, metadata: data };
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

	// まずは必須のプロパティでrequestBodyのベースを定義します。
	// 型アノテーションを追加して、TypeScriptがプロパティを認識できるようにします。
	const requestBody: {
		contents: typeof contents;
		safetySettings: typeof geminiModelConfig.safetySettings;
		generationConfig?: typeof generationConfig; // generationConfigはオプショナル
	} = {
		contents,
		safetySettings: geminiModelConfig.safetySettings
	};

	// generationConfigオブジェクトに何かしらのキーが含まれている（＝空ではない）場合のみ、
	// requestBodyにgenerationConfigプロパティを追加します。
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
				body: JSON.stringify(requestBody) // 最終的なrequestBodyを送信
			});

			if (response.ok) {
				const data = (await response.json()) as GeminiApiResponse;
				return {
					...parseGeminiResponse(data),
					requestBody: requestBody
				};
			}

			// OKではない場合、エラーハンドリング
			const errorBody = await response.json();
			lastError = errorBody; // 最後のエラーとして保持

			// ▼▼▼【変更箇所】429エラーかつキー切り替え設定が有効な場合の特別処理 ▼▼▼
			if (
				response.status === 429 &&
				appSettings.apiErrorHandling.loopApiKeys &&
				appSettings.apiKeys &&
				appSettings.apiKeys.length >= 2
			) {
				// UI層にキー切り替えを促すための特別なレスポンスを返す
				return {
					responseText: '', // レスポンスがないことを示す
					metadata: { error: errorBody, requiresApiKeyLoop: true },
					requestBody: requestBody
				};
			}
			// リトライ対象のステータスコードかチェック
			const retryableStatuses = [500, 502, 503]; // 元のコードのまま
			if (
				exponentialBackoff &&
				retryableStatuses.includes(response.status) &&
				attempt < maxAttempts - 1 // 最後の試行では待機しない
			) {
				const backoffTime = initialWaitTime * 2 ** attempt;
				const jitter = Math.random() * 500; // 最大500msのゆらぎを追加
				const waitTime = backoffTime + jitter;

				console.log(
					`Attempt ${attempt + 1} failed with status ${
						response.status
					}. Retrying in ${waitTime.toFixed(0)}ms...`
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				continue; // 次の試行へ
			} else {
				// ▼▼▼【変更箇所 1】ここから ▼▼▼
				// リトライ対象外のエラー、または最後のリトライだった場合
				// エラー情報からメッセージとコードを安全に取得
				const errorMessage = errorBody.error?.message || '不明なAPIエラーです。';
				const errorCode = errorBody.error?.code || response.status;
				const errorStatus = errorBody.error?.status || '';

				// ユーザーに表示するためのエラーメッセージを組み立てる
				const userFacingMessage = `APIエラーが発生しました (${errorCode} ${errorStatus}): ${errorMessage}`;

				console.error('Gemini API Error:', userFacingMessage);
				return {
					responseText: userFacingMessage, // 組み立てたメッセージを返す
					metadata: { error: errorBody },
					requestBody: requestBody
				};
			}
		} catch (error) {
			lastError = error; // ネットワークエラーなどを保持

			if (exponentialBackoff && attempt < maxAttempts - 1) {
				const backoffTime = initialWaitTime * 2 ** attempt;
				const jitter = Math.random() * 500;
				const waitTime = backoffTime + jitter;

				console.warn(
					`Attempt ${
						attempt + 1
					} failed with a network error. Retrying in ${waitTime.toFixed(0)}ms...`,
					error
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				continue; // 次の試行へ
			}
		}
	}

	// ループがすべて失敗した場合
	console.error('All retry attempts failed. Last error:', lastError);
	let finalErrorMessage: string;

	// lastErrorがAPIからのエラーレスポンスか、ネットワークエラーかを判定
	if (lastError?.error?.message) {
		// APIからのエラーの場合
		const message = lastError.error.message;
		const code = lastError.error.code;
		const status = lastError.error.status;
		finalErrorMessage = `APIエラー (${code} ${status}): ${message}`;
	} else if (lastError instanceof Error) {
		// ネットワークエラーなどの場合
		finalErrorMessage = `通信エラー: ${lastError.message}`;
	} else {
		// その他の予期せぬエラー
		finalErrorMessage = '不明なエラーが発生しました。';
	}

	return {
		responseText: `処理に失敗しました (全リトライ失敗): ${finalErrorMessage}`,
		metadata: { error: lastError },
		requestBody: requestBody
	};
}
