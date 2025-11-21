<script lang="ts">
	import { appSettings } from '$lib/stores';
	import { availableModels } from '$lib/utils';
	import { getAvailableGeminiModels } from '$lib/geminiService';
	import Section from '$lib/components/ui/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let isFetchingModels = false;
	let modelFetchError = '';

	$: selectableModels =
		$appSettings.availableModelList && $appSettings.availableModelList.length > 0
			? $appSettings.availableModelList.map((m) =>
					typeof m === 'string' ? m.replace(/^models\//, '') : String(m)
				)
			: availableModels;

	async function refreshModelList() {
		const activeKeyId = $appSettings.activeApiKeyId;
		const activeKey = $appSettings.apiKeys.find((k) => k.id === activeKeyId)?.key;

		if (!activeKey) {
			alert('有効なAPIキーが選択されていません。');
			return;
		}

		isFetchingModels = true;
		modelFetchError = '';

		try {
			const rawModels = await getAvailableGeminiModels(activeKey);
			console.log('【DEBUG】API生レスポンス:', rawModels);

			if (rawModels.length > 0) {
				// models/ を削除して整形
				const cleanModels = rawModels.map((m) => m.replace(/^models\//, ''));

				appSettings.update((settings) => ({
					...settings,
					availableModelList: cleanModels
				}));

				// ▼ もし現在のモデルが新しいリストになければ、リストの先頭を自動選択する
				// これがないと、Selectが「空」に見えることがあります
				const currentModel = $appSettings.model;
				if (!cleanModels.includes(currentModel)) {
					console.log('【DEBUG】現在のモデルがリストにないため、先頭を選択します');
					appSettings.update((s) => ({ ...s, model: cleanModels[0] }));
				}

				alert(`モデルリストを更新しました。件数: ${cleanModels.length}`);
			} else {
				modelFetchError = '利用可能なGeminiモデルが見つかりませんでした。';
			}
		} catch (e) {
			modelFetchError = 'モデルの取得に失敗しました。';
			console.error(e);
		} finally {
			isFetchingModels = false;
		}
	}
</script>

<Section title="AIモデル">
	<div class="flex items-end gap-3">
		<Select
			id="model-select"
			bind:value={$appSettings.model}
			options={selectableModels}
			class="max-w-md min-w-0 flex-1"
		/>

		<Button
			variant="primary"
			on:click={refreshModelList}
			disabled={isFetchingModels || !$appSettings.activeApiKeyId}
			title="Googleから最新のモデル一覧を取得します"
			class="flex-shrink-0"
		>
			{#if isFetchingModels}
				取得中...
			{:else}
				更新
			{/if}
		</Button>
	</div>

	{#if modelFetchError}
		<p class="text-sm text-red-500">{modelFetchError}</p>
	{/if}

	<p class="text-sm text-text-off">
		チャットで使用するAIモデルを選択します。更新ボタンでGoogleから最新のモデル一覧を取得・保存できます。
	</p>
</Section>
