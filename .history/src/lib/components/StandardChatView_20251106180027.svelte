<!-- src/lib/components/StandardChatView.svelte -->
 
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let currentSession: any;
	export let base: string;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;

    // ▼▼▼ アイコンのSVGデータです ▼▼▼
	const icons = {
		edit: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>`,
		retry: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" /></svg>`,
		trash: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>`
	};
	// ▲▲▲ アイコンのSVGデータです ▲▲▲

	// ▼▼▼ 将来のイベント処理用のダミー関数です ▼▼▼
	function handleEdit(message) {
		alert(`「${message.text.substring(0, 10)}...」を編集します。`);
		// ここに実際の編集モード切り替え処理を実装します
	}
	function handleRetry(message) {
		alert('このAIの応答を再生成します。');
		// ここに実際のリトライ処理を実装します
	}
	function handleDelete(message) {
		if (confirm(`メッセージを削除しますか？`)) {
			alert('削除処理を実装します。');
			// ここに実際の削除処理を実装します
		}
	}
	// ▲▲▲ 将来のイベント処理用のダミー関数です ▲▲▲
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
			<!-- ▼▼▼ ここからが変更箇所です ▼▼▼ -->
            <!-- 
                1. 各メッセージをdivで囲み、Tailwindの'group'クラスと'relative'クラスを追加します。
                   'group'で子の要素が親のホバー状態を検知できるようにし、'relative'でメニューの絶対位置指定の基準にします。
                2. スマホでタップした際にフォーカスが当たるように tabindex="0" を設定します。
             -->
			<div class="relative group chat {message.speaker === 'user' ? 'chat-end' : 'chat-start'}" tabindex="0">
				
                <!-- 
                    フローティングメニュー本体です。
                    - 'absolute'で親要素('group')を基準に位置を決めます。
                    - 'opacity-0'で通常は非表示にし、'group-hover:opacity-100' と 'focus-within:opacity-100' で
                      PCでのホバー時や、スマホでのタップ（フォーカスが当たった）時に表示させます。
                    - 'transition-opacity'でふわっと表示されるアニメーションをつけます。
                    - ユーザーとAIでメニューの表示位置を左右に振り分けます。
                -->
				<div
					class="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/70 backdrop-blur-sm p-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10
                           {message.speaker === 'user' ? 'left-auto right-full mr-2' : 'right-auto left-full ml-2'}"
				>
					<button on:click={() => handleEdit(message)} class="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md" title="編集">
						{@html icons.edit}
					</button>
					{#if message.speaker !== 'user'}
						<button on:click={() => handleRetry(message)} class="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md" title="再生成">
							{@html icons.retry}
						</button>
					{/if}
					<button on:click={() => handleDelete(message)} class="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md" title="削除">
						{@html icons.trash}
					</button>
				</div>


				<div class="chat-bubble {message.speaker === 'user' ? 'chat-bubble-primary' : ''}">
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
			</div>
            <!-- ▲▲▲ ここまでが変更箇所です ▲▲▲ -->
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