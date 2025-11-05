<!-- src/routes/settings/+page.svelte -->


<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	let apiKey = '';
	const storageKey = 'app_settings';

	// ページが読み込まれた時にlocalStorageからデータを読み込む
	onMount(() => {
		const storedSettings = localStorage.getItem(storageKey);
		if (storedSettings) {
			const settings = JSON.parse(storedSettings);
			apiKey = settings.apiKey || '';
		}
	});

	// 「保存」ボタンが押された時にlocalStorageにデータを保存する
	function saveApiKey() {
		const settings = { apiKey: apiKey };
		localStorage.setItem(storageKey, JSON.stringify(settings));
		alert('APIキーを保存しました！');
	}
</script>

<div class="p-4 max-w-2xl mx-auto">
	<h1 class="text-2xl font-bold mb-4">設定画面</h1>

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