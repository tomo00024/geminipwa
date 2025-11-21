<!-- src/lib/components/settings/ImportExportSettings.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	const BASE64_PREFIX = 'b64::';

	let inputText = '';
	let parseError = '';
	let copySuccess = false;

	// 入力内容を自動判別して検証する
	$: {
		if (inputText) {
			try {
				// Base64形式かプレフィックスで判定
				if (inputText.startsWith(BASE64_PREFIX)) {
					const base64Data = inputText.substring(BASE64_PREFIX.length);
					// Base64デコード -> URIデコード -> JSONパース
					const decodedJson = decodeURIComponent(
						atob(base64Data)
							.split('')
							.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
							.join('')
					);
					JSON.parse(decodedJson); // JSONとして有効かチェック
				} else {
					// 通常のJSONとしてパース
					JSON.parse(inputText);
				}
				parseError = ''; // 検証成功
			} catch (e) {
				parseError = '入力されたデータの形式が正しくありません。';
			}
		} else {
			parseError = ''; // 空の場合はエラーなし
		}
	}

	// エクスポートする設定オブジェクトを取得する共通関数
	function getSettingsToExport() {
		const session = $currentSession;
		if (!session) return null;

		return {
			featureSettings: session.featureSettings,
			viewMode: session.viewMode,
			gameViewSettings: session.gameViewSettings,
			customStatuses: session.customStatuses,
			triggers: session.triggers
		};
	}

	// 共通のコピー処理
	function copyToClipboard(text: string) {
		inputText = text;
		navigator.clipboard.writeText(text).then(() => {
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		});
	}

	// 「JSONで出力」ボタンの処理
	function exportAsJson() {
		const settings = getSettingsToExport();
		if (!settings) return;
		const settingsJson = JSON.stringify(settings, null, 2);
		copyToClipboard(settingsJson);
	}

	// 「難読化して出力」ボタンの処理
	function exportAsBase64() {
		const settings = getSettingsToExport();
		if (!settings) return;
		const settingsJson = JSON.stringify(settings, null, 2); // 整形は不要だが可読性のため残す
		// URIエンコード -> Base64エンコード
		const base64Data = btoa(
			encodeURIComponent(settingsJson).replace(/%([0-9A-F]{2})/g, (match, p1) =>
				String.fromCharCode(parseInt(p1, 16))
			)
		);
		copyToClipboard(BASE64_PREFIX + base64Data);
	}

	// 「設定を適用」ボタンの処理
	function importSettings() {
		if (parseError || !inputText) return;
		if (!confirm('現在の設定が上書きされます。よろしいですか？')) return;

		try {
			let newSettings;
			if (inputText.startsWith(BASE64_PREFIX)) {
				const base64Data = inputText.substring(BASE64_PREFIX.length);
				const decodedJson = decodeURIComponent(
					atob(base64Data)
						.split('')
						.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
						.join('')
				);
				newSettings = JSON.parse(decodedJson);
			} else {
				newSettings = JSON.parse(inputText);
			}

			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $sessionId);
				if (sessionToUpdate) {
					Object.assign(sessionToUpdate, newSettings);
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		} catch (e) {
			alert('設定の読み込み中にエラーが発生しました。');
			console.error(e);
		}
	}

	$: isApplyButtonDisabled = !!parseError || !inputText;
</script>

<Section title="設定のインポート/エクスポート">
	{#if parseError}
		<p class="text-sm text-red-500">{parseError}</p>
	{/if}
	<p class="text-sm text-text-off">
		現在のセッション設定を出力したり、テキストを貼り付けて設定を読み込んだりできます。
	</p>

	<Textarea
		rows={8}
		placeholder="設定データ（JSON または b64::で始まるBase64文字列）をここに貼り付けてください。"
		bind:value={inputText}
		class="font-mono text-xs"
	/>

	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-2">
			<Button on:click={exportAsJson}>JSONで出力</Button>
			<Button on:click={exportAsBase64}>難読化して出力</Button>
		</div>

		<div class="flex items-center gap-2">
			{#if copySuccess}
				<span class="text-sm text-green-400">クリップボードにコピーしました！</span>
			{/if}
			<Button on:click={importSettings} disabled={isApplyButtonDisabled}>設定を適用</Button>
		</div>
	</div>
</Section>
