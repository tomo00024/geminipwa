// src/lib/types.ts

// ===================================================================
// 1. 各機能が使用する、固有の設定とデータの型を定義する
// ===================================================================

/**
 * 好感度機能 (Function Calling) の設定とデータ
 */
export interface GoodwillFeatureData {
	isEnabled: boolean; // この機能がセッションで有効か
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

/**
 * 機能別の設定/データをまとめるインターフェース。
 * 新しい機能を追加する場合は、ここにオプショナルプロパティを追加するだけ。
 */
export interface FeatureSettings {
	goodwill?: GoodwillFeatureData;
	inventory?: InventoryFeatureData;
    // questSystem?: QuestFeatureData; // 将来の拡張
}


// ===================================================================
// 3. コアとなるSessionインターフェースを定義する
// ===================================================================

/**
 * アプリケーション全体の設定
 */
export interface AppSettings {
	apiKey: string;
}

/**
 * 個別の対話セッションのコア構造。
 * 特定の機能に依存するプロパティは一切持たない。
 */
export interface Session {
	id: string; // UUID v4
	name?: string; // セッションのタイトル(オプション)
	createdAt: string; // ISO 8601
	lastUpdatedAt: string; // ISO 8601

	// 機能別の設定/データは、この中にすべて格納する
	featureSettings: FeatureSettings;

	logs: {
		speaker: 'user' | 'ai';
		text: string;
		timestamp: string; // ISO 8601
	}[];
}

// ===================================================================
// 4. (新規追加) APIとの通信で使用するデータ型
// ===================================================================

/**
 * AIとの対話コンテキスト（文脈）を表すデータ。
 * サーバーAPIへ送信するために、Sessionオブジェクトから必要な情報だけを抽出したもの。
 */
export interface ConversationContext {
	// 対話ログ（タイムスタンプなど不要な情報は含まない）
	logs: {
		speaker: 'user' | 'ai';
		text: string;
	}[];

	// 機能別の設定
	featureSettings: FeatureSettings;
}
