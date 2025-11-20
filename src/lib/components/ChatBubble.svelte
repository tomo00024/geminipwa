<!-- src/lib/components/ChatBubble.svelte -->
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { createEventDispatcher, tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { Log } from '$lib/types';

	export let log: Log;
	export let isEditing: boolean = false;
	export let editingText: string = '';
	export let displayMode: 'bubble' | 'transcript' = 'bubble';
	export let showSpeakerName: boolean = true;

	const dispatch = createEventDispatcher();

	let editingBubbleWidth = 0;
	let textareaElement: HTMLTextAreaElement;
	let metadataContainer: HTMLElement;
	let metadataButton: HTMLElement;
	let bubbleContainer: HTMLElement;

	// メニューの表示状態
	let isMenuOpen = false;
	let isMetadataOpen = false;
	let copied = false;

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function toggleMetadata() {
		isMetadataOpen = !isMetadataOpen;
		isMenuOpen = false;
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target as Node;

		// メタデータを閉じる判定
		if (
			isMetadataOpen &&
			metadataContainer &&
			!metadataContainer.contains(target) &&
			(!metadataButton || !metadataButton.contains(target))
		) {
			isMetadataOpen = false;
		}

		// メニューを閉じる判定 (バブルの外側をクリックした場合)
		if (isMenuOpen && bubbleContainer && !bubbleContainer.contains(target)) {
			isMenuOpen = false;
		}
	}

	function handleBubbleClick(event: MouseEvent) {
		// テキスト選択中はメニューを切り替えない
		if (window.getSelection()?.toString()) return;
		// 編集モード中はメニューを切り替えない
		if (isEditing) return;

		isMenuOpen = !isMenuOpen;
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(log.text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Copy failed:', err);
		}
	}

	function handleStartEditing(event: MouseEvent) {
		// 編集開始時の幅を保持する
		const bubbleElement = (event.currentTarget as HTMLElement).closest('.chat-bubble');
		if (bubbleElement instanceof HTMLElement) {
			editingBubbleWidth = bubbleElement.offsetWidth;
		}
		dispatch('startEditing', { id: log.id });
		isMenuOpen = false; // メニューを閉じる
	}

	// Svelte Action for auto-resizing textarea
	function autosize(node: HTMLTextAreaElement) {
		function resize() {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		}
		node.addEventListener('input', resize);
		// Initial resize
		resize();

		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}

	const isUser = log.speaker === 'user';
	$: isTranscript = displayMode === 'transcript';
</script>

<svelte:window on:click={handleWindowClick} />

<!-- メッセージコンテナ -->
<div
	class="mb-4 flex w-full flex-col {isTranscript
		? 'items-start'
		: isUser
			? 'items-end'
			: 'items-start'}"
>
	<!-- 発言者名 (トランスクリプトモードのみ) -->
	{#if isTranscript && showSpeakerName}
		<div class="text-text-muted mb-1 text-xs {isUser ? 'font-bold' : ''}">
			{isUser ? 'User' : 'Model'}
		</div>
	{/if}

	<!-- バブル本体 -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={bubbleContainer}
		on:click={handleBubbleClick}
		class="chat-bubble group relative max-w-[95%] px-4 py-0 text-[length:inherit] break-words
        {isTranscript
			? 'rounded-lg px-0 py-0'
			: `rounded-2xl px-4 ${
					isUser
						? 'bg-bubble-user-bg text-bubble-user-text [&_pre]:bg-bubble-user-bg [&_pre]:text-bubble-user-text'
						: 'bg-bubble-ai-bg text-bubble-ai-text [&_pre]:bg-code-bg [&_pre]:text-code-text'
				}`}
        [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold
        [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold
        [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold
        [&_p]:my-2
        [&_pre]:rounded [&_pre]:p-2 [&_pre]:break-words [&_pre]:whitespace-pre-wrap"
	>
		<!-- 編集モード -->
		{#if isEditing}
			<div class="flex flex-col gap-2" style="min-width: {editingBubbleWidth}px;">
				<textarea
					use:autosize
					value={editingText}
					on:input={(e) => {
						dispatch('updateEditingText', e.currentTarget.value);
					}}
					class="min-h-[4rem] w-full resize-none overflow-hidden rounded border px-2 py-2
                    {isTranscript
						? 'bg-bg-base border-border-base text-text-base'
						: isUser
							? 'border-bubble-user-bg bg-bubble-user-bg text-bubble-user-text'
							: 'border-border-base bg-white text-text-base'}"
					on:keydown={(e) => {
						if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							dispatch('saveEditing');
						}
					}}
					on:click|stopPropagation
				></textarea>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="cursor-pointer rounded-lg border-none bg-btn-secondary-bg px-3 py-1 text-btn-secondary-text"
						on:click={() => dispatch('cancelEditing')}
					>
						キャンセル
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-lg border-none bg-btn-primary-bg px-3 py-1 text-btn-primary-text"
						on:click={() => dispatch('saveEditing')}
					>
						保存
					</button>
				</div>
			</div>
		{:else}
			<!-- 表示モード -->
			<div class="max-w-none leading-relaxed">
				{#if isUser}
					<p class="whitespace-pre-wrap">{log.text}</p>
				{:else}
					{#await marked(log.text || '')}
						<p class="animate-pulse text-gray-400">...</p>
					{:then rawHtml}
						{@html DOMPurify.sanitize(rawHtml)}
					{:catch error}
						<p class="text-red-400">Error: {error.message}</p>
					{/await}
				{/if}
			</div>
		{/if}

		<!-- アクションメニュー (クリックで表示) -->
		{#if isMenuOpen && !isEditing}
			<div
				class="absolute top-full z-10 mt-2 flex gap-1 {isTranscript
					? 'left-0'
					: isUser
						? 'right-0'
						: 'left-0'}"
				transition:slide={{ duration: 100, axis: 'y' }}
			>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-sm whitespace-nowrap text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg"
					on:click|stopPropagation={handleCopy}
					title="コピー"
				>
					{#if copied}
						<span class="text-green-400">✓</span>
					{:else}
						コピー
					{/if}
				</button>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-sm whitespace-nowrap text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg"
					on:click|stopPropagation={handleStartEditing}
					title="編集">編集</button
				>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-sm whitespace-nowrap text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg"
					on:click|stopPropagation={() => dispatch('retry', { id: log.id })}
					title="再生成/リトライ">再生成</button
				>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-sm whitespace-nowrap text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg"
					on:click|stopPropagation={() => dispatch('delete', { id: log.id })}
					title="削除">削除</button
				>
				{#if log.metadata}
					<button
						type="button"
						bind:this={metadataButton}
						class="cursor-pointer rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-sm whitespace-nowrap text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg"
						on:click|stopPropagation={toggleMetadata}
						title="メタデータ">メタデータ</button
					>
				{/if}
			</div>
		{/if}
	</div>

	<!-- メタデータ表示エリア -->
	{#if isMetadataOpen && log.metadata}
		<div
			bind:this={metadataContainer}
			class="mt-2 max-w-[95%] overflow-x-auto rounded-2xl p-4 text-sm
            {isTranscript
				? 'bg-bg-surface border border-border-base text-text-base'
				: isUser
					? 'bg-bubble-user-bg text-bubble-user-text'
					: 'bg-bubble-ai-bg text-bubble-ai-text'}"
			transition:slide={{ duration: 150, axis: 'y' }}
		>
			<pre class="break-words whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
		</div>
	{/if}

	<!-- 分岐ナビゲーション (AIメッセージのみ) -->
	<slot name="branch-nav" />
</div>
