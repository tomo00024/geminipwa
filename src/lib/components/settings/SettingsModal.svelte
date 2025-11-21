<script lang="ts">
	import { ui } from '$lib/stores/ui';
	import SettingsSidebar from '$lib/components/settings/SettingsSidebar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

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

	const categories = [
		{ id: 'general', label: 'General' },
		{ id: 'api_model', label: 'API & Model' },
		{ id: 'generation', label: 'Generation' },
		{ id: 'interface', label: 'Interface' },
		{ id: 'usage', label: 'Usage' }
	];

	let activeCategory = 'general';

	function handleCategorySelect(event: CustomEvent<string>) {
		activeCategory = event.detail;
	}

	function close() {
		ui.closeSettingsModal();
	}
</script>

<Modal
	isOpen={$ui.isSettingsModalOpen}
	title="アプリ設定"
	size="xl"
	noPadding={true}
	disableAnimation={true}
	on:close={close}
>
	<div class="flex h-full flex-col sm:flex-row">
		<!-- Sidebar (Desktop) -->
		<aside class="hidden w-64 flex-shrink-0 flex-col border-r border-stone-700 bg-main-bg sm:flex">
			<div class="flex-1 overflow-y-auto py-4">
				<SettingsSidebar {categories} {activeCategory} on:select={handleCategorySelect} />
			</div>
		</aside>

		<!-- Mobile Header & Nav -->
		<div class="flex flex-col border-b border-stone-700 bg-main-bg sm:hidden">
			<div class="overflow-x-auto px-2 py-2">
				<div class="flex min-w-max space-x-2">
					{#each categories as category}
						<button
							type="button"
							on:click={() => (activeCategory = category.id)}
							class="rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none {activeCategory ===
							category.id
								? 'bg-stone-200 text-text-off'
								: 'bg-white/5 text-text-off hover:bg-white/10'}"
							style="-webkit-tap-highlight-color: transparent;"
						>
							{category.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<main class="relative flex-1 overflow-y-auto bg-main-bg">
			<div class="mx-auto max-w-3xl space-y-8 p-6 pb-20 sm:p-8">
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
</Modal>
