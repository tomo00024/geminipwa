<script lang="ts">
	export let title: string;
	let className: string = '';
	export { className as class };
</script>

<section class="mb-8">
	<h2 class="text-lg font-bold text-text-main">{title}</h2>
	<div class="mt-4 space-y-4 text-text-off">
		<slot />
	</div>
</section>
