<!-- src/lib/components/global_settings/ApiKeySettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import { generateUUID } from '$lib/utils';
	import type { ApiKey } from '$lib/types';
	import Section from '$lib/components/ui/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

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

<Section title="API Key">
	<div class="space-y-3">
		{#if $appSettings.apiKeys?.length > 0}
			{#each $appSettings.apiKeys as apiKey, index (apiKey.id)}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="cursor-pointer rounded-lg border p-3 transition-all duration-200"
					style:background-color={$appSettings.activeApiKeyId === apiKey.id
						? '#262626'
						: 'transparent'}
					style:border-color={$appSettings.activeApiKeyId === apiKey.id ? '#737373' : '#525252'}
					on:click={() => ($appSettings.activeApiKeyId = apiKey.id)}
				>
					<div class="grid grid-cols-[auto_1fr_2fr_auto] items-center gap-3">
						<!-- Custom Radio/Check Indicator -->
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full border transition-all"
							style:border-color={$appSettings.activeApiKeyId === apiKey.id ? '#e5e5e5' : '#525252'}
							style:background-color={$appSettings.activeApiKeyId === apiKey.id
								? '#e5e5e5'
								: 'transparent'}
						>
							{#if $appSettings.activeApiKeyId === apiKey.id}
								<span class="text-xs font-bold" style:color="#171717">✓</span>
							{/if}
						</div>

						<Input
							id={`key-name-${apiKey.id}`}
							bind:value={apiKey.name}
							placeholder={`キー ${index + 1} の名前`}
							class="w-full"
						/>
						<Input
							id={`key-value-${apiKey.id}`}
							type="password"
							bind:value={apiKey.key}
							placeholder="sk-..."
							class="w-full"
						/><Button
							variant="danger"
							on:click={(e) => {
								e.stopPropagation();
								deleteApiKey(apiKey.id);
							}}
							title="このキーを削除する"
						>
							削除
						</Button>
					</div>
				</div>
			{/each}
		{:else}
			<p class="px-2 text-sm text-gray-400">
				保存されているAPIキーはありません。「+ APIを追加」ボタンで追加してください。
			</p>
		{/if}
	</div>
	<div>
		<Button on:click={addApiKey}>+ APIを追加</Button>
		<p class="mt-2 text-sm text-gray-400">
			APIキーはブラウザ内にのみ保存されます。入力や変更は自動的に保存されます。
		</p>
	</div>
</Section>
