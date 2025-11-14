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
	const part = data.candidates?.[0]?.content?.parts?.[0];
	const responseText = part?.text ?? '予期せぬ形式の応答がありました。';

	if (responseText === '予期せぬ形式の応答がありました。') {
		console.error('Unexpected API response format:', data);
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

	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody) // 最終的なrequestBodyを送信
		});

		if (!response.ok) {
			const errorBody = await response.json();
			console.error('Gemini API Error:', errorBody.error.message);
			return {
				responseText: `APIエラーが発生しました: ${errorBody.error.message}`,
				metadata: { error: errorBody },
				requestBody: requestBody
			};
		}

		const data = (await response.json()) as GeminiApiResponse;
		return {
			...parseGeminiResponse(data),
			requestBody: requestBody
		};
	} catch (error) {
		console.error('Network or other error calling Gemini API:', error);
		const errorMessage = error instanceof Error ? error.message : '不明なエラー';
		return {
			responseText: `通信エラーが発生しました: ${errorMessage}`,
			metadata: { error: String(error) },
			requestBody: requestBody
		};
	}
}
