<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';

	// Components
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
</script>

<div class="flex h-screen flex-col bg-app-bg p-4 text-gray-200">
	<!-- ヘッダー -->
	<header class="mb-4 flex flex-shrink-0 items-center justify-between">
		<h1 class="text-lg font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			{$returnPath.label}
		</a>
	</header>

	<!-- コンテンツエリア -->
	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl space-y-8 pb-20">
			<ApiKeySettings />
			<AiModelSettings />
			<SystemPromptSettings />
			<UiSettings />
			<ApiErrorSettings />
			<AssistSettings />
			<GenerationSettings />
			<TokenUsageSettings />
			<AccountSettings />
		</div>
	</div>
</div>
