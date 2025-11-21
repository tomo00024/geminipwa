<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { appSettings } from '$lib/stores';
	// ▼ 追加: 必要なutilsとコンポーネントをインポート
	import { availableModels } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SelectionCard from '$lib/components/ui/SelectionCard.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	export let busy = false;
	export let initialTitle = '';

	const dispatch = createEventDispatcher();

	let title = initialTitle;
	let description = '';
	let imageUrl = '';
	let expiresAt = '';
	let authorName = $appSettings.lastUsedAuthorName || '';
	let contentScope: 'template' | 'full' | null = null;

	// ▼ 追加: モデル選択用の変数（初期値は現在の設定または空）
	let model = $appSettings.model || '';

	// ▼ 追加: 設定画面と同じロジックでモデルリストを生成
	$: selectableModels =
		$appSettings.availableModelList && $appSettings.availableModelList.length > 0
			? $appSettings.availableModelList.map((m) =>
					typeof m === 'string' ? m.replace(/^models\//, '') : String(m)
				)
			: availableModels;

	function handleSubmit() {
		if (!title || !contentScope || busy) return;

		dispatch('submit', {
			title,
			description,
			imageUrl: imageUrl || null,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			authorName: authorName || null,
			contentScope,
			model // ▼ 追加: 送信データにモデルを含める
		});
	}

	function handleCancel() {
		dispatch('close');
	}
</script>

<Modal isOpen={true} title="セッションの公開" size="lg" on:close={handleCancel}>
	<!-- 1. 公開範囲の選択 -->
	<div class="space-y-4">
		<h3 class="text-base font-semibold text-gray-200">1. 公開範囲の選択 *</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<SelectionCard
				title="テンプレートのみ公開"
				description="最初のプロンプトとAIの最初の応答、セッション設定を公開します。"
				selected={contentScope === 'template'}
				onClick={() => (contentScope = 'template')}
			/>
			<SelectionCard
				title="すべての会話履歴を公開"
				description="設定、プロンプト、そしてすべてのAIとの会話履歴を公開します。"
				selected={contentScope === 'full'}
				onClick={() => (contentScope = 'full')}
			/>
		</div>

		<div
			class="mt-2 rounded border-l-4 border-yellow-600 bg-yellow-900/30 p-2 text-sm text-yellow-200 transition-all duration-200"
			class:invisible={contentScope !== 'full'}
			class:opacity-0={contentScope !== 'full'}
		>
			<strong class="font-bold">⚠️【注意】</strong>
			個人情報や機密情報が含まれていないか内容をよく確認してください。
		</div>
	</div>

	<!-- 2. 公開情報の入力 -->
	<div class="mt-6 space-y-4">
		<h3 class="text-base font-semibold text-gray-200">2. 公開情報の入力</h3>

		<div>
			<label for="title" class="mb-1 block text-sm font-medium text-gray-200">タイトル *</label>
			<Input type="text" id="title" bind:value={title} class="w-full" required />
		</div>

		<!-- ▼ 追加: モデル選択UI -->
		<div>
			<label for="model" class="mb-1 block text-sm font-medium text-gray-200">使用モデル</label>
			<Select id="model" bind:value={model} options={selectableModels} class="w-full" />
		</div>

		<div>
			<label for="authorName" class="mb-1 block text-sm font-medium text-gray-200">作者名</label>
			<Input
				type="text"
				id="authorName"
				bind:value={authorName}
				class="w-full"
				placeholder="公開される名前 (空欄可)"
			/>
		</div>
		<div>
			<label for="description" class="mb-1 block text-sm font-medium text-gray-200">説明文</label>
			<Textarea id="description" bind:value={description} rows={3} class="w-full" />
		</div>
		<div>
			<label for="imageUrl" class="mb-1 block text-sm font-medium text-gray-200">画像URL</label>
			<Input
				type="url"
				id="imageUrl"
				bind:value={imageUrl}
				class="w-full"
				placeholder="https://example.com/image.png"
			/>
		</div>
		<div>
			<label for="expiresAt" class="mb-1 block text-sm font-medium text-gray-200">有効期限</label>
			<input
				type="datetime-local"
				id="expiresAt"
				bind:value={expiresAt}
				class="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-200 focus:outline-none"
			/>
		</div>
	</div>

	<div slot="footer" class="flex w-full justify-end gap-3">
		<Button variant="secondary" on:click={handleCancel}>キャンセル</Button>
		<Button variant="primary" on:click={handleSubmit} disabled={!title || !contentScope || busy}>
			{#if busy}処理中...{:else}同意して公開{/if}
		</Button>
	</div>
</Modal>
