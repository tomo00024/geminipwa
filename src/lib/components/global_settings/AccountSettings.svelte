<!-- src/lib/components/global_settings/AccountSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import Section from '$lib/components/ui/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { appSettings, sessions } from '$lib/stores';

	let isDeleting = false;
	let isBackingUp = false;
	let backupMessage = '';

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

	// 権限チェックのための派生状態
	$: scope = $page.data.session?.user?.scope || '';
	$: hasDriveScope = scope.includes('https://www.googleapis.com/auth/drive.file');
	$: isPermissionMissing = $appSettings.backup.isEnabled && !hasDriveScope;

	function handleReconnect() {
		const options = {
			callbackUrl: '/settings',
			redirect: true
		};
		const authParams = {
			scope: 'openid profile email https://www.googleapis.com/auth/drive.file',
			prompt: 'consent',
			access_type: 'offline',
			response_type: 'code'
		};
		signIn('google', options, authParams);
	}
</script>

<!-- アカウント連携 -->
<Section title="アカウント連携">
	{#if $page.data.session}
		<div class="space-y-3 text-sm">
			<p>
				✓ <span class="font-medium">{$page.data.session.user?.email}</span> としてログイン中
			</p>
			<Button on:click={() => signOut()}>ログアウト</Button>
		</div>
		<div class="space-y-3 border-t border-gray-600 pt-4">
			<h3 class="font-bold text-red-600">アカウントの削除 (退会)</h3>
			<p class="text-sm text-gray-400">
				アカウントを削除すると、サーバーにアップロードしたすべてのセッション履歴が完全に削除され、元に戻すことはできません。
			</p>
			<Button variant="danger" on:click={handleDeleteAccount} disabled={isDeleting}>
				{isDeleting ? '削除中...' : 'アカウントを完全に削除する'}
			</Button>
		</div>
	{:else}
		<div class="space-y-3">
			<Button variant="blue" on:click={() => signIn('google')}>Googleアカウントでログイン</Button>
			<p class="text-sm text-gray-400">
				ログインすると、セッション履歴をWeb上に公開して共有したり、Google
				Driveへ自動でバックアップしたりできるようになります。
			</p>
		</div>
	{/if}
</Section>

<!-- データ管理 -->
<Section title="データ管理">
	<!-- Google Drive 連携 -->
	<div class="space-y-2">
		<h3 class="font-bold">Google Drive 連携</h3>
		<Toggle
			id="drive-sync-enabled"
			disabled={!$page.data.session}
			label="Google Driveへの自動バックアップを有効にする"
			bind:checked={$appSettings.backup.isEnabled}
		/>

		{#if !$page.data.session}
			<p class="pl-6 text-sm text-gray-400">
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
				<Button size="sm" variant="secondary" onclick={handleReconnect}>
					権限を付与する (再接続)
				</Button>
			</div>
		{:else if $appSettings.backup.isEnabled}
			<div class="space-y-2 pl-6">
				<div class="text-sm text-gray-400">
					{#if $appSettings.backup.lastBackupAt}
						最終同期: {new Date($appSettings.backup.lastBackupAt).toLocaleString()}
					{:else}
						同期履歴なし
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<Button size="sm" onclick={handleBackupNow} disabled={isBackingUp}>
						{#if isBackingUp}
							同期中...
						{:else}
							今すぐ同期
						{/if}
					</Button>
					{#if backupMessage}
						<span class="text-sm text-green-500">{backupMessage}</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- 手動バックアップ -->
	<div class="space-y-2 border-t border-gray-600 pt-4">
		<h3 class="font-bold">手動バックアップ</h3>
		<div class="flex flex-wrap gap-2">
			<Button class="bg-green-200 text-green-800 hover:bg-green-300">
				セッション履歴をJSON出力
			</Button>
			<Button class="bg-green-200 text-green-800 hover:bg-green-300">
				セッション履歴をJSON読込
			</Button>
		</div>
		<p class="text-sm text-gray-400">セッション履歴をJSONファイルで手動でバックアップします。</p>
	</div>
</Section>

<!-- 破壊的変更 -->
<section class="space-y-4 border-t border-red-200 pt-4">
	<h2 class="text-lg font-bold text-red-600">破壊的変更</h2>
	<div class="flex flex-wrap gap-2">
		<Button variant="danger">セッション履歴の破棄</Button>
		<Button variant="danger">すべて破棄して初期化</Button>
	</div>
</section>
