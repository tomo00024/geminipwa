// src/lib/utils/imageUrlCorrector.ts

import type { Session, ImageCorrectionRule } from '$lib/types';

// ===================================================================
// 1. モジュールスコープの変数 (一時メモリ)
// ===================================================================

let activeRule: ImageCorrectionRule | null = null;

// ===================================================================
// 2. 外部に公開するインターフェース (セッターとゲッター)
// ===================================================================

export function initializeAndStoreImageRules(session: Session | null): void {
	console.log('[ruleParser] initializeAndStoreImageRules called.');

	if (!session) {
		activeRule = null;
		console.log('[ruleParser] Session is null. Active rule cleared.');
		return;
	}

	const firstLog = session.logs.find((log) => log.parentId === null);
	const sourceText = firstLog && firstLog.speaker === 'user' ? firstLog.text : '';

	if (!sourceText.trim()) {
		activeRule = null;
		console.log('[ruleParser] No source text found in the first user log. Active rule cleared.');
		return;
	}

	const parsedRule = _parseRuleFromText(sourceText);
	activeRule = parsedRule;

	if (activeRule) {
		console.log('[ruleParser] Successfully parsed and stored new rule:', {
			baseUrl: activeRule.baseUrl,
			pathKeywords: activeRule.pathKeywords,
			extensions: activeRule.extensions,
			template: `${activeRule.markdownTemplate.start}...${activeRule.markdownTemplate.end}`
		});
	} else {
		console.log('[ruleParser] Source text was found, but no valid rule could be parsed.');
	}
}

export function getActiveImageRule(): ImageCorrectionRule | null {
	return activeRule;
}

export function clearStoredImageRules(): void {
	activeRule = null;
	console.log('[ruleParser] Active rule explicitly cleared.');
}

/**
 * AIの応答から崩れたURLを含む行を特定し、ルールに基づいて正しいMarkdown形式に再構築して返す。(統括関数)
 * @param responseText - AIからの応答メッセージ全文。
 * @returns 再構築されたMarkdown画像リンクの文字列配列。
 */
export function extractImageUrlsFromAiResponse(responseText: string): string[] {
	const rule = getActiveImageRule();
	if (!rule) {
		return [];
	}

	// 責務1: 検索検証 - 処理対象となる可能性のある行を見つけ出す
	const potentialLines = _findPotentialUrlLines(responseText, rule);
	if (potentialLines.length === 0) {
		console.log('[URL Extractor] No potential lines found to process.');
		return [];
	}
	console.log(`[URL Extractor] Found ${potentialLines.length} potential line(s):`, potentialLines);

	// 責務2: 抽出・組み立て・置換 - 各行を処理し、再構築を試みる
	const reconstructedMarkdown = potentialLines
		.map((line) => _reconstructMarkdownFromLine(line, rule))
		.filter((result): result is string => result !== null); // 成功したもの(string)だけをフィルタリング

	const uniqueResults = [...new Set(reconstructedMarkdown)];

	if (uniqueResults.length > 0) {
		console.log(
			`[URL Extractor] Successfully reconstructed ${uniqueResults.length} markdown string(s):`,
			uniqueResults
		);
	} else {
		console.log('[URL Extractor] Reconstruction failed for all potential lines.');
	}

	return uniqueResults;
}

// ===================================================================
// 3. 内部的な処理を行うヘルパー関数 (責務分離)
// ===================================================================

/**
 * [責務: 検索検証] テキスト全体から、URLを含む可能性のある行を検索して返す。
 * @param responseText AIの応答テキスト全文。
 * @param rule 現在アクティブなルールオブジェクト。
 * @returns URLを含む可能性のある行の文字列配列。
 */
function _findPotentialUrlLines(responseText: string, rule: ImageCorrectionRule): string[] {
	console.log('[_findPotentialUrlLines] Running line validation...');

	// アンカー要素を準備
	const coreHttp = 'http';
	const coreExtensions = rule.extensions.map((ext) => ext.replace('.', ''));
	const validationElements = new Set<string>(rule.pathKeywords);
	const uniqueHostPart = rule.baseUrl.match(/:\/\/([a-zA-Z0-9-.]+)\//);
	if (uniqueHostPart && uniqueHostPart[1]) {
		validationElements.add(uniqueHostPart[1]);
	}
	console.log(
		'[_findPotentialUrlLines] Validation elements being used:',
		Array.from(validationElements).slice(0, 10)
	); // 多すぎるので最初の10件だけ表示

	const validatedLines: string[] = [];
	const lines = responseText.split('\n');

	for (const line of lines) {
		if (!line.trim()) continue;

		const hasHttp = line.includes(coreHttp);
		const hasExtension = coreExtensions.some((ext) => line.includes(ext));

		if (!hasHttp && !hasExtension) {
			continue;
		}

		let isValid = false;
		const hasOtherElement = [...validationElements].some((el) => line.includes(el));
		console.log(`--- Checking line: "${line.substring(0, 80)}..."`);
		console.log(`  - hasHttp: ${hasHttp}`);
		console.log(`  - hasExtension: ${hasExtension}`);
		console.log(`  - hasOtherElement: ${hasOtherElement}`);
		if (hasHttp) {
			if (hasExtension || hasOtherElement) {
				isValid = true;
			}
		} else {
			if (hasOtherElement) {
				isValid = true;
			}
		}

		if (isValid) {
			validatedLines.push(line);
		} else {
			// --- ▼▼▼ デバッグログを追加 ▼▼▼ ---
			console.log('  - FINAL VERDICT: Line REJECTED');
			// --- ▲▲▲ ここまで ▲▲▲ ---
		}
	}
	return validatedLines;
}

/**
 * [責務: 抽出・組み立て・置換] URLのパス部分を抽出し、各セグメントを**正規化**してから曖昧検索で解読し、再構築する。
 * @param line 検証済みの単一の行。
 * @param rule 現在アクティブなルールオブジェクト。
 * @returns 再構築されたMarkdown文字列。失敗した場合はnull。
 */
function _reconstructMarkdownFromLine(line: string, rule: ImageCorrectionRule): string | null {
	console.log(`[_reconstructMarkdownFromLine] Processing line: "${line}"`);

	// ステップ1: パスの開始位置を特定する
	const domainMatch = line.match(/[a-zA-Z0-9-]+\.(?:netlify\.app|vercel\.app|github\.io)/);
	if (!domainMatch || domainMatch.index === undefined) {
		console.warn(`[Reconstructor] Could not identify domain in line. Skipping.`);
		return null;
	}
	const pathStartIndex = domainMatch.index + domainMatch[0].length;

	// ステップ2: パスの終了位置を、より精密に特定する
	const textAfterDomain = line.substring(pathStartIndex);
	const terminatorIndices: number[] = [];

	// ドメイン以降で最初に出現する拡張子または閉じ括弧を探す
	// 曖昧検索用の拡張子パターンを生成する
	const fuzzyPatterns = new Set<string>();
	for (const extWithDot of rule.extensions) {
		// 元の拡張子（ドットあり・なし）を追加
		fuzzyPatterns.add(extWithDot);
		const ext = extWithDot.replace('.', '');
		if (ext) {
			fuzzyPatterns.add(ext);
		}

		if (ext.length < 1) continue;

		// パターン1: 「ドット + 拡張子内の任意の1文字」
		for (const char of ext) {
			fuzzyPatterns.add(`.${char}`);
		}

		// パターン2: 「拡張子内の任意の2文字（順序維持）」
		if (ext.length >= 2) {
			for (let i = 0; i < ext.length; i++) {
				for (let j = i + 1; j < ext.length; j++) {
					fuzzyPatterns.add(ext[i] + ext[j]);
				}
			}
		}
	}

	// 生成した全パターンと閉じ括弧について、出現位置を検索する
	for (const pattern of fuzzyPatterns) {
		const index = textAfterDomain.indexOf(pattern);
		if (index !== -1) {
			terminatorIndices.push(index);
		}
	}
	const parenIndex = textAfterDomain.indexOf(')');
	if (parenIndex !== -1) terminatorIndices.push(parenIndex);

	// 終端が見つかればその位置まで、なければ文字列の最後までをパス領域とする
	const pathEndIndex =
		terminatorIndices.length > 0 ? pathStartIndex + Math.min(...terminatorIndices) : line.length;

	if (pathStartIndex >= pathEndIndex) {
		console.warn(`[Reconstructor] Invalid path area found. Skipping line.`);
		return null;
	}

	const garbledPath = line.substring(pathStartIndex, pathEndIndex);
	console.log(`[Reconstructor] Extracted garbled path area: "${garbledPath}"`);

	// ステップ3: パスをセグメントに分割し、それぞれを正規化して解読する
	const garbledSegments = garbledPath.split(/[\/\\]+/).filter((s) => s.trim());
	const decodedSegments: string[] = [];

	for (const segment of garbledSegments) {
		if (!segment) continue;
		let bestMatch = { keyword: '', distance: Infinity };

		const normalizedSegment = _normalizeString(segment);

		for (const keyword of rule.pathKeywords) {
			const normalizedKeyword = _normalizeString(keyword);
			const distance = _calculateLevenshtein(normalizedSegment, normalizedKeyword);
			if (distance < bestMatch.distance) {
				bestMatch = { keyword: keyword, distance: distance };
			}
		}

		const threshold = Math.ceil(_normalizeString(bestMatch.keyword).length / 4);
		if (bestMatch.distance <= threshold) {
			decodedSegments.push(bestMatch.keyword);
		} else {
			console.warn(
				`[Reconstructor] Segment "${segment}" (normalized: "${normalizedSegment}") could not be decoded confidently (best match: "${bestMatch.keyword}", dist: ${bestMatch.distance}, threshold: ${threshold}).`
			);
		}
	}

	if (decodedSegments.length === 0) {
		console.warn(`[Reconstructor] No segments could be decoded. Skipping line.`);
		return null;
	}
	console.log('[Reconstructor] Decoded segments:', decodedSegments);

	// ステップ4: 拡張子を決定し、URLを再構築する
	const foundExtension =
		rule.extensions.find((ext) => line.includes(ext.replace('.', ''))) || rule.extensions[0];
	const urlPath = decodedSegments.join('/') + foundExtension;
	const fullUrl = rule.baseUrl + urlPath;
	const finalMarkdown = rule.markdownTemplate.start + fullUrl + rule.markdownTemplate.end;

	console.log(`[Reconstructor] Success -> "${finalMarkdown}"`);
	return finalMarkdown;
}

/**
 * 文字列を曖昧検索のために正規化するヘルパー関数。
 * - **ひらがなをカタカナに変換**
 * - NFKC正規化 (全角/半角の違いなどを吸収)
 * - ハイフン/アンダースコアの除去
 * @param str 正規化する文字列
 */
function _normalizeString(str: string): string {
	let katakanaStr = '';
	for (let i = 0; i < str.length; i++) {
		const charCode = str.charCodeAt(i);
		// ひらがなの範囲 (U+3041 to U+3096)
		if (charCode >= 0x3041 && charCode <= 0x3096) {
			katakanaStr += String.fromCharCode(charCode + 0x60);
		} else {
			katakanaStr += str[i];
		}
	}
	return katakanaStr.normalize('NFKC').replace(/[-_]/g, '');
}

/**
 * 2つの文字列間のレーベンシュタイン距離を計算するヘルパー関数。
 * @param a 文字列1
 * @param b 文字列2
 * @returns 編集距離 (整数)
 */
function _calculateLevenshtein(a: string, b: string): number {
	const matrix = Array(b.length + 1)
		.fill(null)
		.map(() => Array(a.length + 1).fill(null));
	for (let i = 0; i <= a.length; i++) {
		matrix[0][i] = i;
	}
	for (let j = 0; j <= b.length; j++) {
		matrix[j][0] = j;
	}
	for (let j = 1; j <= b.length; j++) {
		for (let i = 1; i <= a.length; i++) {
			const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[j][i] = Math.min(
				matrix[j][i - 1] + 1, // 削除
				matrix[j - 1][i] + 1, // 挿入
				matrix[j - 1][i - 1] + substitutionCost // 置換
			);
		}
	}
	return matrix[b.length][a.length];
}

// ===================================================================
// 4. 内部的な解析処理を行う純粋関数
// ===================================================================

function _parseRuleFromText(prompt: string): ImageCorrectionRule | null {
	const baseUrlMatch = prompt.match(
		/(https:\/\/[a-zA-Z0-9-]+\.(?:netlify\.app|vercel\.app|github\.io)\/)/
	);
	if (!baseUrlMatch) {
		console.log('[ruleParser internal] Base URL not found.');
		return null;
	}
	const baseUrl = baseUrlMatch[0];
	console.log('[ruleParser internal] Found Base URL:', baseUrl);

	const extensionMatches = prompt.match(/\.\b(avif|png|jpg|jpeg|webp|gif)\b/g);
	const extensions = extensionMatches ? [...new Set(extensionMatches)] : ['.avif', '.png'];

	const lines = prompt.split(/[\n,]/);
	const pathKeywords: string[] = [];

	for (const line of lines) {
		let keyword = line.trim();
		if (!keyword || keyword.length > 12 || keyword.startsWith('http') || keyword.startsWith('![')) {
			continue;
		}
		const lastDotIndex = keyword.lastIndexOf('.');
		if (lastDotIndex > 0) {
			const ext = keyword.substring(lastDotIndex);
			if (extensions.includes(ext)) {
				keyword = keyword.substring(0, lastDotIndex);
			}
		}
		if (keyword.length > 0 && !/[*:{}【】「」『』()（）]/.test(keyword)) {
			pathKeywords.push(keyword);
		}
	}

	if (pathKeywords.length === 0) {
		console.log('[ruleParser internal] Path keywords not found.');
		return null;
	}
	console.log('[ruleParser internal] Found Path Keywords:', pathKeywords);

	const markdownTemplate = {
		start: '![alt text](',
		end: ' "画像")'
	};

	return {
		baseUrl,
		pathKeywords: [...new Set(pathKeywords)],
		extensions,
		markdownTemplate
	};
}
/**
 * [統括関数] テキスト全体を受け取り、中の画像URLマークダウンを補正して、
 * テキスト全体を返す。
 * @param responseText - AIからの応答メッセージ全文。
 * @returns - 補正が適用されたメッセージ全文。
 */
export function correctImageMarkdownInText(responseText: string): string {
	const rule = getActiveImageRule();
	if (!rule) {
		return responseText; // ルールがなければ何もしない
	}

	// 1. テキスト全体から、補正対象の可能性がある行を「一度に」全て見つけ出す
	const potentialLines = _findPotentialUrlLines(responseText, rule);
	if (potentialLines.length === 0) {
		return responseText; // 候補がなければ何もしない
	}

	let newText = responseText;
	let textChanged = false;

	// 2. 見つけ出した候補行だけをループ処理する
	for (const line of potentialLines) {
		// 3. 1行を再構築してみる
		const reconstructed = _reconstructMarkdownFromLine(line, rule);

		// 4. 成功したら、元のテキストの該当行を置換する
		if (reconstructed) {
			newText = newText.replace(line, reconstructed);
			textChanged = true;
		}
	}

	return textChanged ? newText : responseText;
}
