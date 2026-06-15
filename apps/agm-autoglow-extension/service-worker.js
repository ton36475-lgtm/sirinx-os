chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FLOW_PAGE_STATE") {
    chrome.storage.local.set({ flowPageState: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
