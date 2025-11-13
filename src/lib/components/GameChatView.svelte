<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import type { Session, ImageSizingSetting } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { onMount, onDestroy } from 'svelte';
	import {
		processMessageIntoPages,
		type PageData,
		type ProcessedMessage
	} from '$lib/utils/messageProcessor';
	import { defaultGameViewSettings } from '$lib/utils';

	export let currentSession: Session;

	// --- 状態変数 ---
	let currentBackgroundUrl = '';
	let currentCharacterUrl = '';
	let currentIchimaiEUrl = '';
	let isWaitingForFirstImageCommand = false;

	let currentPageIndex = 0;
	let dialogWidth: number;
	let measurementDiv: HTMLDivElement | null = null;
	let processedMessage: ProcessedMessage;

	// セッションの設定を取得し、ない場合はインポートしたデフォルト値を使用
	$: sizingSettings = currentSession.gameViewSettings?.sizing ?? defaultGameViewSettings.sizing!;

	/**
	 * サイジング設定からCSSのclassとstyle属性を生成する関数
	 * @param sizing - 個別の画像（背景・人物・一枚絵）のサイジング設定
	 * @param target - 画像の種類
	 */
	function getAttrs(
		sizing: ImageSizingSetting | undefined,
		target: 'background' | 'character' | 'ichimaiE'
	) {
		const s = sizing ?? defaultGameViewSettings.sizing![target];
		let style = '';

		// ▼▼▼【ここが修正点】▼▼▼
		// 'max-w-none' と 'max-h-none' を追加し、フレームワークによる
		// 暗黙的なサイズ制限(max-width: 100%など)を無効化します。
		// これにより、画像の比率が崩れることを防ぎます。
		let cssClass = 'absolute max-w-none max-h-none';
		// ▲▲▲【修正ここまで】▲▲▲

		switch (s.mode) {
			case 'fit-width':
				// 横幅をコンテナに合わせ、高さはアスペクト比を維持して自動調整 (上下にはみ出すことを許容)
				cssClass += ' w-full h-auto';
				break;
			case 'fit-height':
				// 高さをコンテナに合わせ、横幅はアスペクト比を維持して自動調整 (左右にはみ出すことを許容)
				cssClass += target === 'character' ? ' h-5/6 w-auto' : ' h-full w-auto';
				break;
			case 'scale':
				// コンテナサイズを無視し、元画像サイズを基準に拡大・縮小
				cssClass += ' w-auto h-auto'; // 元画像のサイズを維持
				const scaleValue = (s.scale || 100) / 100;
				style = `transform: scale(${scaleValue});`;
				break;
		}

		// 拡大・縮小の基準点を設定
		if (target === 'character') {
			style += ' transform-origin: bottom center;';
		} else {
			style += ' transform-origin: center;';
		}

		// 位置決めのクラスを追加
		if (target === 'character') {
			// 人物: 画面下部、水平中央
			cssClass += ' bottom-0 left-1/2 -translate-x-1/2';
		} else {
			// 背景・一枚絵: コンテナ内で中央揃え
			cssClass += ' top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
		}

		return { style, class: cssClass };
	}

	$: bgAttrs = getAttrs(sizingSettings.background, 'background');
	$: charAttrs = getAttrs(sizingSettings.character, 'character');
	$: ieAttrs = getAttrs(sizingSettings.ichimaiE, 'ichimaiE');

	onMount(() => {
		measurementDiv = document.createElement('div');
		measurementDiv.classList.add('dialog-box');
		measurementDiv.style.position = 'absolute';
		measurementDiv.style.visibility = 'hidden';
		measurementDiv.style.left = '-9999px';
		measurementDiv.style.top = '-9999px';
		document.body.appendChild(measurementDiv);

		const baseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ?? defaultGameViewSettings.imageBaseUrl;
		const extension =
			currentSession.gameViewSettings?.imageExtension ?? defaultGameViewSettings.imageExtension;
	});

	onDestroy(() => {
		if (measurementDiv && measurementDiv.parentNode) {
			document.body.removeChild(measurementDiv);
		}
	});

	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text || '......';

	$: processedMessage = (() => {
		if (!measurementDiv || !latestAiMessage || !dialogWidth) {
			return { pages: [{ text: '......' }], statusUpdates: {} };
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

		const imageBaseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ?? defaultGameViewSettings.imageBaseUrl;
		const imageExtension =
			currentSession.gameViewSettings?.imageExtension ?? defaultGameViewSettings.imageExtension;

		return processMessageIntoPages(latestAiMessage, {
			maxHeight: maxHeight,
			measureTextHeight: measureTextHeight,
			imageBaseUrl: imageBaseUrl,
			imageExtension: imageExtension
		});
	})();

	$: messagePageData = processedMessage.pages;
	$: messagePages = messagePageData.map((p) => p.text);
	$: hasMorePages = currentPageIndex < messagePages.length - 1;

	$: if (latestAiMessage) {
		isWaitingForFirstImageCommand = true;
		currentPageIndex = 0;
	}

	$: if (messagePageData && messagePageData[currentPageIndex]) {
		const pageData = messagePageData[currentPageIndex];

		const hasBgCmd = !!pageData.backgroundUrl;
		const hasCharCmd = !!pageData.characterUrl;
		const hasIeCmd = !!pageData.ichimaiEUrl;
		const hasAnyImageCommand = hasBgCmd || hasCharCmd || hasIeCmd;

		if (isWaitingForFirstImageCommand && hasAnyImageCommand) {
			isWaitingForFirstImageCommand = false;
			if (!hasIeCmd) {
				currentIchimaiEUrl = '';
			}
		}

		if (hasIeCmd) {
			currentIchimaiEUrl = pageData.ichimaiEUrl!;
		}
		if (hasBgCmd) {
			currentBackgroundUrl = pageData.backgroundUrl!;
		}
		if (hasCharCmd) {
			currentCharacterUrl = pageData.characterUrl!;
		}
	}

	function handleNextPage() {
		if (hasMorePages) {
			currentPageIndex++;
		}
	}
</script>

<div class="flex h-full flex-col">
	<div
		class="flex flex-shrink-0 flex-wrap justify-end gap-x-4 gap-y-1 px-4 pb-2 text-lg font-semibold"
	>
		{#if currentSession.customStatuses}
			{#each currentSession.customStatuses as status}
				{#if status.isVisible}
					<div class="bg-opacity-30 rounded-md bg-black px-3 py-1">
						<span>{status.name}: {status.currentValue}</span>
					</div>
				{/if}
			{/each}
		{/if}
	</div>

	<!-- Part 2: 画像表示エリア -->
	<div
		class="relative flex-1 cursor-pointer overflow-hidden"
		role="button"
		tabindex="0"
		on:click={handleNextPage}
		on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
	>
		<!-- 背景 (z-10) -->
		<img src={currentBackgroundUrl} alt="背景" class="z-10 {bgAttrs.class}" style={bgAttrs.style} />
		<!-- 人物 (z-20) -->
		<img
			src={currentCharacterUrl}
			alt="人物"
			class="z-20 {charAttrs.class}"
			style={charAttrs.style}
		/>
		<!-- 一枚絵 (z-30) -->
		{#if currentIchimaiEUrl}
			<img
				src={currentIchimaiEUrl}
				alt="一枚絵"
				class="z-30 {ieAttrs.class}"
				style={ieAttrs.style}
			/>
		{/if}
	</div>

	<!-- Part 3: ダイアログ -->
	<div class="flex-shrink-0 px-4 pt-4">
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
	</div>
</div>

<style>
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
