<!-- src/lib/components/StandardChatView.svelte -->
 
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let currentSession: any;
	export let base: string;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
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
			<div class="chat {message.speaker === 'user' ? 'chat-end' : 'chat-start'}">
				<div class="chat-bubble {message.speaker === 'user' ? 'chat-bubble-primary' : ''}">
					
                    <!-- ▼▼▼ ここからが変更箇所です ▼▼▼ -->
					{#if message.speaker === 'user'}
						<!-- ユーザーのメッセージはそのまま表示 -->
						<p class="whitespace-pre-wrap">{message.text}</p>
					{:else}
						<!-- AIのメッセージはmarkedのPromiseを{#await}で解決してから表示 -->
						{#await marked(message.text)}
							<!-- Promiseが解決されるのを待っている間の表示 -->
							<p>...</p>
						{:then rawHtml}
							<!-- Promiseが解決されたら、その結果(rawHtml)をサニタイズして表示 -->
							{@html DOMPurify.sanitize(rawHtml)}
						{:catch error}
							<!-- エラーが発生した場合の表示 -->
							<p class="text-red-500">レンダリングエラー: {error.message}</p>
						{/await}
					{/if}
                    <!-- ▲▲▲ ここまでが変更箇所です ▲▲▲ -->

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

<!-- ... styleタグの中身は変更ありません ... -->
<style>
	/* styleタグの中身は変更ありません */
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
		max-width: 90%;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		background-color: #f0f0f0;
	}
	/* Markdownで生成されるタグに対するスタイルを追加すると、より見やすくなります */
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
</style>