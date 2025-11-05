// @google/generative-ai SDKはブラウザでも動作します
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type Tool, type Content, Type } from '@google/genai';
import type { ConversationContext, GoodwillFeatureData } from '$lib/types';

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

// ===================================================================
// Goodwill 機能 (サーバーから移植)
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
		return `${promptAddon} ${userInput}`; // プロンプトとユーザー入力の間にスペースを追加
	}
	return userInput;
}


// ===================================================================
// Gemini API を直接呼び出すメイン関数 (chatHandler.tsから移植・修正)
// ===================================================================
export async function callGeminiApiOnClient(
	apiKey: string,
	context: ConversationContext,
	userInput: string
): Promise<ChatResponse> {
	const genAI = new GoogleGenerativeAI(apiKey);

    // geminiModelConfigの定義を直接ここで行う
    const modelConfig = {
        model: 'gemini-2.5-flash',
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
    };

	const model = genAI.getGenerativeModel(modelConfig);

	// --- ツール（Function Calling）の動的な組み立て ---
	let tools: Tool[] = [];
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

	if (isAnyFeatureEnabled) {
		const dynamicTool: Tool = {
			functionDeclarations: [{
				name: 'generateResponse',
				description: 'ユーザーへの応答セリフと、それに伴う全てのゲーム内状態変化を生成します。',
				parameters: {
						type: Type.OBJECT,
					properties: combinedProperties,
					required: ['responseText']
				}
			}]
		};
		tools.push(dynamicTool);
	}

	// --- 対話履歴とプロンプトの準備 ---
	const history: Content[] = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'user' : 'model',
		parts: [{ text: log.text }]
	}));

	let finalPrompt = userInput;
	if (goodwillSettings?.isEnabled) {
		finalPrompt = processGoodwill(goodwillSettings, userInput);
	}

	// --- API呼び出し実行 ---
	const chat = model.startChat({
		history,
		tools: tools.length > 0 ? tools : undefined
	});

	const result = await chat.sendMessage(finalPrompt);
	const response = result.response;
	const functionCalls = response.functionCalls();

	// --- 応答の解析 ---
	if (functionCalls && functionCalls.length > 0) {
		const call = functionCalls[0];
		if (call.name === 'generateResponse' && call.args) {
			const args = call.args as GenerateResponseArgs;
			return {
				responseText: args.responseText,
				goodwillFluctuation: args.goodwillFluctuation ?? 0
			};
		}
	}

	// Function Callingが使われなかった場合のフォールバック
	const fallbackText = response.text();
	return { responseText: fallbackText, goodwillFluctuation: 0 };
}