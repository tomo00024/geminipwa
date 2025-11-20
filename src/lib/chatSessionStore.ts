// src/lib/chatSessionStore.ts

import { writable, get } from 'svelte/store';
import type { Session, Log, ImageCorrectionRule } from '$lib/types';
import { sessions, appSettings } from '$lib/stores';

import { getActiveImageRule, correctImageMarkdownInText } from '$lib/utils/imageUrlCorrector';

export interface ChatSessionState {
	session: Session | null;
	editingMessageId: string | null;
	editingText: string;
	displayableLogs: Log[];
}

// _applyImageCorrection 関数を全面的に書き換える
function _applyImageCorrection(originalText: string): string {
	// 新しい統括関数に処理を完全に委譲する
	return correctImageMarkdownInText(originalText);
}

function createChatSessionStore() {
	// --- Helper Function ---
	function computeDisplayableLogs(session: Session): Log[] {
		if (!session.logs.length) return [];

		const allLogs = session.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));
		const filteredLogs: Log[] = [];

		let currentLog = allLogs.find((log) => log.parentId === null);
		if (!currentLog) return [];

		while (currentLog) {
			filteredLogs.push(currentLog);
			if (currentLog.activeChildId) {
				const nextLog = logMap.get(currentLog.activeChildId);
				if (nextLog) {
					currentLog = nextLog;
				} else {
					break;
				}
			} else {
				break;
			}
		}

		if (session.hideFirstUserMessage) {
			if (filteredLogs.length > 0 && filteredLogs[0].speaker === 'user') {
				return filteredLogs.slice(1);
			}
		}
		return filteredLogs;
	}

	const { subscribe, update, set } = writable<ChatSessionState>({
		session: null,
		editingMessageId: null,
		editingText: '',
		displayableLogs: []
	});

	// --- Public Methods (コンポーネントから呼び出す関数) ---
	return {
		subscribe,
		init: (sessionData: Session) => {
			set({
				session: sessionData,
				editingMessageId: null,
				editingText: '',
				displayableLogs: computeDisplayableLogs(sessionData)
			});
		},

		startEditing: (messageId: string) => {
			update((state) => {
				if (!state.session) return state;
				const message = state.session.logs.find((m) => m.id === messageId);
				if (message) {
					state.editingMessageId = messageId;
					state.editingText = message.text;
				}
				return state;
			});
		},

		cancelEditing: () => {
			update((state) => {
				state.editingMessageId = null;
				state.editingText = '';
				return state;
			});
		},

		saveEditing: () => {
			const state = get(chatSessionStore);
			if (!state.session || !state.editingMessageId) return;

			const logToEdit = state.session.logs.find((log) => log.id === state.editingMessageId);

			let finalText = state.editingText;

			// 編集対象がAIのメッセージである場合のみ、処理を検討
			if (logToEdit && logToEdit.speaker !== 'user') {
				// 最新の設定値を取得
				const settings = get(appSettings);

				// 「URLの自動補正」がONの場合のみ、補正処理を実行
				if (settings.assist.autoCorrectUrl) {
					console.log('[Edit Save] URL auto-correction is enabled. Applying correction...');
					finalText = _applyImageCorrection(state.editingText);
				} else {
					console.log('[Edit Save] URL auto-correction is disabled.');
				}
			}

			const newLogs = state.session.logs.map((log) => {
				if (log.id === state.editingMessageId) {
					return { ...log, text: finalText };
				}
				return log;
			});

			sessions.update((allSessions) => {
				return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
			});

			update((s) => {
				s.editingMessageId = null;
				s.editingText = '';
				if (s.session) {
					s.session.logs = newLogs;
					s.displayableLogs = computeDisplayableLogs(s.session);
				}
				return s;
			});
		},

		/**
		 * @param messageId 削除対象のメッセージID
		 */
		deleteSingleMessage: (messageId: string) => {
			const state = get(chatSessionStore);
			if (!state.session) return;

			const logMap = new Map(state.session.logs.map((log) => [log.id, log]));
			const targetLog = logMap.get(messageId);

			if (!targetLog) return;

			if (targetLog.parentId) {
				const siblings = state.session.logs.filter((log) => log.parentId === targetLog.parentId);
				if (siblings.length > 1) {
					alert('このメッセージには他の返信ブランチが存在するため、単体では削除できません。');
					return;
				}
			}

			const children = state.session.logs.filter((log) => log.parentId === messageId);

			if (children.length > 1) {
				alert('このメッセージからは会話が分岐しているため、削除できません。');
				return;
			}

			if (!confirm('このメッセージを削除しますか？ 後続の会話は自動的に接続されます。')) return;

			let newLogs = [...state.session.logs];

			const parentLog = targetLog.parentId ? logMap.get(targetLog.parentId) : null;
			const childLog = children.length === 1 ? children[0] : null;

			if (parentLog) {
				if (parentLog.activeChildId === targetLog.id) {
					newLogs = newLogs.map((log) =>
						log.id === parentLog.id ? { ...log, activeChildId: childLog ? childLog.id : null } : log
					);
				}
			}
			if (childLog) {
				newLogs = newLogs.map((log) =>
					log.id === childLog.id ? { ...log, parentId: parentLog ? parentLog.id : null } : log
				);
			}

			newLogs = newLogs.filter((log) => log.id !== messageId);

			sessions.update((allSessions) => {
				return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
			});
			update((s) => {
				if (s.session) {
					s.session.logs = newLogs;
					s.displayableLogs = computeDisplayableLogs(s.session);
				}
				return s;
			});
		},

		updateEditingText: (text: string) => {
			update((state) => {
				state.editingText = text;
				return state;
			});
		},

		switchActiveResponse: (parentId: string, newActiveChildId: string) => {
			update((state) => {
				if (!state.session) return state;
				const newLogs = state.session.logs.map((log) => {
					if (log.id === parentId) {
						return { ...log, activeChildId: newActiveChildId };
					}
					return log;
				});
				sessions.update((allSessions) => {
					return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
				});
				if (state.session) {
					state.session.logs = newLogs;
					state.displayableLogs = computeDisplayableLogs(state.session);
				}
				return state;
			});
		}
	};
}

export const chatSessionStore = createChatSessionStore();
