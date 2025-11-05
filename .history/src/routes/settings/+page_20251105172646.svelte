<!-- src/routes/settings/+page.svelte -->

<script lang="ts">
	import { base } from '$app/paths';
	// onMountは不要になるため削除
	// import { onMount } from 'svelte';
	
	// appSettingsストアをインポートします
	import { appSettings } from '$lib/stores';

	// apiKeyを管理するためのローカル変数は不要になります。
	// ストアの値を直接テンプレートで参照・更新します。

	// 「保存」ボタンが押された時にストアの値を更新します。
	// この関数は、入力内容をストアに反映させるために使用します。
	function saveApiKey() {
		// ストアが更新されると、store.tsのsubscribeロジックが自動的に走り、
		// localStorageに値が保存されます。
		// $appSettings.apiKey = $appSettings.apiKey; のように書いても更新がトリガーされます。
		// ここでは、明示的にアラートを表示する役割を維持します。
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
		<!--
			bind:valueでストアの値（$appSettings.apiKey）に直接バインドします。
			これにより、入力フィールドの変更が即座にストアに反映されます。
		-->
		<input
			id="api-key"
			type="password"
			bind:value={$appSettings.apiKey}
			class="w-full max-w-md p-2 border rounded"
			placeholder="sk-..."
		/>
		<p class="text-sm text-gray-600">APIキーはブラウザ内にのみ保存されます。</p>
	</div>

	<div class="mt-4">
		<!--
			入力値は既にストアにバインドされているため、このボタンは実質的に
			「保存しました」とユーザーに通知する役割になります。
			もし入力のたびに自動保存で良いなら、このボタン自体が不要になる可能性もあります。
		-->
		<button on:click={saveApiKey} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
			保存
		</button>
	</div>
	<div class="mt-8">
		<a href="{base}/" class="text-blue-500 hover:underline">&larr; 履歴画面に戻る</a>
	</div>
</div>