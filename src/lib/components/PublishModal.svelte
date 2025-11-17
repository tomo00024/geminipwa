<!-- src/lib/components/PublishModal.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { appSettings } from '$lib/stores';

	// busy状態のみを親から受け取るように変更
	export let busy = false;

	// 親コンポーネントにイベントを伝えるための仕組み
	const dispatch = createEventDispatcher();

	// フォームの入力値を保持する変数
	let title = '';
	let description = '';
	let imageUrl = '';
	let expiresAt = '';
	// appSettingsストアから読み込んだ前回の作者名で初期化する
	let authorName = $appSettings.lastUsedAuthorName || '';
	// ★ 修正点 2: モーダル本体の要素を束縛する
	let modalElement: HTMLDivElement;

	// ★ 修正点 2: コンポーネントが表示されたらモーダルにフォーカスを当てる
	onMount(() => {
		modalElement?.focus();
	});

	/**
	 * 「公開」ボタンが押されたときの処理
	 */
	function handleSubmit() {
		if (!title || busy) return;

		dispatch('submit', {
			title,
			description,
			imageUrl: imageUrl || null,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			authorName: authorName || null
		});
	}

	/**
	 * キャンセル処理
	 */
	function handleCancel() {
		dispatch('close');
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions, a11y-click-events-have-key-events -->
<div
	class="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black"
	on:click={handleCancel}
>
	<!-- ★ 修正点 2: tabindex="-1" を追加し、bind:thisで要素を束縛 -->
	<div
		bind:this={modalElement}
		tabindex="-1"
		class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl outline-none"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
	>
		<h2 class="text-xl font-bold text-gray-800">公開情報の入力</h2>
		<p class="mt-2 text-sm text-gray-600">サーバーに公開するセッションの情報を入力してください。</p>

		<div class="mt-4 space-y-4">
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700">タイトル *</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					required
				/>
			</div>
			<div>
				<label for="authorName" class="block text-sm font-medium text-gray-700">作者名</label>
				<input
					type="text"
					id="authorName"
					bind:value={authorName}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="公開される名前 (空欄可)"
				/>
			</div>
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700">説明文</label>
				<!-- ★ 修正点 3: textareaタグを正しく閉じる -->
				<textarea
					id="description"
					bind:value={description}
					rows="3"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				></textarea>
			</div>
			<div>
				<label for="imageUrl" class="block text-sm font-medium text-gray-700">画像URL</label>
				<input
					type="url"
					id="imageUrl"
					bind:value={imageUrl}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="https://example.com/image.png"
				/>
			</div>
			<div>
				<label for="expiresAt" class="block text-sm font-medium text-gray-700">有効期限</label>
				<input
					type="datetime-local"
					id="expiresAt"
					bind:value={expiresAt}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<button
				on:click={handleCancel}
				class="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				キャンセル
			</button>
			<button
				on:click={handleSubmit}
				disabled={!title || busy}
				class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
			>
				{#if busy}処理中...{:else}同意して公開{/if}
			</button>
		</div>
	</div>
</div>
