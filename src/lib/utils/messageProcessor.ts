/**
 * ページごとのデータを表現する型定義
 */
export type PageData = {
	text: string;
	backgroundUrl?: string;
	characterUrl?: string;
};

type TextMeasurer = (text: string) => number;

type ProcessOptions = {
	maxHeight: number;
	measureTextHeight: TextMeasurer;
	imageBaseUrl: string;
	imageExtension: string;
};

/**
 * 生のAIメッセージを解析し、ページ分割されたデータ配列を生成する
 * @param rawMessage - AIからの生のメッセージ文字列
 * @param options - 処理に必要なオプション
 * @returns ページデータの配列
 */
export function processMessageIntoPages(rawMessage: string, options: ProcessOptions): PageData[] {
	const { maxHeight, measureTextHeight, imageBaseUrl, imageExtension } = options;
	const finalPages: PageData[] = [];
	const commandRegex = /({{\s*[^:]+?\s*:\s*.+?\s*}})/g;
	const baseUrl = 'https://dashing-fenglisu-4c8446.netlify.app';

	let pendingCommands: { bg?: string; char?: string } = {};

	// ▼▼▼ 変更点 1: pushPageのロジックを修正 ▼▼▼
	const pushPage = (text: string) => {
		// テキストが空、もしくは空白のみの場合はページを生成しない。
		// pendingCommandsもクリアせず、次のページに持ち越す。
		if (!text.trim()) {
			return;
		}

		finalPages.push({
			text: text,
			backgroundUrl: pendingCommands.bg,
			characterUrl: pendingCommands.char
		});
		// テキストを持つページにコマンドが割り当てられたので、リセットする
		pendingCommands = {};
	};
	// ▲▲▲ 変更ここまで ▲▲▲

	const primaryBreakChars = ['。', '！', '？'];
	const trailingChars = ['。', '」', '）', '！', '？'];

	const paragraphs = rawMessage.split(/\n+/).filter((p) => p.trim() !== '');

	for (const paragraph of paragraphs) {
		const parts = paragraph.split(commandRegex).filter(Boolean);
		let currentPageContent = '';
		let tempContent = '';

		for (const part of parts) {
			if (part.match(commandRegex)) {
				const match = part.match(/{{\s*([^:]+?)\s*:\s*(.+?)\s*}}/);
				if (match) {
					const [, type, value] = match;
					const path = value
						.split('|')
						.map((p) => encodeURIComponent(p.trim()))
						.join('/');
					const ext = imageExtension.startsWith('.') ? imageExtension : `.${imageExtension}`;
					const finalUrl = `${imageBaseUrl}/${path}${ext}`;
					if (type.trim() === '背景') pendingCommands.bg = finalUrl;
					if (type.trim() === '人物') pendingCommands.char = finalUrl;
				}
				continue;
			}

			const characters = part.split('');
			for (let i = 0; i < characters.length; i++) {
				tempContent += characters[i];
				if (measureTextHeight(tempContent) > maxHeight) {
					let bestSplitIndex = -1;
					for (let j = currentPageContent.length - 1; j >= 0; j--) {
						const char = currentPageContent[j];
						if (primaryBreakChars.includes(char)) {
							let sentenceEndIndex = j;
							for (let k = j + 1; k < currentPageContent.length; k++) {
								if (trailingChars.includes(currentPageContent[k])) sentenceEndIndex = k;
								else break;
							}
							const substringToCheck = currentPageContent.substring(0, sentenceEndIndex + 1);
							const openKakko = (substringToCheck.match(/「/g) || []).length;
							const closeKakko = (substringToCheck.match(/」/g) || []).length;
							const openMaruKakko = (substringToCheck.match(/（/g) || []).length;
							const closeMaruKakko = (substringToCheck.match(/）/g) || []).length;
							if (openKakko <= closeKakko && openMaruKakko <= closeMaruKakko) {
								bestSplitIndex = j;
								break;
							}
						}
					}
					if (bestSplitIndex !== -1) {
						let finalSplitIndex = bestSplitIndex;
						for (let j = bestSplitIndex + 1; j < currentPageContent.length; j++) {
							if (trailingChars.includes(currentPageContent[j])) finalSplitIndex = j;
							else break;
						}
						const pageText = currentPageContent.substring(0, finalSplitIndex + 1);
						const remainingText = currentPageContent.substring(finalSplitIndex + 1);
						pushPage(pageText);
						tempContent = remainingText + characters[i];
					} else {
						pushPage(currentPageContent);
						tempContent = characters[i];
					}
				}
				currentPageContent = tempContent;
			}
		}
		if (currentPageContent) {
			pushPage(currentPageContent);
		}
	}

	// ▼▼▼ 変更点 2: ループ終了後の末尾コマンド処理 ▼▼▼
	// ケース1: 保留中のコマンドがあり、かつ既にページが1つ以上存在する場合
	// → 最後のページにコマンドを統合する
	if ((pendingCommands.bg || pendingCommands.char) && finalPages.length > 0) {
		const lastPage = finalPages[finalPages.length - 1];
		if (!lastPage.backgroundUrl) lastPage.backgroundUrl = pendingCommands.bg;
		if (!lastPage.characterUrl) lastPage.characterUrl = pendingCommands.char;
	}
	// ケース2: 保留中のコマンドがあるが、ページがまだ1つも作られていない場合（コマンドのみのメッセージ）
	// → コマンドを運ぶための、テキストが空のページを特別に生成する
	else if ((pendingCommands.bg || pendingCommands.char) && finalPages.length === 0) {
		finalPages.push({
			text: '',
			backgroundUrl: pendingCommands.bg,
			characterUrl: pendingCommands.char
		});
	}
	// ▲▲▲ 変更ここまで ▲▲▲

	return finalPages.length > 0 ? finalPages : [{ text: '' }];
}
