<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';

	// Components
	import SettingsSidebar from '$lib/components/settings/SettingsSidebar.svelte';
	import ApiKeySettings from '$lib/components/global_settings/ApiKeySettings.svelte';
	import AiModelSettings from '$lib/components/global_settings/AiModelSettings.svelte';
	import SystemPromptSettings from '$lib/components/global_settings/SystemPromptSettings.svelte';
	import UiSettings from '$lib/components/global_settings/UiSettings.svelte';
	import ApiErrorSettings from '$lib/components/global_settings/ApiErrorSettings.svelte';
	import AssistSettings from '$lib/components/global_settings/AssistSettings.svelte';
	import GenerationSettings from '$lib/components/global_settings/GenerationSettings.svelte';
	import TokenUsageSettings from '$lib/components/global_settings/TokenUsageSettings.svelte';
	import AccountSettings from '$lib/components/global_settings/AccountSettings.svelte';

	const returnPath = derived(page, ($page) => {
		const from = $page.url.searchParams.get('from');
		if (from && from.startsWith('session/')) {
			return {
				href: `${base}/${from}`,
				label: 'セッション画面'
			};
		}
		return {
			href: `${base}/`,
			label: '履歴画面'
		};
	});

	const categories = [
		{ id: 'general', label: 'General (一般)' },
		{ id: 'api_model', label: 'API & Model' },
		{ id: 'generation', label: 'Generation (生成)' },
		{ id: 'interface', label: 'Interface (表示)' },
		{ id: 'usage', label: 'Usage (使用状況)' }
	];

	let activeCategory = 'general';

	function handleCategorySelect(event: CustomEvent<string>) {
		activeCategory = event.detail;
	}
</script>

<div class="flex h-screen flex-col bg-app-bg text-gray-200">
	<!-- ヘッダー -->
	<header class="flex flex-shrink-0 items-center justify-between border-b border-gray-700 p-4">
		<h1 class="text-lg font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			{$returnPath.label}
		</a>
	</header>

	<!-- コンテンツエリア (2カラムレイアウト) -->
	<div class="flex flex-1 overflow-hidden">
		<!-- サイドバー (デスクトップ: 左側固定, モバイル: 上部に表示するか、あるいはレスポンシブ対応が必要だが一旦固定幅で) -->
		<aside
			class="hidden w-64 flex-shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-900/50 md:block"
		>
			<SettingsSidebar {categories} {activeCategory} on:select={handleCategorySelect} />
		</aside>

		<!-- モバイル用ナビゲーション (画面幅が狭い時のみ表示) -->
		<div class="w-full overflow-x-auto border-b border-gray-700 bg-gray-900/50 md:hidden">
			<div class="flex min-w-max p-2">
				{#each categories as category}
					<button
						type="button"
						on:click={() => (activeCategory = category.id)}
						class="mr-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 {activeCategory ===
						category.id
							? 'bg-blue-600 text-white'
							: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
					>
						{category.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- メインコンテンツ -->
		<main class="flex-1 overflow-y-auto p-4 md:p-8">
			<div class="mx-auto max-w-3xl space-y-8 pb-20">
				{#if activeCategory === 'general'}
					<AccountSettings />
				{:else if activeCategory === 'api_model'}
					<ApiKeySettings />
					<AiModelSettings />
					<ApiErrorSettings />
				{:else if activeCategory === 'generation'}
					<SystemPromptSettings />
					<GenerationSettings />
					<AssistSettings />
				{:else if activeCategory === 'interface'}
					<UiSettings />
				{:else if activeCategory === 'usage'}
					<TokenUsageSettings />
				{/if}
			</div>
		</main>
	</div>
</div>
