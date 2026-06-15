function detectFlowPage() {
  const bodyText = document.body?.innerText?.toLowerCase() || "";

  return {
    url: location.href,
    title: document.title,
    detectedAt: new Date().toISOString(),
    isFlowPage: location.hostname === "labs.google" && location.pathname.includes("/fx"),
    hasPromptWorkspace:
      bodyText.includes("prompt") || bodyText.includes("generate") || bodyText.includes("flow")
  };
}

chrome.runtime.sendMessage({
  type: "FLOW_PAGE_STATE",
  payload: detectFlowPage()
});
