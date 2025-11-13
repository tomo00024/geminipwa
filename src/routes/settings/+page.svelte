<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { availableModels } from '$lib/utils';
	import type { ApiKey } from '$lib/types';
	import { generateUUID } from '$lib/utils';

	const returnPath = derived(page, ($page) => {
		const from = $page.url.searchParams.get('from');
		if (from && from.startsWith('session/')) {
			return {
				href: `${base}/${from}`,
				label: 'セッションに戻る'
			};
		}
		return {
			href: `${base}/`,
			label: '履歴に戻る'
		};
	});

	/**
	 * 新しいAPIキー項目をリストに追加します。
	 * デフォルトの名前として、現在のキー数に基づいた連番を振ります。
	 */
	function addApiKey() {
		appSettings.update((settings) => {
			const nextNumber = (settings.apiKeys?.length || 0) + 1;
			const newKey: ApiKey = {
				id: generateUUID(),
				name: nextNumber.toString(),
				key: ''
			};

			settings.apiKeys = [...(settings.apiKeys || []), newKey];

			if (settings.apiKeys.length === 1) {
				settings.activeApiKeyId = newKey.id;
			}
			return settings;
		});
	}

	/**
	 * 指定されたIDのAPIキーをリストから削除します。
	 */
	function deleteApiKey(id: string) {
		if (!confirm('このAPIキーを削除しますか？')) return;

		appSettings.update((settings) => {
			settings.apiKeys = settings.apiKeys.filter((key) => key.id !== id);
			// アクティブなキーが削除された場合、選択を解除するか、残りの最初のキーをアクティブにする
			if (settings.activeApiKeyId === id) {
				settings.activeApiKeyId = settings.apiKeys[0]?.id || null;
			}
			return settings;
		});
	}
</script>

<div class="flex h-screen flex-col p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			{$returnPath.label}
		</a>
	</div>

	<div class="space-y-6">
		<!-- APIキー設定 -->
		<div class="space-y-3">
			<h2 class="block text-lg font-medium">API Key</h2>

			<div class="space-y-2">
				{#if $appSettings.apiKeys?.length > 0}
					{#each $appSettings.apiKeys as apiKey, index (apiKey.id)}
						<div class="grid grid-cols-[auto_1fr_2fr_auto] items-center gap-x-3 rounded border p-2">
							<!-- 選択ラジオボタン -->
							<input
								type="radio"
								id={`key-select-${apiKey.id}`}
								name="api-key-select"
								class="h-4 w-4"
								bind:group={$appSettings.activeApiKeyId}
								value={apiKey.id}
								title="このキーをチャットで使用する"
							/>
							<!-- 名前入力欄 -->
							<input
								type="text"
								bind:value={apiKey.name}
								class="w-full rounded border p-2 text-sm"
								placeholder={`キー ${index + 1} の名前`}
							/>
							<!-- キー入力欄 -->
							<input
								type="password"
								bind:value={apiKey.key}
								class="w-full rounded border p-2 text-sm"
								placeholder="sk-..."
							/>
							<!-- 削除ボタン -->
							<button
								on:click={() => deleteApiKey(apiKey.id)}
								class="flex-shrink-0 rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
								title="このキーを削除する"
							>
								削除
							</button>
						</div>
					{/each}
				{:else}
					<p class="px-2 text-sm text-gray-500">
						保存されているAPIキーはありません。「+ APIを追加」ボタンで追加してください。
					</p>
				{/if}
			</div>

			<!-- 追加ボタン -->
			<button
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				on:click={addApiKey}
			>
				+ APIを追加
			</button>

			<p class="text-sm text-gray-600">
				APIキーはブラウザ内にのみ保存されます。入力や変更は自動的に保存されます。
			</p>
		</div>

		<!-- AIモデル選択 -->
		<div class="space-y-2">
			<label for="model-select" class="block font-medium">AIモデル</label>
			<select
				id="model-select"
				bind:value={$appSettings.model}
				class="w-full max-w-md rounded border bg-white p-2"
			>
				{#each availableModels as model}
					<option value={model}>{model}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-600">
				チャットで使用するAIモデルを選択します。選択は自動的に保存されます。
			</p>
		</div>

		<div class="space-y-2">
			<label for="system-prompt" class="block font-medium">システムプロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="system-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.systemPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="system-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="system-prompt"
				rows="4"
				bind:value={$appSettings.systemPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="AIの役割や応答のトーンなどを設定します..."
				disabled={!$appSettings.systemPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				（未実装）AIへの基本的な指示を定義します。入力すると自動的に保存されます。
			</p>
		</div>

		<div class="space-y-2">
			<label for="dummy-user-prompt" class="block font-medium">ダミーユーザープロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="dummy-user-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.dummyUserPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="dummy-user-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="dummy-user-prompt"
				rows="2"
				bind:value={$appSettings.dummyUserPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="直近のダミー入力..."
				disabled={!$appSettings.dummyUserPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				ユーザー入力の直後に続く、ユーザー側の直近の発言としてダミーで入力します。入力すると自動的に保存されます。
			</p>
		</div>
	</div>
</div>
