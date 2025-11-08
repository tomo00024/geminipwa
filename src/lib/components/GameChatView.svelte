<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import type { Session } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { onMount, onDestroy } from 'svelte';
	import { processMessageIntoPages, type PageData } from '$lib/utils/messageProcessor';

	// ----- Props (変更なし) -----
	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	export let base: string;

	// ----- State Variables -----
	// ▼▼▼ 変更点 1: URL変数を空の文字列で初期化 ▼▼▼
	// 初期値はリアクティブブロックで設定されるため、ここでは安全な値で初期化するだけ。
	let currentBackgroundUrl = '';
	let currentCharacterUrl = '';
	// ▲▲▲ 変更ここまで ▲▲▲
	let currentPageIndex = 0;
	let dialogWidth: number;
	let measurementDiv: HTMLDivElement | null = null;
	let messagePageData: PageData[] = [];

	// ----- Lifecycle Methods (変更なし) -----
	onMount(() => {
		measurementDiv = document.createElement('div');
		measurementDiv.classList.add('dialog-box');
		measurementDiv.style.position = 'absolute';
		measurementDiv.style.visibility = 'hidden';
		measurementDiv.style.left = '-9999px';
		measurementDiv.style.top = '-9999px';
		document.body.appendChild(measurementDiv);
	});

	onDestroy(() => {
		if (measurementDiv && measurementDiv.parentNode) {
			document.body.removeChild(measurementDiv);
		}
	});

	// ----- Reactive Logic -----

	// 最新のAIメッセージを取得 (変更なし)
	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text || '......';

	// ページデータを計算するブロック (変更なし)
	$: messagePageData = (() => {
		if (!measurementDiv || !latestAiMessage || !dialogWidth) {
			return [{ text: '......' }];
		}

		const computedStyle = window.getComputedStyle(measurementDiv);
		const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
		const maxHeight = lineHeight * 3;

		measurementDiv.style.width = `${dialogWidth}px`;

		const measureTextHeight = (text: string): number => {
			if (!measurementDiv) return 0;
			measurementDiv.innerText = text;
			return measurementDiv.offsetHeight;
		};
		// ここでは `currentSession` を通常のプロパティとして正しく参照している
		const imageBaseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ??
			'https://dashing-fenglisu-4c8446.netlify.app';
		const imageExtension = currentSession.gameViewSettings?.imageExtension ?? '.avif';

		return processMessageIntoPages(latestAiMessage, {
			maxHeight: maxHeight,
			measureTextHeight: measureTextHeight,
			imageBaseUrl: imageBaseUrl,
			imageExtension: imageExtension
		});
	})();

	// ▼▼▼ 変更点 2: URLを更新するロジックを1つのリアクティブブロックに統合 ▼▼▼
	// このブロックは `latestAiMessage` (とそれに依存する`messagePageData`) が変更された時に実行される
	$: if (latestAiMessage && messagePageData.length > 0) {
		// ページインデックスをリセット
		currentPageIndex = 0;

		// セッションで定義されたデフォルトのURLを計算
		const defaultBaseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ??
			'https://dashing-fenglisu-4c8446.netlify.app';
		const defaultExtension = currentSession.gameViewSettings?.imageExtension ?? '.avif';
		const defaultBgUrl = `${defaultBaseUrl}/テスト/背景${defaultExtension}`;
		const defaultCharUrl = `${defaultBaseUrl}/テスト/人物${defaultExtension}`;

		// **最初のページ (index: 0) の画像** を設定する
		// ページ0にコマンドがあればそれを使い、なければセッションのデフォルト値を使う
		currentBackgroundUrl = messagePageData[0]?.backgroundUrl || defaultBgUrl;
		currentCharacterUrl = messagePageData[0]?.characterUrl || defaultCharUrl;
	}

	// ▼▼▼ 変更点 2: 「ページ送り時」の処理を分離 ▼▼▼
	// このブロックは `currentPageIndex` が変更された時にのみ実行される
	$: if (currentPageIndex > 0 && messagePageData[currentPageIndex]) {
		const pageData = messagePageData[currentPageIndex];

		// このページに背景コマンドがあれば、URLを更新する
		// **なければ何もしない（= 直前のページの画像が維持される）**
		if (pageData.backgroundUrl) {
			currentBackgroundUrl = pageData.backgroundUrl;
		}

		// このページに人物コマンドがあれば、URLを更新する
		if (pageData.characterUrl) {
			currentCharacterUrl = pageData.characterUrl;
		}
	}
	// ▲▲▲ 変更ここまで ▲▲▲

	// 算出プロパティとイベントハンドラ (変更なし)
	$: messagePages = messagePageData.map((p) => p.text);
	$: hasMorePages = currentPageIndex < messagePages.length - 1;

	function handleNextPage() {
		if (hasMorePages) {
			currentPageIndex++;
		}
	}
</script>

<!-- HTMLの部分は一切変更ありません -->
<div class="flex h-[100dvh] flex-col bg-gray-800 text-white">
	<!-- ヘッダー部分 -->
	<div class="flex-shrink-0 p-4">
		<div class="flex items-center justify-between">
			<a
				href="{base}/"
				class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
			>
				履歴に戻る
			</a>
			<div class="flex items-center gap-4">
				<a
					href="{base}/settings?from=session/{currentSession.id}"
					class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
				>
					アプリ設定
				</a>
				<a
					href="{base}/session/{currentSession.id}/settings"
					class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
				>
					セッション設定
				</a>
			</div>
		</div>
	</div>

	<!-- Part 2: 画像表示エリア -->
	<div
		class="relative flex-1 cursor-pointer overflow-hidden"
		role="button"
		tabindex="0"
		on:click={handleNextPage}
		on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
	>
		<img
			src={currentBackgroundUrl}
			alt="背景"
			class="absolute inset-0 z-10 h-full w-full object-cover"
		/>
		<img
			src={currentCharacterUrl}
			alt="人物"
			class="absolute bottom-0 left-1/2 z-20 h-5/6 max-w-full -translate-x-1/2 object-contain"
		/>
	</div>

	<!-- Part 3: ダイアログと入力フォーム -->
	<div class="flex-shrink-0 space-y-3 p-4">
		<!-- ダイアログボックス -->
		<div
			role="button"
			tabindex="0"
			class="dialog-box bg-opacity-50 relative h-32 cursor-pointer rounded-lg border border-gray-600 bg-black p-4"
			on:click={handleNextPage}
			on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
			bind:clientWidth={dialogWidth}
		>
			{#if messagePages[currentPageIndex]}
				{#await marked(messagePages[currentPageIndex])}
					<p>...</p>
				{:then rawHtml}
					{@html DOMPurify.sanitize(rawHtml)}
				{:catch error}
					<p class="text-red-500">Error: {error.message}</p>
				{/await}
			{/if}

			{#if hasMorePages}
				<div class="continue-indicator">▼</div>
			{/if}
		</div>

		<!-- 入力フォーム -->
		<form on:submit|preventDefault={handleSubmit} class="flex gap-2">
			<input
				type="text"
				bind:value={userInput}
				placeholder="メッセージを入力..."
				class="input input-bordered flex-1 border-gray-600 bg-gray-700"
				disabled={isLoading}
			/>
			<button type="submit" class="btn btn-primary" disabled={isLoading}>
				{#if isLoading}
					送信中...
				{:else}
					送信
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	/* styleタグ内は変更ありません */
	.dialog-box {
		overflow: hidden;
		line-height: 1.6;
		user-select: none;
		width: 100%;
		text-align: left;
		font-family: inherit;
		color: inherit;
	}

	.dialog-box :global(p) {
		margin-bottom: 0.5rem;
	}
	.dialog-box :global(h1),
	.dialog-box :global(h2),
	.dialog-box :global(h3) {
		font-weight: bold;
		margin-bottom: 0.5rem;
	}
	.dialog-box :global(ul),
	.dialog-box :global(ol) {
		list-style-position: inside;
		padding-left: 1em;
	}
	.dialog-box :global(pre) {
		background-color: rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		border-radius: 0.25rem;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.continue-indicator {
		position: absolute;
		bottom: 10px;
		right: 15px;
		font-size: 1.2rem;
		animation: bounce 1.5s infinite;
	}
	@keyframes bounce {
		0%,
		20%,
		50%,
		80%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-8px);
		}
		60% {
			transform: translateY(-4px);
		}
	}
	.input {
		padding: 0.5rem;
	}
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
