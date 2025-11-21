<script lang="ts">
	export let title: string;
	export let description: string;
	export let selected: boolean = false;
	export let onClick: () => void;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="cursor-pointer rounded-lg border p-4 transition-all duration-200"
	style:background-color={selected ? 'var(--btn-primary-bg)' : 'transparent'}
	style:border-color={selected ? '#737373' : '#525252'}
	class:hover:bg-[#262626]={!selected}
	on:click={onClick}
>
	<h3 class="mb-1 font-bold" style:color={selected ? 'var(--text-main)' : 'var(--text-main)'}>
		{title}
	</h3>
	<p class="text-xs" style:color={selected ? 'var(--text-off)' : 'var(--text-off)'}>
		{description}
	</p>
</div>
