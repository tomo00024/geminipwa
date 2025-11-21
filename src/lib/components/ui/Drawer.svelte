<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	export let isOpen = false;
	export let title = '';
	export let width = 'max-w-md'; // default width class

	const dispatch = createEventDispatcher();

	function close() {
		isOpen = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			close();
		}
	}

	// Prevent body scroll when drawer is open
	$: if (typeof document !== 'undefined') {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
		transition:fade={{ duration: 200 }}
		on:click={close}
		role="button"
		tabindex="0"
		on:keydown={(e) => e.key === 'Enter' && close()}
		aria-label="Close drawer"
	></div>

	<!-- Drawer Panel -->
	<div
		class="fixed inset-y-0 right-0 z-50 flex h-full w-full {width} flex-col bg-app-bg shadow-xl"
		transition:fly={{ x: 300, duration: 300, easing: cubicOut }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="drawer-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-stone-700 px-4 py-2">
			<h2 id="drawer-title" class="text-lg font-semibold text-text-main">{title}</h2>
			<button
				on:click={close}
				class="rounded-md p-1 text-text-muted hover:bg-stone-800 hover:text-stone-100 focus:ring-2 focus:ring-stone-500 focus:outline-none"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4">
			<slot />
		</div>
	</div>
{/if}
