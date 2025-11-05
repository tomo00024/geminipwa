<!-- src/routes/settings/+page.svelte -->

<script lang="ts">
	import { base } from '$app/paths';
	// ★ 1. ストアと onMount をインポートします
	import { appSettings } from '$lib/stores';
	import { onMount } from 'svelte';

	// ★ 2. データを保持するためのローカル変数を再度用意します
	let apiKey = '';

	// ★ 3. ページ表示時に、ストアから最新の値を取得してローカル変数にセットします
	onMount(() => {
		// $appSettings を一度だけ参照して現在の値を取得します
		apiKey = $appSettings.apiKey;
	});

	// ★ 4. 「保存」ボタンが押された時に、ローカル変数の値をストアに反映させます
	function saveApiKey() {
		appSettings.update((currentSettings) => {
			// 現在のストアの値（currentSettings）を更新して返す
			return { ...currentSettings, apiKey: apiKey };
		});
		alert('APIキーを保存しました！');
	}
</script>

<div class="p-4 max-w-2xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">アプリ設定</h1>
		<a
			href="{base}/"
			class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
		>
			履歴に戻る
		</a>
	</div>

	<div class="space-y-2">
		<label for="api-key" class="block font-medium">API Key</label>
		<input
			id="api-key"
			type="password"
			bind:value={apiKey}
			class="w-full max-w-md p-2 border rounded"
			placeholder="sk-..."
		/>
		<p class="text-sm text-gray-600">APIキーはブラウザ内にのみ保存されます。</p>
	</div>

	<div class="mt-4">
		<button on:click={saveApiKey} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
			保存
		</button>
	</div>
	<div class="mt-8">
		<a href="{base}/" class="text-blue-500 hover:underline">&larr; 履歴画面に戻る</a>
	</div>
</div>