<script lang="ts">
	import { appSettings, sessions } from '$lib/stores';
	import { onDestroy } from 'svelte';

	let timeoutId: NodeJS.Timeout | null = null;
	let lastSavedHash: string = '';
	let isBackingUp = false;

	// Simple hash function to detect changes
	function generateHash(data: any): string {
		return JSON.stringify(data).length.toString(); // Simplified for performance, can be improved
	}

	// Subscribe to sessions changes
	const unsubscribe = sessions.subscribe((currentSessions) => {
		const settings = $appSettings;

		// 1. Check if backup is enabled
		// We only check isEnabled. autoBackup flag is redundant or can be assumed true if enabled.
		if (!settings.backup?.isEnabled) {
			return;
		}

		// 2. Validate data
		if (!currentSessions || currentSessions.length === 0) {
			return;
		}

		// 3. Check if data actually changed
		const currentHash = generateHash(currentSessions);
		if (currentHash === lastSavedHash) {
			return;
		}

		// 4. Debounce backup
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			performAutoBackup(currentSessions, currentHash);
		}, 30000); // 30 seconds delay
	});

	async function performAutoBackup(currentSessions: any[], currentHash: string) {
		if (isBackingUp) return;
		isBackingUp = true;

		try {
			const response = await fetch('/api/backup/google-drive', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ sessions: currentSessions })
			});

			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					console.warn('[AutoBackup] Auth error, disabling auto-backup temporarily.');
					return;
				}
				throw new Error(`Backup failed with status: ${response.status}`);
			}

			const result = await response.json();

			// Update store with new timestamp
			appSettings.update((s) => ({
				...s,
				backup: {
					...s.backup,
					lastBackupAt: result.backupAt
				}
			}));

			lastSavedHash = currentHash;
			console.log('[AutoBackup] Backup successful at', result.backupAt);
		} catch (e) {
			console.error('[AutoBackup] Error:', e);
		} finally {
			isBackingUp = false;
		}
	}

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (timeoutId) clearTimeout(timeoutId);
	});
</script>

<!-- Headless component, no UI output -->
