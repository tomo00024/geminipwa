// src/lib/types.ts

// ===================================================================
// 1. 各機能が使用する、固有の設定とデータの型を定義する
// ===================================================================

/**
 * 好感度機能 (Function Calling) の設定とデータ
 */
export interface GoodwillFeatureData {
	// isEnabled: boolean; // ← [修正] この行を削除します
	currentValue: number; // 現在の好感度の合計値
	thresholds: {
		level: number;
		prompt_addon: string;
	}[];
	descriptionForAI?: string;
}

/**
 * (将来の機能追加の例) アイテム管理機能のデータ
 */
export interface InventoryFeatureData {
	isEnabled: boolean;
	items: {
		id: string;
		name: string;
		quantity: number;
	}[];
}

// ===================================================================
// 2. すべての機能別データを格納する、拡張可能なコンテナを定義する
// ===================================================================

export interface GameViewSettings {
	imageBaseUrl: string;
	imageExtension: string;
}
/**
 * 機能別の設定/データをまとめるインターフェース。
 * 新しい機能を追加する場合は、ここにオプショナルプロパティを追加するだけ。
 */
export interface FeatureSettings {
	// ▼▼▼ [修正] apiModeプロパティを追加します ▼▼▼
	apiMode: 'standard' | 'oneStepFC' | 'twoStepFC';

	goodwill?: GoodwillFeatureData;
	inventory?: InventoryFeatureData;
	// questSystem?: QuestFeatureData; // 将来の拡張
}

// ===================================================================
// 3. コアとなるSessionインターフェースを定義する (変更なし)
// ===================================================================
export interface AppSettings {
	apiKey: string;
}

export interface Session {
	id: string;
	createdAt: string;
	lastUpdatedAt: string;
	featureSettings: FeatureSettings;
	viewMode?: 'standard' | 'game';
	gameViewSettings?: GameViewSettings;
	logs: {
		speaker: 'user' | 'ai';
		text: string;
		timestamp: string;
	}[];
}

// ===================================================================
// 4. APIとの通信で使用するデータ型 (変更なし)
// ===================================================================
export interface ConversationContext {
	logs: {
		speaker: 'user' | 'ai';
		text: string;
	}[];
	featureSettings: FeatureSettings;
}
