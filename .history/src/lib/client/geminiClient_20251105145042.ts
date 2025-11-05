
import type { ConversationContext, GoodwillFeatureData } from '$lib/types';
import { geminiModelConfig } from '$lib/utils';

// ===================================================================
// 型定義 (サーバーから移植)
// ===================================================================
interface GenerateResponseArgs {
	responseText: string;
	goodwillFluctuation?: number;
}

export interface ChatResponse {
	responseText: string;
	goodwillFluctuation: number;
}

// REST APIのレスポンスの型（簡易版）
interface GeminiApiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text?: string;
                functionCall?: {
                    name: string;
                    args: GenerateResponseArgs;
                };
            }>;
        };
    }>;
}

// ===================================================================
// Goodwill 機能 (サーバーから移植) - この部分は変更なし
// ===================================================================
function createGoodwillSchemaProperty(description: string) {
	return {
		goodwillFluctuation: {
			type: "number",
			description: description
		}
	};
}

function processGoodwill(goodwillData: GoodwillFeatureData, userInput: string): string {
	if (!goodwillData.thresholds || goodwillData.thresholds.length === 0) {
		return userInput;
	}
	const sortedThresholds = [...goodwillData.thresholds].sort((a, b) => b.level - a.level);
	const applicableThreshold = sortedThresholds.find(
		(t) => goodwillData.currentValue >= t.level
	);
	if (applicableThreshold) {
		const promptAddon = applicableThreshold.prompt_addon;
		return `${promptAddon} ${userInput}`;
	}
	return userInput;
}


// ===================================================================
// Gemini API を "直接" 呼び出すメイン関数 (fetchを使用)
// ===================================================================
export async function callGeminiApiOnClient(
	apiKey: string,
	context: ConversationContext,
	userInput: string
): Promise<ChatResponse> {

	const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelConfig.model}:generateContent?key=${apiKey}`;
	// --- ツール（Function Calling）の動的な組み立て ---
	const baseProperties = {
		responseText: {
			type: "string",
			description: 'キャラクターがユーザーに応答する際のセリフ。'
		}
	};
	let combinedProperties: Record<string, any> = { ...baseProperties };
	let isAnyFeatureEnabled = false;

	const goodwillSettings = context.featureSettings.goodwill;
	if (goodwillSettings?.isEnabled) {
		const description = goodwillSettings.descriptionForAI || 'ユーザーの発言に応じたキャラクターの好感度の変動値。ポジティブな場合は正の数、ネガティブな場合は負の数。変化がない場合は指定不要。';
		const goodwillSchemaProperty = createGoodwillSchemaProperty(description);
		combinedProperties = { ...combinedProperties, ...goodwillSchemaProperty };
		isAnyFeatureEnabled = true;
	}

    // APIリクエストボディに含めるtoolsを定義
    const tools = isAnyFeatureEnabled ? [{
        functionDeclarations: [{
            name: 'generateResponse',
            description: 'ユーザーへの応答セリフと、それに伴う全てのゲーム内状態変化を生成します。',
            parameters: {
                type: 'OBJECT', // SDKのType.OBJECTは、直接指定する場合は'OBJECT'文字列
                properties: combinedProperties,
                required: ['responseText']
            }
        }]
    }] : undefined;


	// --- 対話履歴とプロンプトの準備 ---
	const history = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'user' : 'model',
		parts: [{ text: log.text }]
	}));

	let finalPrompt = userInput;
	if (goodwillSettings?.isEnabled) {
		finalPrompt = processGoodwill(goodwillSettings, userInput);
	}

    // 履歴の最後に現在のユーザー入力を追加
    const contents = [...history, { role: 'user', parts: [{ text: finalPrompt }] }];


	// --- APIリクエストボディの構築 ---
    const requestBody = {
        contents,
        tools,
        safetySettings: geminiModelConfig.safetySettings
    };

	try {
        // --- API呼び出し実行 ---
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            // APIエラーのハンドリング
            const errorBody = await response.json();
            console.error('Gemini API Error:', errorBody.error.message);
            return { responseText: `APIエラーが発生しました: ${errorBody.error.message}`, goodwillFluctuation: 0 };
        }

        const data = await response.json() as GeminiApiResponse;

        // --- 応答の解析 ---
        const candidate = data.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (part?.functionCall?.name === 'generateResponse') {
            // Function Callingが成功した場合
            const args = part.functionCall.args;
            return {
                responseText: args.responseText,
                goodwillFluctuation: args.goodwillFluctuation ?? 0
            };
        } else if (part?.text) {
            // Function Callingが使われなかった場合のフォールバック
            return { responseText: part.text, goodwillFluctuation: 0 };
        } else {
            // 予期せぬレスポンス形式の場合
            console.error("Unexpected API response format:", data);
            return { responseText: '予期せぬ形式の応答がありました。', goodwillFluctuation: 0 };
        }

	} catch (error) {
        // ネットワークエラーなどのハンドリング
        console.error('Network or other error calling Gemini API:', error);
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        return { responseText: `通信エラーが発生しました: ${errorMessage}`, goodwillFluctuation: 0 };
    }
}