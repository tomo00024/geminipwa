<!-- src/lib/components/StandardChatView.svelte -->
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';

	// --- ストアと型をインポート ---
	import { chatSessionStore } from '$lib/chatSessionStore';
	import type { Log } from '$lib/types';

	export let handleRetry: (userMessageId: string) => Promise<void>;

	let editingBubbleWidth = 0;
	let textareaElement: HTMLTextAreaElement;

	let activeMenuId: string | null = null;
	// ▼▼▼【追加】コピー状態を管理する変数 ▼▼▼
	let copiedLogId: string | null = null;
	let expandedMetadataLogId: string | null = null;

	function toggleMenu(logId: string) {
		activeMenuId = activeMenuId === logId ? null : logId;
	}
	function toggleMetadata(logId: string) {
		expandedMetadataLogId = expandedMetadataLogId === logId ? null : logId;
		activeMenuId = null;
	}
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		// メニューの外側をクリックした場合
		if (activeMenuId && !target.closest('.chat-bubble, .action-menu')) {
			activeMenuId = null;
		}
		// メタデータ表示領域や、それを操作するメニューの外側をクリックした場合
		if (
			expandedMetadataLogId &&
			!target.closest('.metadata-container') &&
			!target.closest('.action-menu')
		) {
			expandedMetadataLogId = null;
		}
	}

	// ▼▼▼【追加】クリップボードにテキストをコピーする関数 ▼▼▼
	async function handleCopy(logId: string, textToCopy: string) {
		try {
			await navigator.clipboard.writeText(textToCopy);
			copiedLogId = logId; // コピー成功をUIに反映
			setTimeout(() => {
				if (copiedLogId === logId) {
					copiedLogId = null; // 2秒後にテキストを元に戻す
				}
			}, 2000);
		} catch (err) {
			console.error('クリップボードへのコピーに失敗しました:', err);
			// ここでユーザーにエラーを通知することもできます
		}
	}

	$: displayableLogs = (() => {
		if (!$chatSessionStore.session || !$chatSessionStore.session.logs.length) {
			return [];
		}
		const allLogs = $chatSessionStore.session.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));
		const filteredLogs: Log[] = [];

		let currentLog = allLogs.find((log) => log.parentId === null);
		if (!currentLog) return [];

		while (currentLog) {
			filteredLogs.push(currentLog);
			if (currentLog.activeChildId) {
				const nextLog = logMap.get(currentLog.activeChildId);
				if (nextLog) {
					currentLog = nextLog;
				} else {
					break;
				}
			} else {
				break;
			}
		}
		return filteredLogs;
	})();

	function adjustTextareaHeight() {
		if (!textareaElement) return;
		textareaElement.style.height = 'auto';
		textareaElement.style.height = `${textareaElement.scrollHeight}px`;
	}

	async function handleStartEditing(message: Log, event: MouseEvent) {
		const bubbleElement = (event.currentTarget as HTMLElement)
			.closest('.chat')
			?.querySelector('.chat-bubble');
		if (bubbleElement instanceof HTMLElement) {
			editingBubbleWidth = bubbleElement.offsetWidth;
		}
		chatSessionStore.startEditing(message.id);
		await tick();
		adjustTextareaHeight();
	}
</script>

<svelte:window on:click={handleClickOutside} />

{#if $chatSessionStore.session}
	<!-- チャットログのループ処理 -->
	<div class="space-y-4 rounded px-4">
		{#each displayableLogs as log (log.id)}
			{@const isUser = log.speaker === 'user'}
			{@const isEditing = $chatSessionStore.editingMessageId === log.id}
			<!-- メッセージコンテナ -->
			<div class="chat {isUser ? 'chat-end' : 'chat-start'}">
				<!-- svelte-ignore a11y-click-events-have-key-events, a11y-no-static-element-interactions -->
				<div
					class="chat-bubble group {isUser ? 'chat-bubble-primary' : ''}"
					on:click={() => toggleMenu(log.id)}
				>
					<!-- 編集モードUI -->
					{#if isEditing}
						<div class="flex flex-col gap-2" style="min-width: {editingBubbleWidth}px;">
							<button
								class="close-edit-button"
								title="編集をキャンセル"
								on:click={chatSessionStore.cancelEditing}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
									><path
										d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
									/></svg
								>
							</button>
							<textarea
								bind:this={textareaElement}
								value={$chatSessionStore.editingText}
								on:input={(e) => chatSessionStore.updateEditingText(e.currentTarget.value)}
								class="textarea textarea-bordered w-full"
								on:input={adjustTextareaHeight}
								on:keydown={(e) => {
									if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
										e.preventDefault();
										chatSessionStore.saveEditing();
									}
								}}
							></textarea>
							<div class="flex justify-end gap-2">
								<button class="btn btn-sm" on:click={chatSessionStore.cancelEditing}
									>キャンセル</button
								>
								<button class="btn btn-sm btn-primary" on:click={chatSessionStore.saveEditing}
									>保存する</button
								>
							</div>
						</div>
						<!-- 表示モードUI -->
					{:else if isUser}
						<p class="whitespace-pre-wrap">{log.text}</p>
					{:else}
						{#await marked(log.text)}
							<p>...</p>
						{:then rawHtml}
							{@html DOMPurify.sanitize(rawHtml)}
						{:catch error}
							<p class="text-red-500">レンダリングエラー: {error.message}</p>
						{/await}
					{/if}
				</div>

				<!-- アクションメニュー -->
				{#if !isEditing}
					<!-- svelte-ignore a11y-click-events-have-key-events, a11y-no-static-element-interactions -->
					<div
						class="action-menu"
						class:menu-active={activeMenuId === log.id}
						on:click|stopPropagation
					>
						<!-- ▼▼▼【追加】コピーボタン ▼▼▼ -->
						<button class="menu-button" on:click={() => handleCopy(log.id, log.text)}>
							{#if copiedLogId === log.id}
								コピーしました！
							{:else}
								コピー
							{/if}
						</button>
						<!-- ▲▲▲【追加】ここまで ▲▲▲ -->

						<!-- 編集ボタン -->
						<button class="menu-button" on:click={(event) => handleStartEditing(log, event)}>
							編集
						</button>

						<!-- 削除ボタン -->
						<button
							class="menu-button"
							on:click={() => chatSessionStore.deleteSingleMessage(log.id)}
						>
							削除
						</button>

						<!-- 再生成/リトライボタン -->
						{#if isUser}
							<button class="menu-button" on:click={() => handleRetry(log.id)}> 再生成 </button>
						{:else if log.parentId}
							<button class="menu-button" on:click={() => handleRetry(log.parentId!)}>
								再生成
							</button>
						{/if}
						{#if log.metadata}
							<button class="menu-button" on:click={() => toggleMetadata(log.id)}>
								メタデータ
							</button>
						{/if}
					</div>
				{/if}
			</div>
			{#if expandedMetadataLogId === log.id && log.metadata}
				<div class="flex w-full {isUser ? 'justify-end' : 'justify-start'}">
					<div class="metadata-container" transition:slide={{ duration: 200 }}>
						<pre><code>{JSON.stringify(log.metadata, null, 2)}</code></pre>
					</div>
				</div>
			{/if}
			<!-- 分岐ナビゲーションUI -->
			{#if !isUser && log.parentId}
				{@const siblings = $chatSessionStore.session.logs.filter(
					(l) => l.parentId === log.parentId
				)}
				{#if siblings.length > 1}
					{@const currentIndex = siblings.findIndex((l) => l.id === log.id)}
					<div class="branch-navigator">
						<button
							class="branch-button"
							disabled={currentIndex <= 0}
							on:click={() =>
								chatSessionStore.switchActiveResponse(log.parentId!, siblings[currentIndex - 1].id)}
						>
							&lt;
						</button>
						<span class="branch-text"> {currentIndex + 1} / {siblings.length} </span>
						<button
							class="branch-button"
							disabled={currentIndex >= siblings.length - 1}
							on:click={() =>
								chatSessionStore.switchActiveResponse(log.parentId!, siblings[currentIndex + 1].id)}
						>
							&gt;
						</button>
					</div>
				{/if}
			{/if}
		{/each}
	</div>
{/if}

<style>
	/* スタイルは変更なし */
	.chat {
		display: flex;
		flex-direction: column;
	}
	.chat-start {
		align-items: flex-start;
	}
	.chat-end {
		align-items: flex-end;
	}
	.chat-bubble {
		position: relative;
		max-width: 90%;
		padding: 0rem 1rem;
		border-radius: 1rem;
		background-color: #f3f3f3;
		color: #3d3d3d;
	}
	.chat-bubble :global(h1),
	.chat-bubble :global(h2),
	.chat-bubble :global(h3) {
		font-weight: bold;
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}
	.chat-bubble :global(p) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}
	.chat-bubble :global(ul),
	.chat-bubble :global(ol) {
		list-style-position: inside;
		padding-left: 1em;
	}
	.chat-bubble :global(pre) {
		background-color: #e5e7eb;
		padding: 0.5rem;
		border-radius: 0.25rem;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	.chat-bubble-primary {
		background-color: #133a0e;
		color: #e5e7eb;
	}
	.chat-bubble-primary :global(pre) {
		background-color: #133a0e;
		color: #e5e7eb;
	}
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.btn-primary {
		background-color: #133a0e;
		color: e5e7eb;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.action-menu {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		transition: all 0.2s ease-in-out;
		cursor: default;
	}
	.action-menu.menu-active {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}
	.menu-button {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background-color: #f9fafb;
		color: #374151;
		border: 1px solid #e5e7eb;
		cursor: pointer;
		font-size: 0.875rem;
		white-space: nowrap;
	}
	.menu-button:hover {
		background-color: #f3f4f6;
		border-color: #d1d5db;
	}
	.chat-bubble-primary .textarea {
		background-color: #133a0e;
		border-color: #1c5314;
		color: e5e7eb;
	}
	.textarea {
		background-color: white;
		border-color: #d1d5db;
		color: #374151;
		padding: 0.5rem;
		border-radius: 0.25rem;
		resize: none;
		overflow-y: hidden;
		min-height: 4rem;
	}
	.close-edit-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		background-color: #e5e7eb;
		color: #4b5563;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}
	.close-edit-button:hover {
		background-color: #d1d5db;
		transform: scale(1.1);
	}
	.close-edit-button svg {
		width: 1rem;
		height: 1rem;
	}
	.chat-bubble-primary .close-edit-button {
		background-color: #133a0e;
		color: #dbeafe;
	}
	.chat-bubble-primary .close-edit-button:hover {
		background-color: #133a0e;
	}
	.branch-navigator {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		margin: 0.5rem 0;
	}
	.branch-button {
		font-weight: bold;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid #d1d5db;
		background-color: white;
		cursor: pointer;
	}
	.branch-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.branch-text {
		font-size: 0.875rem;
		color: #6b7280;
	}
	.metadata-container {
		max-width: 90%; /* チャットバブルの最大幅と合わせる */
		padding: 1rem;
		background-color: #f3f4f6; /* 背景色 */
		border: 1px solid #e5e7eb; /* 枠線 */
		border-radius: 0.5rem; /* 角丸 */
		overflow-x: auto; /* 内容が長い場合に横スクロールを許可 */
		margin-top: -0.5rem; /* チャットバブルとの間隔を詰める */
		margin-bottom: 1rem; /* 次のチャットとの間隔を確保 */
	}

	.metadata-container pre {
		/* preタグのデフォルトマージンをリセット */
		margin: 0;
		/* 長い行でも折り返さず、スクロールで表示 */
		white-space: pre;
		font-size: 0.875rem; /* 文字サイズを少し小さく */
	}
</style>
