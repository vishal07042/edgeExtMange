// Add this at the top of content.js
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

// Block page immediately before content loads
function blockPage() {
	document.documentElement.innerHTML = `
		<html>
			<head>
				<style>
					body {
						background: #f5f5f5;
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
						display: flex;
						justify-content: center;
						align-items: center;
						height: 100vh;
						margin: 0;
					}
					.block-message {
						background: white;
						padding: 20px 40px;
						border-radius: 8px;
						box-shadow: 0 2px 10px rgba(0,0,0,0.1);
						text-align: center;
						color: #666;
					}
				</style>
			</head>
			<body>
				<div class="block-message">This page has been blocked for security reasons.</div>
			</body>
		</html>
	`;

	// Stop any further page loading
	window.stop();

	// Notify background script
	chrome.runtime.sendMessage({
		action: "blockedContentFound",
		url: window.location.href,
	});
}

// Check if URL contains blocked patterns
function shouldBlockPage() {
	const url = window.location.href.toLowerCase();
	const path = window.location.pathname.toLowerCase();

	// Block if URL contains certain patterns
	if (
		path.includes("/detail/") &&
		(path.includes("manager") ||
			path.includes("control") ||
			path.includes("admin") ||
			path.includes("ext"))
	) {
		return true;
	}

	// Block if page content contains blocked keywords
	const pageContent = document.documentElement.innerHTML.toLowerCase();
	return BLOCKED_KEYWORDS.some((keyword) =>
		pageContent.includes(keyword.toLowerCase())
	);
}

// Run blocking check immediately
if (
	window.location.href.includes("chromewebstore.google.com") ||
	window.location.href.includes("chrome.google.com/webstore")
) {
	if (shouldBlockPage()) {
		blockPage();
	}

	// Also observe DOM changes for dynamic content
	const observer = new MutationObserver(() => {
		if (shouldBlockPage()) {
			blockPage();
		}
	});

	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
	});
}

// Check if we're on the extensions page
if (window.location.pathname.startsWith("/extensions")) {
	// Create and inject our UI
	const container = document.createElement("div");
	container.id = "extension-manager";
	document.body.innerHTML = ""; // Clear existing content
	document.body.appendChild(container);

	// Add styles
	const styles = document.createElement("style");
	styles.textContent = `
    :root {
      --bg-primary: #f5f5f7;
      --bg-card: #ffffff;
      --text-primary: #1a1a1a;
      --text-secondary: #666;
      --border-color: #f0f0f0;
      --shadow-color: rgba(0,0,0,0.05);
      --shadow-hover: rgba(0,0,0,0.1);
      --toggle-bg: #e4e4e4;
      --toggle-active: #34C759;
      --button-primary: #007AFF;
      --button-danger: #FF3B30;
      --button-hover-primary: #0066CC;
      --button-hover-danger: #D70015;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1a1a1a;
        --bg-card: #2c2c2e;
        --text-primary: #ffffff;
        --text-secondary: #98989f;
        --border-color: #3a3a3c;
        --shadow-color: rgba(0,0,0,0.3);
        --shadow-hover: rgba(0,0,0,0.4);
        --toggle-bg: #3a3a3c;
        --toggle-active: #30D158;
        --button-primary: #0A84FF;
        --button-danger: #FF453A;
        --button-hover-primary: #0071E3;
        --button-hover-danger: #D70015;
      }
    }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: var(--text-primary);
    }
    #extension-manager {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      color: var(--text-primary);
      font-weight: 600;
    }
    .view-toggle {
      display: flex;
      gap: 20px;
    }
    .view-toggle a {
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 16px;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .view-toggle a:hover {
      background: var(--border-color);
    }
    .view-toggle a.active {
      background: var(--button-primary);
      color: white;
    }
    .extension-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }
    .extension-card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px var(--shadow-color);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .extension-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--shadow-hover);
    }
    .extension-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      gap: 16px;
    }
    .extension-header h3 {
      margin: 0;
      font-size: 18px;
      color: var(--text-primary);
      font-weight: 600;
    }
    .extension-description {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
      min-height: 42px;
    }
    .extension-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--toggle-bg);
      transition: .3s;
      border-radius: 28px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
      box-shadow: 0 2px 4px var(--shadow-color);
    }
    input:checked + .slider {
      background-color: var(--toggle-active);
    }
    input:checked + .slider:before {
      transform: translateX(22px);
    }
    .action-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .hide-btn {
      background: var(--button-primary);
      color: white;
    }
    .hide-btn:hover {
      background: var(--button-hover-primary);
    }
    .unhide-btn {
      background: var(--button-danger);
      color: white;
    }
    .unhide-btn:hover {
      background: var(--button-hover-danger);
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }
    .empty-state h2 {
      margin: 0 0 16px 0;
      color: var(--text-primary);
    }
    .empty-state p {
      margin: 0;
      font-size: 16px;
    }
  `;
	document.head.appendChild(styles);

	const isHiddenView = window.location.pathname === "/extensions/hidden";

	// Create UI structure
	container.innerHTML = `
    <div class="header">
      <h1>Extension Manager</h1>
      <div class="view-toggle">
        <a href="/extensions" class="${
			!isHiddenView ? "active" : ""
		}">Active Extensions</a>
        <a href="/extensions/hidden" class="${
			isHiddenView ? "active" : ""
		}">Hidden Extensions</a>
      </div>
    </div>
    <div class="extension-list"></div>
  `;

	const extensionList = container.querySelector(".extension-list");

	// Function to render extensions
	function renderExtensions(extensions) {
		if (extensions.length === 0) {
			extensionList.innerHTML = `
        <div class="empty-state">
          <h2>${
				isHiddenView ? "No Hidden Extensions" : "No Active Extensions"
			}</h2>
          <p>${
				isHiddenView
					? "You haven't hidden any extensions yet."
					: "No active extensions found."
			}</p>
        </div>
      `;
			return;
		}

		extensionList.innerHTML = extensions
			.map(
				(ext) => `
        <div class="extension-card">
          <div class="extension-header">
            <h3>${ext.name}</h3>
          </div>
          <div class="extension-description">
            ${ext.description || "No description available"}
          </div>
          <div class="extension-controls">
            <label class="toggle-switch" title="${
				ext.enabled ? "Enabled" : "Disabled"
			}">
              <input type="checkbox" ${ext.enabled ? "checked" : ""} data-id="${
					ext.id
				}">
              <span class="slider"></span>
            </label>
            <button class="action-button ${
				isHiddenView ? "unhide-btn" : "hide-btn"
			}" data-id="${ext.id}">
              ${isHiddenView ? "Restore" : "Hide"}
            </button>
          </div>
        </div>
      `
			)
			.join("");

		// Add event listeners
		extensionList
			.querySelectorAll('input[type="checkbox"]')
			.forEach((toggle) => {
				toggle.addEventListener("change", (e) => {
					const extensionId = e.target.dataset.id;
					chrome.runtime.sendMessage({
						action: "toggleExtension",
						extensionId: extensionId,
						enabled: e.target.checked,
					});
				});
			});

		extensionList.querySelectorAll(".action-button").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const extensionId = e.target.dataset.id;
				const action = isHiddenView
					? "unhideExtension"
					: "hideExtension";
				chrome.runtime.sendMessage(
					{
						action: action,
						extensionId: extensionId,
					},
					() => {
						loadExtensions();
					}
				);
			});
		});
	}

	// Function to load extensions
	function loadExtensions() {
		const action = isHiddenView ? "getHiddenExtensions" : "getExtensions";
		chrome.runtime.sendMessage({ action: action }, (response) => {
			if (response && response.extensions) {
				renderExtensions(response.extensions);
			}
		});
	}

	// Initial load
	loadExtensions();
}
