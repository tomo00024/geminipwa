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
			console.log('  - FINAL VERDICT: Line REJECTED');
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
	console.log(`[_reconstructMarkdownFromLine] START Processing line: "${line}"`);

	// --- Step 1: 曖昧な拡張子を判定してそれ以降を除去する ---
	const textAfterDomain = line;

	// 検索開始位置を「最後のスラッシュより後」にする
	const lastSlashIndex = textAfterDomain.lastIndexOf('/');
	const searchStartIndex = lastSlashIndex !== -1 ? lastSlashIndex + 1 : 0;

	const pathStartIndex = 0;
	const terminatorIndices: number[] = [];

	console.log(`[DEBUG] Step 1: Fuzzy extension patterns generation (Searching from index ${searchStartIndex})`);

	const fuzzyPatterns = new Set<string>();
	for (const extWithDot of rule.extensions) {
		fuzzyPatterns.add(extWithDot);
		const ext = extWithDot.replace('.', '');
		if (ext) {
			fuzzyPatterns.add(ext);
		}
		if (ext.length < 1) continue;

		for (const char of ext) {
			fuzzyPatterns.add(`.${char}`);
		}

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
		const index = textAfterDomain.indexOf(pattern, searchStartIndex);
		if (index !== -1) {
			terminatorIndices.push(index);
		}
	}

	const parenIndex = textAfterDomain.indexOf(')', searchStartIndex);
	if (parenIndex !== -1) {
		terminatorIndices.push(parenIndex);
	} else {
		const fallbackParen = textAfterDomain.indexOf(')');
		if (fallbackParen !== -1) terminatorIndices.push(fallbackParen);
	}

	// 終端が見つかればその位置まで、なければ文字列の最後までをパス領域とする
	const minTerminatorIndex = terminatorIndices.length > 0 ? Math.min(...terminatorIndices) : line.length;
	const pathEndIndex = minTerminatorIndex;

	console.log(`[DEBUG] pathStartIndex: ${pathStartIndex}, pathEndIndex: ${pathEndIndex}`);

	if (pathStartIndex >= pathEndIndex) {
		console.warn(`[Reconstructor] Invalid path area found. Skipping line.`);
		return null;
	}

	// 【変更】書き換え可能にするため let に変更
	let validPathString = line.substring(pathStartIndex, pathEndIndex);
	console.log(`[DEBUG] validPathString (TRIMMED RESULT): "${validPathString}"`);


	// --- 安全装置: ドメイン直後のスラッシュ抜け補正 ---
	// .app などの後にスラッシュがなく、文字が続いている場合にスラッシュを挿入する
	const domainTlds = ['.app', '.com', '.net', '.org', '.io', '.dev']; // 必要に応じて追加
	for (const tld of domainTlds) {
		if (validPathString.includes(tld)) {
			// 正規表現: TLDの直後に「/」以外の文字がある場合、間に「/」を入れる
			// 例: ".appリーシェ" -> ".app/リーシェ"
			// $1: .app, $2: 直後の文字(スラッシュ、空白、引用符以外)
			const regex = new RegExp(`(${tld.replace('.', '\\.')})([^/\\s"'])`, 'g');
			if (regex.test(validPathString)) {
				console.log(`[DEBUG] Missing slash detected after "${tld}". Fixing...`);
				validPathString = validPathString.replace(regex, '$1/$2');
				console.log(`[DEBUG] Fixed validPathString: "${validPathString}"`);
			}
		}
	}


	// --- Step 2: バラバラにしてパースしていく ---
	console.log(`[DEBUG] Step 2: Parse segments`);

	const rawSegments = validPathString.split(/[\/\\]+/);
	const decodedSegments: string[] = [];

	const extPattern = new RegExp(`(${rule.extensions.map(e => e.replace('.', '\\.')).join('|')})$`, 'i');

	for (const segment of rawSegments) {
		if (!segment || segment.trim().length === 0) continue;

		// セグメントから拡張子以降やMarkdownの閉じ括弧などのゴミを除去する
		let cleanSegment = segment.replace(extPattern, '');
		cleanSegment = cleanSegment.replace(/["')]+$/, '');

		if (!cleanSegment) continue;

		const normalizedSegment = _normalizeString(cleanSegment);
		let bestMatch = { keyword: '', distance: Infinity };

		for (const keyword of rule.pathKeywords) {
			const normalizedKeyword = _normalizeString(keyword);
			const distance = _calculateLevenshtein(normalizedSegment, normalizedKeyword);

			if (distance < bestMatch.distance) {
				bestMatch = { keyword: keyword, distance: distance };
			}
		}

		// 閾値判定
		const threshold = Math.ceil(_normalizeString(bestMatch.keyword).length / 4);

		if (bestMatch.distance <= threshold) {
			if (!decodedSegments.includes(bestMatch.keyword)) {
				decodedSegments.push(bestMatch.keyword);
				console.log(`[DEBUG] -> MATCH: "${bestMatch.keyword}"`);
			}
		}
	}

	if (decodedSegments.length === 0) {
		console.warn(`[Reconstructor] No valid keywords found in line. Skipping.`);
		return null;
	}

	console.log('[Reconstructor] Decoded segments:', decodedSegments);

	// 3. 拡張子を決定
	const foundExtension =
		rule.extensions.find((ext) => line.includes(ext.replace('.', ''))) || rule.extensions[0];

	// 4. URL再構築
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
		return responseText;
	}

	// 1. テキスト全体から、補正対象の可能性がある行リストを取得（既存ロジック維持）
	const potentialLines = _findPotentialUrlLines(responseText, rule);
	if (potentialLines.length === 0) {
		return responseText;
	}

	// 2. テキストを行ごとに分割する
	const lines = responseText.split('\n');

	// 3. 行ごとにマップ処理を行い、対象行であれば丸ごと置換する
	const processedLines = lines.map((line) => {
		// 現在の行が補正対象の候補に含まれているか確認
		if (potentialLines.includes(line)) {
			// 既存のパース・再構築ロジックを呼び出す
			const reconstructed = _reconstructMarkdownFromLine(line, rule);

			// 成功したら、元の行を捨てて「再構築された文字列」を返す（行の完全置換）
			if (reconstructed) {
				return reconstructed;
			}
		}
		// 対象外、または再構築失敗なら元の行をそのまま返す
		return line;
	});

	// 4. 全行を結合して返す
	return processedLines.join('\n');
}