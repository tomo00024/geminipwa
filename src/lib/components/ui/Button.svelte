<script lang="ts">
	export let variant: 'primary' | 'danger' | 'menu' = 'primary';
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let disabled: boolean = false;
	export let title: string = '';
	let className: string = '';
	export { className as class };

	const baseStyles =
		'cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 font-semibold';

	const variants = {
		primary:
			'rounded border-none bg-btn-primary-bg px-3 py-2 text-text-main hover:bg-btn-primary-hover-bg text-sm',
		danger: 'rounded bg-red-200 px-3 py-2 text-red-800 hover:bg-red-300 text-sm',
		menu: 'rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-bg-hover text-sm whitespace-nowrap'
	};
</script>

<button
	{type}
	class="{baseStyles} {variants[variant]} {className}"
	{disabled}
	{title}
	on:click
	{...$$restProps}
>
	<slot />
</button>
