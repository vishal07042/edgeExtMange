// Store hidden extensions in chrome.storage
let hiddenExtensions = new Set();

// Add these constants at the top of the file
const BLOCKED_KEYWORDS = [
	"ext",
	"extension",
	"manager",
	"extension manager",
	"ext manager",
	"extension control",
	"extension management",
	"control hub",
	"管理", // Chinese for "manage"
	"扩展", // Chinese for "extension"
	"расширение", // Russian for "extension"
	"verwaltung", // German for "management"
];

const BLOCKED_URL_PATTERNS = [
	"detail/ext-manager",
	"detail/extension-manager",
	"search/ext",
	"category/extensions",
	"collection/extensions",
	"collection/ext",
	"tag/extension",
	"tag/ext",
];

// Update the isExtensionsPage function to include Chrome Web Store check with keywords
function isExtensionsPage(url) {
	if (!url) return false;

	const lowerUrl = url.toLowerCase();

	// Check for extensions page
	if (
		lowerUrl.startsWith("edge://extensions") ||
		lowerUrl.startsWith("chrome://extensions") ||
		lowerUrl.includes("edge://extensions") ||
		lowerUrl.includes("chrome://extensions")
	) {
		return true;
	}

	// Check for Chrome Web Store URLs
	if (
		lowerUrl.includes("chromewebstore.google.com") ||
		lowerUrl.includes("chrome.google.com/webstore")
	) {
		// Check for specific blocked URL patterns
		if (
			BLOCKED_URL_PATTERNS.some((pattern) => lowerUrl.includes(pattern))
		) {
			return true;
		}

		// Check for blocked keywords in the URL
		if (
			BLOCKED_KEYWORDS.some((keyword) =>
				lowerUrl.includes(keyword.toLowerCase())
			)
		) {
			return true;
		}

		// Additional check for extension manager related IDs
		if (
			lowerUrl.includes("/detail/") &&
			(lowerUrl.includes("manager") ||
				lowerUrl.includes("control") ||
				lowerUrl.includes("admin") ||
				lowerUrl.includes("ext"))
		) {
			return true;
		}
	}

	return false;
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
			{ hostSuffix: "chromewebstore.google.com" },
			{ hostSuffix: "chrome.google.com" },
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

		case "blockedContentFound":
			// Optionally redirect to blank page if content is blocked
			chrome.tabs.update(sender.tab.id, { url: "about:blank" });
			return true;
	}
});

// Listen for storage changes to keep the Set in sync
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === "local" && changes.hiddenExtensions) {
		hiddenExtensions = new Set(changes.hiddenExtensions.newValue || []);
	}
});
