// src/lib/types.ts
// ===================================================================
// 1. 各機能が使用する、固有の設定とデータの型を定義する
// ===================================================================
// ▲▲▲【変更なし】ここから下の内容は変更ありません

/**
 * 好感度機能 (Function Calling) の設定とデータ
 */
export interface GoodwillFeatureData {
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

/**
 * カスタムステータスの型定義
 */
export interface CustomStatus {
	id: string;
	name: string;
	currentValue: string;
	mode: 'add' | 'set';
	isVisible: boolean;
}

/**
 * トリガーの単一の条件を表す型
 */
export interface TriggerCondition {
	id: string; // 条件の一意なID
	statusId: string; // どのステータスを参照するか (CustomStatusのidや固定値)
	operator: '==' | '>=' | '>' | '<=' | '<';
	value: number;
}

/**
 * 一つのトリガー全体の設定を表す型
 */
export interface Trigger {
	id: string; // トリガーの一意なID
	conditions: TriggerCondition[];
	// 条件が2つ以上ある場合、間の結合子を格納 (例: conditionsが3つならconjunctionsは2つ)
	conjunctions: ('AND' | 'OR')[];
	executionType: 'once' | 'persistent' | 'on-threshold-cross';
	responseText: string;
	hasBeenExecuted?: boolean; // 'once' タイプで使用: 既に実行されたか
	lastEvaluationResult?: boolean; // 'on-threshold-cross' で使用: 前回の評価結果
}

// ===================================================================
// 2. すべての機能別データを格納する、拡張可能なコンテナを定義する
// ===================================================================

/**
 * 画像のサイジング設定の型
 */
export interface ImageSizingSetting {
	mode: 'scale' | 'fit-height' | 'fit-width'; // モード: 倍率指定 | 縦に合わせる | 横に合わせる
	scale: number; // 'scale' モードの時の倍率 (単位: %)
}
export interface GameViewSettings {
	imageBaseUrl: string;
	imageExtension: string;
	sizing?: {
		background: ImageSizingSetting;
		character: ImageSizingSetting;
		ichimaiE: ImageSizingSetting;
	};
}

export interface FeatureSettings {
	apiMode: 'standard' | 'oneStepFC' | 'twoStepFC';
	goodwill?: GoodwillFeatureData;
	inventory?: InventoryFeatureData;
}

// ===================================================================
// 3. コアとなるSessionインターフェースを定義する
// ===================================================================
export interface ApiKey {
	id: string;
	name: string;
	key: string;
}

export interface AppSettings {
	apiKeys: ApiKey[];
	activeApiKeyId: string | null;
	model: string;
	systemPrompt: {
		isEnabled: boolean;
		text: string;
	};
	dummyUserPrompt: {
		isEnabled: boolean;
		text: string;
	};
}

/**
 * 会話内の単一のメッセージを表す。
 * 全てのメッセージは親子関係を持ち、フラットな配列で管理される。
 */
export interface Log {
	id: string; // 全メッセージで一意なID
	speaker: 'user' | 'ai';
	text: string;
	timestamp: string;
	parentId: string | null; // 親メッセージのID。会話の始点はnull
	/**
	 * このメッセージから複数の子メッセージ（分岐）が続く場合に、
	 * 現在アクティブな子のIDを保持する。
	 */
	activeChildId: string | null;
}

export interface Session {
	id: string;
	title: string;
	createdAt: string;
	lastUpdatedAt: string;
	featureSettings: FeatureSettings;
	viewMode?: 'standard' | 'game';
	gameViewSettings?: GameViewSettings;
	customStatuses?: CustomStatus[];
	triggers?: Trigger[];
	/**
	 * @description 会話ログの構造をLogのフラットな配列に変更
	 */
	logs: Log[];
}

// ===================================================================
// 4. APIとの通信で使用するデータ型
// ===================================================================
export interface ConversationContext {
	logs: {
		speaker: 'user' | 'ai';
		text: string;
	}[];
	featureSettings: FeatureSettings;
}
