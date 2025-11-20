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
	style:background-color={selected ? '#262626' : 'transparent'}
	style:border-color={selected ? '#737373' : '#525252'}
	class:hover:bg-[#262626]={!selected}
	on:click={onClick}
>
	<h3 class="mb-1 font-bold" style:color={selected ? '#e5e5e5' : '#d4d4d4'}>{title}</h3>
	<p class="text-xs" style:color={selected ? '#a3a3a3' : '#737373'}>{description}</p>
</div>
