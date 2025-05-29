// Store hidden extensions in chrome.storage
let hiddenExtensions = new Set();

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
