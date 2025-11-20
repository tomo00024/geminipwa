<script lang="ts">
	export let size: 'sm' | 'md' | 'lg' = 'sm';
	export let color = 'bg-gray-400';

	const sizeClasses: Record<string, string> = {
		sm: 'w-1.5 h-1.5',
		md: 'w-2 h-2',
		lg: 'w-3 h-3'
	};

	const gapClasses: Record<string, string> = {
		sm: 'gap-1',
		md: 'gap-1.5',
		lg: 'gap-2'
	};
</script>

<div class="flex items-center {gapClasses[size]}">
	<div
		class="{sizeClasses[size]} {color} animate-pulse-fast rounded-[1px]"
		style="animation-delay: 0ms;"
	></div>
	<div
		class="{sizeClasses[size]} {color} animate-pulse-fast rounded-[1px]"
		style="animation-delay: 150ms;"
	></div>
	<div
		class="{sizeClasses[size]} {color} animate-pulse-fast rounded-[1px]"
		style="animation-delay: 300ms;"
	></div>
</div>

<style>
	.animate-pulse-fast {
		animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse-fast {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
