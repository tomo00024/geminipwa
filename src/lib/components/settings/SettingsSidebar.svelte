<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let categories: { id: string; label: string }[] = [];
	export let activeCategory: string;

	const dispatch = createEventDispatcher();

	function selectCategory(id: string) {
		dispatch('select', id);
	}
</script>

<nav class="flex flex-col space-y-1 p-2">
	{#each categories as category}
		<button
			type="button"
			on:click={() => selectCategory(category.id)}
			class="w-full rounded-md px-4 py-3 text-left text-sm font-medium focus:outline-none {activeCategory ===
			category.id
				? 'bg-stone-200 text-text-off'
				: 'text-text-off hover:bg-white/10 hover:text-white'}"
			style="-webkit-tap-highlight-color: transparent;"
		>
			{category.label}
		</button>
	{/each}
</nav>
