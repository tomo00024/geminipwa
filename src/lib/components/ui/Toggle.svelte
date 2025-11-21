<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';

	export let checked: boolean;
	export let label: string;
	export let id: string = '';
	export let disabled: boolean = false;
	export let onText: string = 'ON';
	export let offText: string = 'OFF';
	let className: string = '';
	export { className as class };

	const dispatch = createEventDispatcher();
	let mounted = false;

	onMount(() => {
		setTimeout(() => {
			mounted = true;
		}, 50);
	});

	function toggle() {
		if (!disabled) {
			checked = !checked;
			dispatch('change', { checked });
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="flex items-center space-x-3 {className}"
	class:cursor-pointer={!disabled}
	class:opacity-50={disabled}
	class:cursor-not-allowed={disabled}
	on:click={toggle}
>
	<button
		{id}
		type="button"
		role="switch"
		aria-checked={checked}
		{disabled}
		class="relative flex h-8 w-32 items-center rounded-full p-1 text-text-off focus:outline-none"
		style="background-color: var(--btn-secondary-bg); isolation: isolate; -webkit-tap-highlight-color: transparent; user-select: none;"
		tabindex="0"
	>
		<!-- Sliding Background Pill -->
		<div
			class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow transition-all duration-200 ease-in-out"
			style="background-color: #e5e5e5; left: {checked ? 'calc(50%)' : '4px'};"
		></div>

		<!-- OFF Segment -->
		<span
			class="relative z-10 w-1/2 text-center text-xs font-bold text-text-off transition-colors duration-200"
			class:text-text-main={!checked}
			class:text-text-off={checked}
		>
			{offText}
		</span>

		<!-- ON Segment -->
		<span
			class="relative z-10 w-1/2 text-center text-xs font-bold transition-colors duration-200"
			class:text-text-main={checked}
			class:text-text-off={!checked}
		>
			{onText}
		</span>
	</button>

	<span
		class="text-sm font-medium text-text-main"
		class:cursor-pointer={!disabled}
		class:text-text-disabled={disabled}
		class:text-text-off={disabled}
	>
		{label}
	</span>
</div>
