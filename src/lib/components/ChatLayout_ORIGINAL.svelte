<!-- src/lib/components/ChatLayout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { createEventDispatcher, tick } from 'svelte';

	export let userInput: string;
	export let isLoading: boolean;
	export let handleSubmit: () => Promise<void>;
	export let sessionTitle: string;

	const sessionId = $page.params.id;
	const dispatch = createEventDispatcher();

	let isEditing = false;
	let editingTitle = '';
	let inputElement: HTMLInputElement;

	let textareaElement: HTMLTextAreaElement;

	/**
	 * 邱ｨ髮・Δ繝ｼ繝峨ｒ髢句ｧ九☆繧・	 */
	async function startEditing() {
		isEditing = true;
		editingTitle = sessionTitle;
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	/**
	 * 繧ｿ繧､繝医Ν縺ｮ螟画峩繧剃ｿ晏ｭ倥☆繧・	 */
	function saveTitle() {
		if (editingTitle.trim() && editingTitle !== sessionTitle) {
			dispatch('updateTitle', { title: editingTitle.trim() });
		}
		isEditing = false;
	}

	/**
	 * 繧ｭ繝ｼ繝懊・繝画桃菴懊ｒ繝上Φ繝峨Ν縺吶ｋ
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveTitle();
		} else if (event.key === 'Escape') {
			isEditing = false;
		}
	}

	/**
	 * Textarea縺ｮ鬮倥＆繧貞・螳ｹ縺ｫ蠢懊§縺ｦ閾ｪ蜍戊ｪｿ謨ｴ縺吶ｋ
	 */
	function adjustTextareaHeight(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		target.style.height = 'auto'; // 鬮倥＆繧剃ｸ譌ｦ繝ｪ繧ｻ繝・ヨ
		target.style.height = `${target.scrollHeight}px`; // 蜀・ｮｹ縺ｫ蜷医ｏ縺帙◆鬮倥＆縺ｫ蜀崎ｨｭ螳・	}

	$: if (userInput === '' && textareaElement) {
		textareaElement.style.height = 'auto';
	}
</script>

<div class="flex h-[100dvh] flex-col overflow-hidden p-4">
	<div class="flex-shrink-0">
		<!-- 繝倥ャ繝繝ｼ繝悶Ο繝・け  -->
		<div class="mb-4 flex items-center gap-4">
			<a
				href="{base}/"
				class="flex-shrink-0 rounded bg-stone-200 px-3 py-2 text-sm font-semibold text-text-off hover:bg-bg-hover"
			>
				螻･豁ｴ縺ｫ謌ｻ繧・
			</a>
			<div class="min-w-0 flex-1">
				{#if isEditing}
					<input
						bind:this={inputElement}
						type="text"
						bind:value={editingTitle}
						on:keydown={handleKeyDown}
						on:blur={saveTitle}
						class="text-m w-full rounded-md border border-stone-400 bg-white px-2 py-1 font-bold text-text-off focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				{:else}
					<button
						type="button"
						on:click={startEditing}
						class="text-m w-full truncate rounded-md px-2 py-1 text-left font-bold text-text-off hover:bg-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
						title={sessionTitle}
					>
						{sessionTitle}
					</button>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-4">
				<a
					href="{base}/settings?from=session/{sessionId}"
					class="rounded bg-stone-200 px-3 py-2 text-sm font-semibold text-text-off hover:bg-bg-hover"
				>
					繧｢繝励Μ險ｭ螳・
				</a>
				<a
					href="{base}/session/{sessionId}/settings"
					class="rounded bg-stone-200 px-3 py-2 text-sm font-semibold text-text-off hover:bg-bg-hover"
				>
					繧ｻ繝・す繝ｧ繝ｳ險ｭ螳・
				</a>
			</div>
		</div>
	</div>

	<!-- 繧ｳ繝ｳ繝・Φ繝・｡ｨ遉ｺ繧ｨ繝ｪ繧｢-->
	<div class="mb-4 flex-1 overflow-y-auto">
		<slot />
	</div>

	<div class="flex-shrink-0 px-4">
		<form on:submit|preventDefault class="flex items-end gap-2">
			<textarea
				bind:this={textareaElement}
				rows="1"
				bind:value={userInput}
				on:input={adjustTextareaHeight}
				placeholder={isLoading ? '騾∽ｿ｡荳ｭ...' : '繝｡繝・そ繝ｼ繧ｸ繧貞・蜉・..'}
				class="input flex-1 rounded-lg border border-stone-600 text-text-main"
			></textarea>
			<button
				type="button"
				on:click={handleSubmit}
				class="btn btn-primary"
				disabled={isLoading || !userInput.trim()}
			>
				{#if isLoading}
					騾∽ｿ｡荳ｭ...
				{:else}
					騾∽ｿ｡
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.input {
		padding: 0.5rem;
	}
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	.btn-primary {
		background-color: #133a0e;
		color: white;
	}
	.btn-primary:not(:disabled):hover {
		background-color: #0d2c0b;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	textarea.input {
		resize: none;
		overflow-y: auto;
		line-height: 1.5;
		max-height: 25vh;
	}
</style>
