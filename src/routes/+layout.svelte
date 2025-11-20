<!-- src/routes/+layout.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import BackupManager from '$lib/components/BackupManager.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Gemini Novel Tool</title>
</svelte:head>

<BackupManager />

{@render children()}
