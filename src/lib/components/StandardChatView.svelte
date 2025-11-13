<!-- src/lib/components/StandardChatView.svelte -->
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { tick } from 'svelte';

	// --- ストアと型をインポート ---
	import { chatSessionStore } from '$lib/chatSessionStore';
	// ▼▼▼【変更】ConversationTurnを削除し、Logをインポート ▼▼▼
	import type { Log } from '$lib/types';

	export let base: string;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	// ▼▼▼【変更】handleRetryの引数の型を変更 ▼▼▼
	export let handleRetry: (userMessageId: string) => Promise<void>;

	let editingBubbleWidth = 0;
	let textareaElement: HTMLTextAreaElement;

	// ▼▼▼【変更】表示する会話ログをフィルタリングするロジック ▼▼▼
	$: displayableLogs = (() => {
		if (!$chatSessionStore.session || !$chatSessionStore.session.logs.length) {
			return [];
		}
		const allLogs = $chatSessionStore.session.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));
		const filteredLogs: Log[] = [];

		let currentLog = allLogs.find((log) => log.parentId === null);
		if (!currentLog) return []; // ルートが見つからない場合は空

		while (currentLog) {
			filteredLogs.push(currentLog);
			if (currentLog.activeChildId) {
				const nextLog = logMap.get(currentLog.activeChildId);
				if (nextLog) {
					currentLog = nextLog;
				} else {
					break; // activeChildId が指すログがない
				}
			} else {
				break; // これ以上アクティブな子はない
			}
		}
		return filteredLogs;
	})();

	function adjustTextareaHeight() {
		if (!textareaElement) return;
		textareaElement.style.height = 'auto';
		textareaElement.style.height = `${textareaElement.scrollHeight}px`;
	}

	// ▼▼▼【変更】編集開始ハンドラ ▼▼▼
	async function handleStartEditing(message: Log, event: MouseEvent) {
		const bubbleElement = (event.currentTarget as HTMLElement).closest('.chat-bubble');
		if (bubbleElement instanceof HTMLElement) {
			editingBubbleWidth = bubbleElement.offsetWidth;
		}
		chatSessionStore.startEditing(message.id);
		await tick();
		adjustTextareaHeight();
	}
</script>

{#if $chatSessionStore.session}
	<div class="flex h-[100dvh] flex-col overflow-hidden p-4">
		<!-- ヘッダー部分 (変更なし) -->
		<div class="flex-shrink-0">
			<div class="mb-4 flex items-center justify-between">
				<a
					href="{base}/"
					class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>
					履歴に戻る
				</a>
				<div class="flex items-center gap-4">
					<a
						href="{base}/settings?from=session/{$chatSessionStore.session.id}"
						class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
					>
						アプリ設定
					</a>
					<a
						href="{base}/session/{$chatSessionStore.session.id}/settings"
						class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
					>
						セッション設定
					</a>
				</div>
			</div>
		</div>

		<!-- ▼▼▼【変更】チャットログのループ処理を全面的に書き換え ▼▼▼ -->
		<div class="mb-4 flex-1 space-y-4 overflow-y-auto rounded bg-gray-100 p-2">
			{#each displayableLogs as log (log.id)}
				{@const isUser = log.speaker === 'user'}
				{@const isEditing = $chatSessionStore.editingMessageId === log.id}
				<!-- メッセージコンテナ -->
				<div class="chat {isUser ? 'chat-end' : 'chat-start'}">
					<div class="chat-bubble group {isUser ? 'chat-bubble-primary' : ''}">
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

						<!-- フローティングメニュー -->
						{#if !isEditing}
							<div class="floating-menu">
								<!-- 編集ボタン (変更なし) -->
								<button
									class="menu-button"
									title="編集"
									on:click={(event) => handleStartEditing(log, event)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
										><path
											d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"
										/></svg
									>
								</button>

								<!-- ▼▼▼【変更】削除ボタンを統一 ▼▼▼ -->
								<button
									class="menu-button"
									title="このメッセージを削除"
									on:click={() => chatSessionStore.deleteSingleMessage(log.id)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
										><path
											fill-rule="evenodd"
											d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
											clip-rule="evenodd"
										/></svg
									>
								</button>

								{#if isUser}
									<button
										class="menu-button"
										title="リトライ (新しい応答を生成)"
										on:click={() => handleRetry(log.id)}
									>
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
											><path
												fill-rule="evenodd"
												d="M15.312 11.342a1.25 1.25 0 010-1.768l-3.25-3.25a1.25 1.25 0 111.768-1.768l4.5 4.5a1.25 1.25 0 010 1.768l-4.5 4.5a1.25 1.25 0 11-1.768-1.768l3.25-3.25z"
												clip-rule="evenodd"
											/><path
												fill-rule="evenodd"
												d="M8.312 11.342a1.25 1.25 0 010-1.768L5.062 6.324a1.25 1.25 0 111.768-1.768l4.5 4.5a1.25 1.25 0 010 1.768l-4.5 4.5a1.25 1.25 0 11-1.768-1.768l3.25-3.25z"
												clip-rule="evenodd"
											/></svg
										>
									</button>
								{:else if log.parentId}
									<!-- AIメッセージの場合、親(ユーザー)のIDでリトライを実行 -->
									<button
										class="menu-button"
										title="AIの応答を再生成"
										on:click={() => handleRetry(log.parentId!)}
									>
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
											><path
												fill-rule="evenodd"
												d="M15.312 11.342a1.25 1.25 0 010-1.768l-3.25-3.25a1.25 1.25 0 111.768-1.768l4.5 4.5a1.25 1.25 0 010 1.768l-4.5 4.5a1.25 1.25 0 11-1.768-1.768l3.25-3.25z"
												clip-rule="evenodd"
											/><path
												fill-rule="evenodd"
												d="M8.312 11.342a1.25 1.25 0 010-1.768L5.062 6.324a1.25 1.25 0 111.768-1.768l4.5 4.5a1.25 1.25 0 010 1.768l-4.5 4.5a1.25 1.25 0 11-1.768-1.768l3.25-3.25z"
												clip-rule="evenodd"
											/></svg
										>
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

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
									chatSessionStore.switchActiveResponse(
										log.parentId!,
										siblings[currentIndex - 1].id
									)}
							>
								&lt;
							</button>
							<span class="branch-text"> {currentIndex + 1} / {siblings.length} </span>
							<button
								class="branch-button"
								disabled={currentIndex >= siblings.length - 1}
								on:click={() =>
									chatSessionStore.switchActiveResponse(
										log.parentId!,
										siblings[currentIndex + 1].id
									)}
							>
								&gt;
							</button>
						</div>
					{/if}
				{/if}
			{/each}

			{#if isLoading}
				<div class="chat chat-start">
					<div class="chat-bubble">考え中...</div>
				</div>
			{/if}
		</div>

		<!-- 入力フォーム (変更なし) -->
		<div class="flex-shrink-0">
			<form on:submit|preventDefault={handleSubmit} class="flex gap-2">
				<input
					type="text"
					bind:value={userInput}
					placeholder="メッセージを入力..."
					class="input input-bordered flex-1"
					disabled={isLoading}
				/>
				<button type="submit" class="btn btn-primary" disabled={isLoading}> 送信 </button>
			</form>
		</div>
	</div>
{/if}

<style>
	/* スタイルは変更なしのため省略 */
	.chat {
		display: grid;
		grid-template-columns: 1fr;
	}
	.chat-start {
		justify-items: start;
	}
	.chat-end {
		justify-items: end;
	}
	.chat-bubble {
		position: relative;
		max-width: 90%;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		background-color: #f0f0f0;
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
		background-color: #3b82f6;
		color: white;
	}
	.chat-bubble-primary :global(pre) {
		background-color: #1d4ed8;
		color: #e5e7eb;
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
	.floating-menu {
		position: absolute;
		top: -0.5rem;
		right: 1rem;
		display: flex;
		gap: 0.25rem;
		background-color: white;
		border-radius: 9999px;
		padding: 0.25rem;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
		opacity: 0;
		visibility: hidden;
		transform: translateY(4px);
		transition: all 0.2s ease-in-out;
	}
	.chat-bubble.group:hover .floating-menu {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}
	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 9999px;
		background-color: transparent;
		color: #6b7280;
		border: none;
		cursor: pointer;
	}
	.menu-button:hover {
		background-color: #f3f4f6;
		color: #1f2937;
	}
	.menu-button svg {
		width: 1rem;
		height: 1rem;
	}
	.textarea {
		background-color: white;
		border-color: #d1d5db;
		color: black;
		padding: 0.5rem;
		border-radius: 0.25rem;
	}
	.chat-bubble-primary .textarea {
		background-color: #1d4ed8;
		border-color: #3b82f6;
		color: white;
	}
	.textarea {
		background-color: white;
		border-color: #d1d5db;
		color: black;
		padding: 0.5rem;
		border-radius: 0.25rem;
		resize: none;
		overflow-y: hidden;
		min-height: 4rem; /* 約2.5行分 */
	}
	.chat-bubble-primary .textarea {
		background-color: #1d4ed8;
		border-color: #3b82f6;
		color: white;
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
		background-color: #1e40af;
		color: #dbeafe;
	}
	.chat-bubble-primary .close-edit-button:hover {
		background-color: #1d4ed8;
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
</style>
