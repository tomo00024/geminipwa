<!-- src/routes/settings/+page.svelte -->

<script lang="ts">
	import { base } from '$app/paths';
	// ★ 1. appSettings ストアをインポートします
	import { appSettings } from '$lib/stores';

	// onMountは不要になります。ストアが既にlocalStorageから値を読み込んでいます。

	function saveApiKey() {
		// ★ 2. ストアを更新することで、変更がアプリ全体に伝わります。
		//    bind:valueを使っているので、実際には入力と同時にストアは更新済みです。
		//    この関数は、ユーザーに保存を通知する役割を果たします。
		//    store.tsのsubscribeが自動でlocalStorageに保存します。
		alert('APIキーを保存しました！');
	}
</script>

<div class="p-4 max-w-2xl mx-auto">
	<!-- ▼▼▼ ここからヘッダーの修正 ▼▼▼ -->
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">アプリ設定</h1> <!-- ← タイトルを変更 -->
		<a
			href="{base}/"
			class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
		>
			履歴に戻る
		</a>
	</div>
	<!-- ▲▲▲ ここまでヘッダーの修正 ▲▲▲ -->

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