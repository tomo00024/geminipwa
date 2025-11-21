<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	export let isOpen = false;
	export let title = '';
	export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
	export let closeOnOutsideClick = true;
	export let noPadding = false;
	export let disableAnimation = false;

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			close();
		}
	}

	// Prevent body scroll when modal is open
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

	// Size classes
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-5xl',
		full: 'max-w-full h-full sm:h-auto sm:max-h-[90vh]'
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-4"
		transition:fade={{ duration: disableAnimation ? 0 : 200 }}
		on:click={closeOnOutsideClick ? close : null}
	>
		<!-- Modal Window -->
		<!-- 
            Mobile: Fixed full screen (inset-0), no rounded corners, no border.
            Desktop (sm+): Rounded corners, shadow-2xl, no border, max-height limit.
        -->
		<div
			class="flex h-full w-full flex-col overflow-hidden bg-main-bg shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl {sizeClasses[
				size
			]}"
			transition:scale={{
				start: disableAnimation ? 1 : 0.95,
				duration: disableAnimation ? 0 : 200,
				easing: cubicOut
			}}
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<!-- Header -->
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-stone-700 px-4 py-2"
			>
				<h2 id="modal-title" class="text-lg font-semibold text-text-main">{title}</h2>
				<div class="flex items-center gap-2">
					<slot name="header-extra" />
					<button
						on:click={close}
						class="rounded-md p-1 text-text-off hover:bg-bg-hover hover:text-white focus:outline-none"
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
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto {noPadding ? '' : 'p-4 sm:p-6'}">
				<slot />
			</div>

			<!-- Footer (Optional) -->
			{#if $$slots.footer}
				<div
					class="flex flex-shrink-0 items-center justify-end gap-3 border-t border-stone-700/50 bg-stone-900/30 px-4 py-2 sm:px-6"
				>
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}
