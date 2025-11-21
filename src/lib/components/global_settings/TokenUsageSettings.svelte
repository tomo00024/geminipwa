<script lang="ts">
	import { tokenUsageHistory } from '$lib/stores';
	import Select from '$lib/components/ui/Select.svelte';
	import Section from '$lib/components/ui/Section.svelte';

	// 日付の降順でソート
	$: sortedHistory = [...$tokenUsageHistory].sort((a, b) => {
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	// 期間選択
	let selectedRange: 'day' | 'week' | 'month' | 'year' = 'day';

	$: latestDateStr =
		sortedHistory.length > 0 ? sortedHistory[0].date : new Date().toISOString().split('T')[0];

	$: rangeStats = (() => {
		const latestDate = new Date(latestDateStr);
		let startDate = new Date(latestDate);
		let daysToSubtract = 0;

		switch (selectedRange) {
			case 'day':
				daysToSubtract = 0;
				break;
			case 'week':
				daysToSubtract = 6; // 当日含む7日間
				break;
			case 'month':
				daysToSubtract = 29; // 当日含む30日間
				break;
			case 'year':
				daysToSubtract = 364; // 当日含む365日間
				break;
		}

		startDate.setDate(latestDate.getDate() - daysToSubtract);

		// 日付比較用のヘルパー (YYYY-MM-DD形式の文字列で比較)
		const startStr = startDate.toISOString().split('T')[0];
		const endStr = latestDateStr;

		const filtered = sortedHistory.filter((entry) => {
			return entry.date >= startStr && entry.date <= endStr;
		});

		const total = filtered.reduce((acc, entry) => acc + entry.totalTokens, 0);
		const input = filtered.reduce((acc, entry) => acc + entry.inputTokens, 0);
		const output = filtered.reduce((acc, entry) => acc + entry.outputTokens, 0);
		const thinking = filtered.reduce((acc, entry) => acc + (entry.thinkingTokens || 0), 0);

		// キャッシュトークン数 (実際のデータを使用)
		const cached = filtered.reduce((acc, entry) => acc + (entry.cachedTokens || 0), 0);

		// 【計算】キャッシュ率（ゼロ除算対策）
		const cacheRate = input > 0 ? (cached / input) * 100 : 0;

		return {
			total,
			input,
			output,
			thinking,
			cached,
			cacheRate,
			periodLabel: selectedRange === 'day' ? endStr : `${startStr} 〜 ${endStr}`
		};
	})();
</script>

<Section title="トークン使用履歴">
	<div class="space-y-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-sm text-text-off">Gemini APIのトークン使用量を確認できます。（目安）</p>
			<div class="w-full sm:w-48">
				<Select bind:value={selectedRange}>
					<option value="day">本日 (Day)</option>
					<option value="week">直近1週間 (Week)</option>
					<option value="month">直近1ヶ月 (Month)</option>
					<option value="year">直近1年 (Year)</option>
				</Select>
			</div>
		</div>

		<!-- 集計カード -->
		{#if rangeStats}
			<div class="rounded-lg border border-stone-600 bg-transparent p-4">
				<div class="mb-3 text-sm font-medium text-text-off">
					集計期間: <span class="text-text-main">{rangeStats.periodLabel}</span>
				</div>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<div class="rounded-md bg-stone-700/50 p-3">
						<div class="text-xs text-blue-400">合計トークン</div>
						<div class="mt-1 text-xl font-bold text-blue-300">
							{rangeStats.total.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-stone-700/30 p-3">
						<div class="text-xs text-text-off">入力 (Prompt)</div>
						<div class="mt-1 text-lg font-semibold text-text-main">
							{rangeStats.input.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-stone-700/30 p-3">
						<div class="text-xs text-text-off">出力 (Response)</div>
						<div class="mt-1 text-lg font-semibold text-text-main">
							{rangeStats.output.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-stone-700/30 p-3">
						<div class="text-xs text-text-off">思考 (Thinking)</div>
						<div class="mt-1 text-lg font-semibold text-text-main">
							{rangeStats.thinking.toLocaleString()}
						</div>
					</div>
					<div class="relative overflow-hidden rounded-md bg-stone-700/30 p-3">
						<div class="text-xs text-emerald-400">キャッシュ (Cached)</div>
						<div class="mt-1 text-lg font-semibold text-emerald-300">
							{rangeStats.cached.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-stone-700/30 p-3">
						<div class="text-xs text-emerald-400">キャッシュ率 (Rate)</div>
						<div class="mt-1 text-lg font-semibold text-emerald-300">
							{rangeStats.cacheRate.toFixed(1)}<span class="ml-0.5 text-sm">%</span>
						</div>
					</div>
				</div>
			</div>
		{/if}
		<div class="rounded-lg border border-stone-600 bg-transparent p-4 text-xs text-text-off">
			<p class="mb-1">
				<span class="font-bold text-emerald-400">● コスト仕様:</span>
				暗黙的キャッシュ（Implicit Caching）は一定長以上の共通プレフィックス（2.5Pro: 4096+）に対し自動適用され、入力コストを大幅に削減（約90%OFF）しますがストレージ料金は発生しません。
			</p>
			<p class="mb-1">
				<span class="font-bold text-yellow-400">● レート制限:</span>
				課金計算とは異なり、APIレート制限（TPM/RPM）およびコンテキストウィンドウの算出においてはキャッシュ分は減免されず、履歴を含めた全トークン数がカウント対象となります。
			</p>
			<p>
				<span class="font-bold text-blue-400">● 運用戦略:</span>
				有料枠では履歴を積み上げてキャッシュ率を高める運用がコスト最適解となりますが、無料枠では制限回避のため要約等による物理的なトークン削減が必須となります。
			</p>
		</div>
	</div>
</Section>
