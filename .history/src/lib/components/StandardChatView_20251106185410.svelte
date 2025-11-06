<!-- src/lib/components/StandardChatView.svelte -->
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let currentSession: any;
	export let base: string;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;

	let editingId: number | null = null;
	let editingText = '';

	function autoResize(node: HTMLTextAreaElement) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};
		node.addEventListener('input', resize);
		setTimeout(resize, 0);
		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}

	function startEditing(message: any) {
		editingId = message.timestamp;
		editingText = message.text;
	}

	function cancelEditing() {
		editingId = null;
		editingText = '';
	}

	function saveEditing() {
		if (editingId === null) return;
		currentSession.logs = currentSession.logs.map((log: any) => {
			if (log.timestamp === editingId) {
				return { ...log, text: editingText };
			}
			return log;
		});
		cancelEditing();
	}

	function deleteMessage(messageId: number) {
		if (confirm('このメッセージを削除しますか？')) {
			currentSession.logs = currentSession.logs.filter((log: any) => log.timestamp !== messageId);
		}
	}
</script>

<div class="flex flex-col h-screen p-4">
	<!-- ... ヘッダー部分は変更ありません ... -->
	<div class="flex justify-between items-center mb-4">
		<a
			href="{base}/"
			class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
		>
			履歴に戻る
		</a>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings?from=session/{currentSession.id}"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				アプリ設定
			</a>
			<a
				href="{base}/session/{currentSession.id}/settings"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				セッション設定
			</a>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-gray-100 rounded">
		{#each currentSession.logs as message (message.timestamp)}
			<div class="chat-message-container {message.speaker === 'user' ? 'justify-end' : 'justify-start'}">
				<div class="chat {message.speaker === 'user' ? 'chat-end' : 'chat-start'}">
					<div class="chat-bubble group {message.speaker === 'user' ? 'chat-bubble-primary' : ''}">
						<!-- 通常コンテンツ (編集中は透明になる) -->
						<div class:ghost-content={editingId === message.timestamp}>
							{#if message.speaker === 'user'}
								<p class="whitespace-pre-wrap">{message.text}</p>
							{:else}
								{#await marked(message.text)}
									<p>...</p>
								{:then rawHtml}
									{@html DOMPurify.sanitize(rawHtml)}
								{:catch error}
									<p class="text-red-500">レンダリングエラー: {error.message}</p>
								{/await}
							{/if}
						</div>

						<!-- 編集モードのUI (編集中だけ表示) -->
						{#if editingId === message.timestamp}
							<div class="editing-ui">
								<textarea
									bind:value={editingText}
									class="textarea w-full resize-none"
									use:autoResize
								></textarea>
								<div class="flex justify-end gap-2 mt-2">
									<button class="btn btn-sm" on:click={cancelEditing}>キャンセル</button>
									<button class="btn btn-sm btn-primary" on:click={saveEditing}>保存する</button>
								</div>
							</div>
						{/if}

						<!-- フローティングメニューはこれまで通り -->
						{#if editingId !== message.timestamp}
							<div class="floating-menu">
								<button class="menu-button" title="編集" on:click={() => startEditing(message)}>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
								</button>
								<button class="menu-button" title="削除" on:click={() => deleteMessage(message.timestamp)}>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}

		{#if isLoading}
			<div class="chat chat-start">
				<div class="chat-bubble">考え中...</div>
			</div>
		{/if}
	</div>

	<!-- ... フォーム部分は変更ありません ... -->
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

<style>
	/* ... 既存スタイル ... */
	.chat { display: grid; grid-template-columns: 1fr; }
	.chat-start { justify-items: start; }
	.chat-end { justify-items: end; }

.chat-bubble {
    /* ... 他のスタイルはそのまま ... */
    display: inline-grid;

    /* ▼▼▼ ここが修正点です ▼▼▼ */
    grid-template-columns: max-content; /* 1fr から変更 */
    /* ▲▲▲ ここが修正点です ▲▲▲ */

    grid-template-rows: auto; 
}

	.chat-bubble > *:not(.floating-menu) {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		/* テキストが左寄せになるように */
		text-align: left;
	}

	.ghost-content {
		visibility: hidden;
	}

	.editing-ui {
		display: flex;
		flex-direction: column;
	}

	.chat-bubble :global(h1), .chat-bubble :global(h2), .chat-bubble :global(h3) { font-weight: bold; margin-top: 0.5em; margin-bottom: 0.5em; }
	.chat-bubble :global(p) { margin-top: 0.5em; margin-bottom: 0.5em; }
	.chat-bubble :global(ul), .chat-bubble :global(ol) { list-style-position: inside; padding-left: 1em; }
	.chat-bubble :global(pre) { background-color: #e5e7eb; padding: 0.5rem; border-radius: 0.25rem; white-space: pre-wrap; word-wrap: break-word; }

	.chat-bubble-primary { background-color: #3b82f6; color: white; }
	.chat-bubble-primary :global(pre) { background-color: #1d4ed8; color: #e5e7eb; }

	.input { padding: 0.5rem; }
	.btn { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
	.btn-primary { background-color: #3b82f6; color: white; }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.chat-message-container { display: flex; align-items: center; gap: 0.5rem; }

	.floating-menu { z-index: 10; position: absolute; top: -0.5rem; right: 1rem; display: flex; gap: 0.25rem; background-color: white; border-radius: 9999px; padding: 0.25rem; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); opacity: 0; visibility: hidden; transform: translateY(4px); transition: all 0.2s ease-in-out; }
	.chat-bubble.group:hover .floating-menu { opacity: 1; visibility: visible; transform: translateY(0); }
	.chat-start .floating-menu { left: 1rem; right: auto; }
	.menu-button { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 9999px; background-color: transparent; color: #6b7280; border: none; cursor: pointer; }
	.menu-button:hover { background-color: #f3f4f6; color: #1f2937; }
	.menu-button svg { width: 1rem; height: 1rem; }

	.textarea {
		background-color: transparent;
		color: black;
		padding: 0;
		border: none;
		outline: none;
		box-shadow: none;
		overflow: hidden;
	}
	.chat-bubble-primary .textarea {
		color: white;
	}
</style>