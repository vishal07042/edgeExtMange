// Store hidden extensions in chrome.storage
let hiddenExtensions = new Set();

function isExtensionsPage(url) {
	return (
		url &&
		(url.startsWith("edge://extensions") ||
			url.startsWith("chrome://extensions"))
	);
}

// Block access to extensions page using webNavigation
chrome.webNavigation.onBeforeNavigate.addListener(
	async (details) => {
		if (isExtensionsPage(details.url)) {
			try {
				await chrome.tabs.update(details.tabId, { url: "about:blank" });
			} catch (error) {
				console.error("Error redirecting from extensions page:", error);
			}
		}
	},
	{
		url: [
			{ urlPrefix: "edge://extensions" },
			{ urlPrefix: "chrome://extensions" },
		],
	}
);

// Backup blocking using tabs API
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.url && isExtensionsPage(changeInfo.url)) {
		try {
			await chrome.tabs.update(tabId, { url: "about:blank" });
		} catch (error) {
			console.error("Error redirecting from extensions page:", error);
		}
	}
});

// Block when a new tab is created with extensions URL
chrome.tabs.onCreated.addListener(async (tab) => {
	if (tab.pendingUrl && isExtensionsPage(tab.pendingUrl)) {
		try {
			await chrome.tabs.update(tab.id, { url: "about:blank" });
		} catch (error) {
			console.error("Error redirecting from extensions page:", error);
		}
	}
});

// Initialize the extension state
async function initializeState() {
	try {
		const result = await chrome.storage.local.get(["hiddenExtensions"]);
		if (result.hiddenExtensions) {
			hiddenExtensions = new Set(result.hiddenExtensions);
		}
	} catch (error) {
		console.error("Error loading hidden extensions:", error);
	}
}

// Initialize state when the extension starts
initializeState();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.action) {
		case "getExtensions":
			chrome.management.getAll((extensions) => {
				const filteredExtensions = extensions.filter(
					(ext) => !hiddenExtensions.has(ext.id)
				);
				sendResponse({ extensions: filteredExtensions });
			});
			return true;

		case "toggleExtension":
			chrome.management.setEnabled(
				request.extensionId,
				request.enabled,
				() => {
					sendResponse({ success: true });
				}
			);
			return true;

		case "hideExtension":
			hiddenExtensions.add(request.extensionId);
			chrome.storage.local.set(
				{
					hiddenExtensions: Array.from(hiddenExtensions),
				},
				() => {
					sendResponse({ success: true });
				}
			);
			return true;

		case "unhideExtension":
			hiddenExtensions.delete(request.extensionId);
			chrome.storage.local.set(
				{
					hiddenExtensions: Array.from(hiddenExtensions),
				},
				() => {
					sendResponse({ success: true });
				}
			);
			return true;

		case "getHiddenExtensions":
			chrome.management.getAll((extensions) => {
				const hiddenExts = extensions.filter((ext) =>
					hiddenExtensions.has(ext.id)
				);
				sendResponse({ extensions: hiddenExts });
			});
			return true;
	}
});

// Listen for storage changes to keep the Set in sync
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === "local" && changes.hiddenExtensions) {
		hiddenExtensions = new Set(changes.hiddenExtensions.newValue || []);
	}
});
