<script lang="ts">
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import Section from '$lib/components/ui/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { appSettings, sessions } from '$lib/stores';
	import BackupHistoryModal from '$lib/components/backup/BackupHistoryModal.svelte';

	let isDeleting = false;
	let isBackingUp = false;
	let backupMessage = '';
	let isRestoreModalOpen = false;
	let fileInput: HTMLInputElement;

	async function handleDeleteAccount() {
		if (
			!confirm(
				'本当にアカウントを削除しますか？\nこの操作は取り消せません。\nサーバー上のすべてのデータが削除されます。'
			)
		) {
			return;
		}

		isDeleting = true;
		try {
			const response = await fetch('/api/account', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				alert(`エラーが発生しました: ${data.message || '不明なエラー'}`);
				return;
			}

			alert('アカウントが削除されました。');
			await signOut();
		} catch (e) {
			console.error(e);
			alert('通信エラーが発生しました。');
		} finally {
			isDeleting = false;
		}
	}

	async function handleBackupNow() {
		if (!$sessions || $sessions.length === 0) {
			alert('バックアップするセッションデータがありません。');
			return;
		}

		isBackingUp = true;
		backupMessage = 'バックアップ中...';

		try {
			const response = await fetch('/api/backup/google-drive', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ sessions: $sessions })
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'バックアップに失敗しました');
			}

			const result = await response.json();

			appSettings.update((s) => ({
				...s,
				backup: {
					...s.backup,
					lastBackupAt: result.backupAt
				}
			}));

			backupMessage = 'バックアップ完了';
			setTimeout(() => (backupMessage = ''), 3000);
		} catch (e: any) {
			console.error(e);
			alert(`エラー: ${e.message}`);
			backupMessage = '';
		} finally {
			isBackingUp = false;
		}
	}

	// Manual JSON Export
	function handleExportJson() {
		const dataStr = JSON.stringify($sessions, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `gemini-sessions-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Manual JSON Import
	function handleImportJson(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				const importedSessions = JSON.parse(content);
				if (!Array.isArray(importedSessions)) throw new Error('Invalid format');

				if (
					confirm(
						`ファイルから ${importedSessions.length} 件のセッションを読み込みますか？\n既存の同IDのセッションは上書きされます。`
					)
				) {
					sessions.update((current) => {
						const newSessions = [...current];
						importedSessions.forEach((imported) => {
							const index = newSessions.findIndex((s) => s.id === imported.id);
							if (index >= 0) {
								newSessions[index] = imported;
							} else {
								newSessions.push(imported);
							}
						});
						return newSessions.sort(
							(a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
						);
					});
					alert('読み込みが完了しました。');
				}
			} catch (err) {
				console.error(err);
				alert('ファイルの読み込みに失敗しました。形式が正しいか確認してください。');
			}
			// Reset input
			target.value = '';
		};
		reader.readAsText(file);
	}

	// 権限チェックのための派生状態
	$: scope = $page.data.session?.user?.scope || '';
	$: hasDriveScope = scope.includes('https://www.googleapis.com/auth/drive.file');
	$: isPermissionMissing = $appSettings.backup.isEnabled && !hasDriveScope;

	function handleReconnect() {
		const authParams = {
			scope: 'openid profile email https://www.googleapis.com/auth/drive.file',
			prompt: 'consent',
			access_type: 'offline',
			response_type: 'code'
		};
		signIn('google', { callbackUrl: '/settings', redirect: true }, authParams);
	}
	async function handleDestroySessions() {
		if (!confirm('本当にすべてのセッション履歴を削除しますか？\nこの操作は取り消せません。')) {
			return;
		}

		if (!confirm('本当によろしいですか？\nすべてのチャット履歴が失われます。')) {
			return;
		}

		sessions.set([]);
		alert('すべてのセッション履歴を削除しました。');
	}

	async function handleResetAll() {
		if (
			!confirm(
				'本当にすべてのデータを破棄して初期化しますか？\n設定、セッション履歴、すべてが削除されます。'
			)
		) {
			return;
		}

		if (
			!confirm(
				'この操作は絶対に取り消せません。\nアプリケーションは初期状態に戻ります。\n実行しますか？'
			)
		) {
			return;
		}

		localStorage.clear();
		// 念のためストアもリセット
		sessions.set([]);

		alert('初期化しました。アプリケーションを再読み込みします。');
		window.location.reload();
	}
	let isDestructiveOpen = false;
</script>

<BackupHistoryModal bind:isOpen={isRestoreModalOpen} />

<!-- アカウント連携 -->
<Section title="アカウント連携">
	{#if $page.data.session}
		<div class="space-y-3 text-sm">
			<p>
				✓ <span class="font-medium">{$page.data.session.user?.email}</span> としてログイン中
			</p>
			<Button onclick={() => signOut()}>ログアウト</Button>
		</div>
		<div class="space-y-3 border-t border-stone-600 pt-4">
			<h3 class="font-bold text-red-600">アカウントの削除 (退会)</h3>
			<p class="text-sm text-text-off">
				アカウントを削除すると、サーバーにアップロードしたすべてのセッション履歴が完全に削除され、元に戻すことはできません。
			</p>
			<Button variant="danger" onclick={handleDeleteAccount} disabled={isDeleting}>
				{isDeleting ? '削除中...' : 'アカウントを完全に削除する'}
			</Button>
		</div>
	{:else}
		<div class="space-y-3">
			<Button variant="primary" onclick={() => signIn('google')}>Googleアカウントでログイン</Button>
			<p class="text-sm text-text-off">
				ログインすると、セッション履歴をWeb上に公開して共有したり、Google
				Driveへ自動でバックアップしたりできるようになります。
			</p>
		</div>
	{/if}
</Section>

<!-- データ管理 -->
<Section title="データ管理">
	<!-- Google Drive 連携 -->
	<div class="space-y-2 text-text-main">
		<h3 class="font-bold">Google Drive バックアップ</h3>
		<Toggle
			id="drive-sync-enabled"
			disabled={!$page.data.session}
			label="Google Driveへの自動バックアップを有効にする"
			bind:checked={$appSettings.backup.isEnabled}
		/>

		{#if !$page.data.session}
			<p class="pl-6 text-sm text-text-off">
				この機能を利用するには、まずGoogleアカウントでログインしてください。
			</p>
		{:else if isPermissionMissing}
			<div
				class="rounded border border-yellow-200 bg-yellow-50 p-3 pl-6 dark:border-yellow-800 dark:bg-yellow-900/20"
			>
				<p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
					⚠ バックアップに必要な権限が不足しています
				</p>
				<p class="mt-1 mb-2 text-xs text-yellow-700 dark:text-yellow-300">
					Google Driveへのアクセスを許可してください。
				</p>
				<Button size="sm" variant="primary" onclick={handleReconnect}>
					権限を付与する (再接続)
				</Button>
			</div>
		{:else if $appSettings.backup.isEnabled}
			<div class="space-y-2 pl-6">
				<div class="text-sm text-text-off">
					{#if $appSettings.backup.lastBackupAt}
						最終同期: {new Date($appSettings.backup.lastBackupAt).toLocaleString()}
					{:else}
						同期履歴なし
					{/if}
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Button size="sm" onclick={handleBackupNow} disabled={isBackingUp}>
						{#if isBackingUp}
							同期中...
						{:else}
							今すぐバックアップ
						{/if}
					</Button>
					<Button size="sm" variant="primary" onclick={() => (isRestoreModalOpen = true)}>
						バックアップから復元...
					</Button>
					{#if backupMessage}
						<span class="text-sm text-green-500">{backupMessage}</span>
					{/if}
				</div>
				<p class="text-xs text-text-off">
					※ 1日1つのバックアップファイル（gemini-backup-YYYY-MM-DD.json）が作成されます。<br />
					※ 自動バックアップも「今すぐバックアップ」も、その日のファイルを上書き更新します。
				</p>
			</div>
		{/if}
	</div>

	<!-- 手動バックアップ -->
	<div class="space-y-2 border-t border-stone-600 pt-4">
		<h3 class="font-bold">手動バックアップ (JSON)</h3>
		<div class="flex flex-wrap gap-2">
			<Button variant="primary" onclick={handleExportJson}>セッション履歴をJSON出力</Button>
			<Button variant="primary" onclick={() => fileInput.click()}>セッション履歴をJSON読込</Button>
			<input
				type="file"
				accept=".json"
				class="hidden"
				bind:this={fileInput}
				onchange={handleImportJson}
			/>
		</div>
		<p class="text-sm text-text-off">
			セッション履歴をJSONファイルで手動でバックアップ・復元します。
		</p>
	</div>
</Section>

<!-- 破壊的変更 -->
<section class="space-y-4 border-t border-red-200 pt-4">
	<button
		class="flex w-full items-center justify-between text-left"
		onclick={() => (isDestructiveOpen = !isDestructiveOpen)}
	>
		<h2 class="text-lg font-bold text-red-600">破壊的変更</h2>
		<span
			class="text-red-600 transition-transform duration-200"
			class:rotate-180={isDestructiveOpen}
		>
			▼
		</span>
	</button>

	{#if isDestructiveOpen}
		<div class="flex flex-wrap gap-2">
			<Button variant="danger" onclick={handleDestroySessions}>セッション履歴の破棄</Button>
			<Button variant="danger" onclick={handleResetAll}>すべて破棄して初期化</Button>
		</div>
	{/if}
</section>
