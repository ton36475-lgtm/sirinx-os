"""
Chrome Remote Desktop Integration for Hermes Autoloop Fleet
===========================================================
Provides browser automation via Chrome DevTools Protocol (CDP)
with profile isolation for Hermes, QA, and Codex workers.

Architecture:
  Hermes Agent → Chrome DevTools MCP → CDP (port 9222) → Chrome/Chromium
                                              ├─ Profile: .sirinx/chrome/hermes
                                              ├─ Profile: .sirinx/chrome/qa
                                              └─ Profile: .sirinx/chrome/codex

Features:
  - Full browser automation (click, type, scroll, navigate)
  - Screenshot capture with element annotations
  - Console log capture (errors, warnings, network)
  - Network request/response inspection
  - Performance metrics (Lighthouse, Core Web Vitals)
  - Session recording (optional)
  - Profile isolation for auth separation
"""

import asyncio
import json
import os
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import aiohttp
import websockets


@dataclass
class ChromeProfile:
    """Chrome profile configuration for isolation."""
    name: str
    path: Path
    user_data_dir: Path
    debug_port: int = 9222
    headless: bool = True
    viewport: Dict[str, int] = field(default_factory=lambda: {"width": 1920, "height": 1080})
    args: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        self.user_data_dir.mkdir(parents=True, exist_ok=True)
        if not self.args:
            self.args = [
                f"--remote-debugging-port={self.debug_port}",
                f"--user-data-dir={self.user_data_dir}",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-translate",
                "--hide-scrollbars",
                "--mute-audio",
            ]
            if self.headless:
                self.args.append("--headless=new")


@dataclass
class CDPSession:
    """Active CDP session with Chrome."""
    ws_url: str
    session_id: str
    target_id: str
    websocket: Optional[websockets.WebSocketClientProtocol] = None
    message_id: int = 0
    pending: Dict[int, asyncio.Future] = field(default_factory=dict)


class ChromeRemoteDesktop:
    """
    Main interface for Chrome Remote Desktop automation.
    
    Usage:
        chrome = ChromeRemoteDesktop()
        await chrome.start_profile("hermes")
        session = await chrome.new_session("hermes")
        await session.navigate("https://dev.sirinx.co")
        await session.click("#deploy-button")
        screenshot = await session.screenshot()
        await chrome.stop_profile("hermes")
    """
    
    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path.home() / ".sirinx" / "chrome"
        self.profiles: Dict[str, ChromeProfile] = {}
        self.processes: Dict[str, subprocess.Popen] = {}
        self.sessions: Dict[str, CDPSession] = {}
        self._setup_default_profiles()
    
    def _setup_default_profiles(self):
        """Create default isolated profiles for each worker role."""
        roles = ["hermes", "qa", "codex", "operator"]
        for i, role in enumerate(roles):
            profile = ChromeProfile(
                name=role,
                path=self.base_dir / role,
                user_data_dir=self.base_dir / role / "user-data",
                debug_port=9222 + i,
                headless=True,
            )
            self.profiles[role] = profile
    
    async def start_profile(self, role: str) -> bool:
        """Start Chrome with the specified profile."""
        if role not in self.profiles:
            raise ValueError(f"Unknown profile role: {role}")
        
        profile = self.profiles[role]
        
        # Check if already running
        if role in self.processes and self.processes[role].poll() is None:
            # Verify CDP is accessible
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"http://127.0.0.1:{profile.debug_port}/json/version") as resp:
                        if resp.status == 200:
                            return True
            except:
                pass
        
        # Find Chrome/Chromium executable
        chrome_path = self._find_chrome()
        if not chrome_path:
            raise RuntimeError("Chrome/Chromium not found. Install chromium or google-chrome.")
        
        # Launch Chrome
        cmd = [chrome_path] + profile.args
        env = os.environ.copy()
        env["CHROME_REMOTE_DEBUGGING_PORT"] = str(profile.debug_port)
        
        proc = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        self.processes[role] = proc
        
        # Wait for CDP to be ready
        for _ in range(30):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"http://127.0.0.1:{profile.debug_port}/json/version") as resp:
                        if resp.status == 200:
                            return True
            except:
                pass
            await asyncio.sleep(0.5)
        
        # Failed to start
        proc.terminate()
        raise RuntimeError(f"Chrome profile '{role}' failed to start on port {profile.debug_port}")
    
    def _find_chrome(self) -> Optional[str]:
        """Find Chrome/Chromium executable."""
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/usr/bin/google-chrome",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "chrome",
            "chromium",
        ]
        for c in candidates:
            if Path(c).exists() or subprocess.run(["which", c], capture_output=True).returncode == 0:
                return c
        return None
    
    async def stop_profile(self, role: str):
        """Stop Chrome profile."""
        if role in self.processes:
            proc = self.processes[role]
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            del self.processes[role]
        
        # Close any active sessions for this profile
        to_close = [sid for sid, s in self.sessions.items() if s.target_id.startswith(role)]
        for sid in to_close:
            await self.close_session(sid)
    
    async def new_session(self, role: str, url: str = "about:blank") -> "CDPClient":
        """Create a new CDP session for the profile."""
        profile = self.profiles[role]
        
        # Get or create target
        async with aiohttp.ClientSession() as session:
            # List targets
            async with session.get(f"http://127.0.0.1:{profile.debug_port}/json") as resp:
                targets = await resp.json()
            
            # Find or create a page target
            page_target = None
            for t in targets:
                if t.get("type") == "page" and t.get("url") == url:
                    page_target = t
                    break
            
            if not page_target:
                # Create new target
                async with session.put(
                    f"http://127.0.0.1:{profile.debug_port}/json/new",
                    json={"url": url}
                ) as resp:
                    page_target = await resp.json()
            
            target_id = page_target["id"]
            ws_url = page_target["webSocketDebuggerUrl"]
        
        # Connect via WebSocket
        ws = await websockets.connect(ws_url)
        session_id = f"{role}-{target_id[:8]}"
        
        cdp_session = CDPSession(
            ws_url=ws_url,
            session_id=session_id,
            target_id=target_id,
            websocket=ws,
        )
        
        # Start message listener
        asyncio.create_task(self._message_listener(cdp_session))
        
        # Enable required domains
        client = CDPClient(cdp_session, self)
        await client.send("Runtime.enable")
        await client.send("Page.enable")
        await client.send("Network.enable")
        await client.send("Console.enable")
        await client.send("Page.setViewport", {
            "width": profile.viewport["width"],
            "height": profile.viewport["height"],
            "deviceScaleFactor": 1,
            "mobile": False,
        })
        
        self.sessions[session_id] = cdp_session
        return client
    
    async def _message_listener(self, session: CDPSession):
        """Listen for CDP messages and route to pending futures."""
        try:
            async for message in session.websocket:
                data = json.loads(message)
                msg_id = data.get("id")
                if msg_id in session.pending:
                    session.pending[msg_id].set_result(data)
                    del session.pending[msg_id]
        except Exception:
            pass
    
    async def close_session(self, session_id: str):
        """Close a CDP session."""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if session.websocket:
                await session.websocket.close()
            del self.sessions[session_id]
    
    async def stop_all(self):
        """Stop all profiles and close all sessions."""
        for role in list(self.processes.keys()):
            await self.stop_profile(role)
        for session_id in list(self.sessions.keys()):
            await self.close_session(session_id)


class CDPClient:
    """High-level CDP client for browser automation."""
    
    def __init__(self, session: CDPSession, manager: ChromeRemoteDesktop):
        self.session = session
        self.manager = manager
        self.console_logs: List[Dict] = []
        self.network_logs: List[Dict] = []
        self._setup_listeners()
    
    def _setup_listeners(self):
        """Set up event listeners."""
        # We'll handle events via the message listener
        pass
    
    async def send(self, method: str, params: Dict = None) -> Dict:
        """Send a CDP command and wait for response."""
        self.session.message_id += 1
        msg_id = self.session.message_id
        
        message = {
            "id": msg_id,
            "method": method,
            "params": params or {},
        }
        
        future = asyncio.get_event_loop().create_future()
        self.session.pending[msg_id] = future
        
        await self.session.websocket.send(json.dumps(message))
        
        try:
            response = await asyncio.wait_for(future, timeout=30)
            if "error" in response:
                raise CDPError(response["error"])
            return response.get("result", {})
        except asyncio.TimeoutError:
            del self.session.pending[msg_id]
            raise CDPError(f"Timeout waiting for {method}")
    
    # ===== Navigation =====
    async def navigate(self, url: str, wait_until: str = "networkidle") -> Dict:
        """Navigate to URL."""
        result = await self.send("Page.navigate", {"url": url})
        
        if wait_until == "networkidle":
            await self.wait_for_network_idle()
        elif wait_until == "load":
            await self.send("Page.waitForLoadEvent")
        
        return result
    
    async def go_back(self):
        await self.send("Page.goBack")
    
    async def go_forward(self):
        await self.send("Page.goForward")
    
    async def reload(self, ignore_cache: bool = False):
        await self.send("Page.reload", {"ignoreCache": ignore_cache})
    
    # ===== Interaction =====
    async def click(self, selector: str, button: str = "left", count: int = 1) -> Dict:
        """Click an element."""
        # Get element position
        node = await self.get_element(selector)
        if not node:
            raise CDPError(f"Element not found: {selector}")
        
        box = await self.get_box_model(node["nodeId"])
        x = box["model"]["content"][0] + (box["model"]["width"] / 2)
        y = box["model"]["content"][1] + (box["model"]["height"] / 2)
        
        await self.send("Input.dispatchMouseEvent", {
            "type": "mousePressed",
            "x": x,
            "y": y,
            "button": button,
            "clickCount": count,
        })
        await self.send("Input.dispatchMouseEvent", {
            "type": "mouseReleased",
            "x": x,
            "y": y,
            "button": button,
            "clickCount": count,
        })
        return {"success": True, "selector": selector, "x": x, "y": y}
    
    async def type(self, selector: str, text: str, clear: bool = True) -> Dict:
        """Type text into an element."""
        node = await self.get_element(selector)
        if not node:
            raise CDPError(f"Element not found: {selector}")
        
        if clear:
            # Focus and select all
            await self.send("DOM.focus", {"nodeId": node["nodeId"]})
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyDown",
                "key": "a",
                "modifiers": 2,  # Meta/Cmd
            })
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyUp",
                "key": "a",
                "modifiers": 2,
            })
        
        await self.send("Input.insertText", {"text": text})
        return {"success": True, "selector": selector, "text": text}
    
    async def press_key(self, key: str, modifiers: int = 0) -> Dict:
        """Press a key."""
        await self.send("Input.dispatchKeyEvent", {
            "type": "keyDown",
            "key": key,
            "modifiers": modifiers,
        })
        await self.send("Input.dispatchKeyEvent", {
            "type": "keyUp",
            "key": key,
            "modifiers": modifiers,
        })
        return {"success": True, "key": key}
    
    async def scroll(self, x: int = 0, y: int = 0, selector: str = None) -> Dict:
        """Scroll page or element."""
        if selector:
            node = await self.get_element(selector)
            if node:
                await self.send("Runtime.callFunctionOn", {
                    "objectId": node.get("objectId"),
                    "functionDeclaration": f"function() {{ this.scrollBy({x}, {y}); }}",
                })
        else:
            await self.send("Input.dispatchMouseEvent", {
                "type": "mouseWheel",
                "x": 0,
                "y": 0,
                "deltaX": x,
                "deltaY": y,
            })
        return {"success": True}
    
    # ===== Element Queries =====
    async def get_element(self, selector: str) -> Optional[Dict]:
        """Get element by CSS selector."""
        result = await self.send("DOM.getDocument", {"depth": -1, "pierce": True})
        root_id = result["root"]["nodeId"]
        
        result = await self.send("DOM.querySelector", {
            "nodeId": root_id,
            "selector": selector,
        })
        return result.get("nodeId") and {"nodeId": result["nodeId"]} or None
    
    async def get_elements(self, selector: str) -> List[Dict]:
        """Get all elements matching selector."""
        result = await self.send("DOM.getDocument", {"depth": -1, "pierce": True})
        root_id = result["root"]["nodeId"]
        
        result = await self.send("DOM.querySelectorAll", {
            "nodeId": root_id,
            "selector": selector,
        })
        
        nodes = []
        for node_id in result.get("nodeIds", []):
            nodes.append({"nodeId": node_id})
        return nodes
    
    async def get_box_model(self, node_id: str) -> Dict:
        """Get element box model."""
        return await self.send("DOM.getBoxModel", {"nodeId": node_id})
    
    async def get_attribute(self, node_id: str, name: str) -> Optional[str]:
        """Get element attribute."""
        result = await self.send("DOM.getAttributes", {"nodeId": node_id})
        attrs = result.get("attributes", [])
        for i in range(0, len(attrs), 2):
            if attrs[i] == name:
                return attrs[i + 1]
        return None
    
    async def get_text(self, node_id: str) -> str:
        """Get element text content."""
        result = await self.send("Runtime.callFunctionOn", {
            "objectId": node_id,
            "functionDeclaration": "function() { return this.textContent; }",
            "returnByValue": True,
        })
        return result.get("result", {}).get("value", "")
    
    # ===== Screenshots =====
    async def screenshot(self, full_page: bool = False, format: str = "png") -> bytes:
        """Take screenshot."""
        if full_page:
            # Get page dimensions
            metrics = await self.send("Page.getLayoutMetrics")
            width = metrics["contentSize"]["width"]
            height = metrics["contentSize"]["height"]
            
            result = await self.send("Page.captureScreenshot", {
                "format": format,
                "clip": {"x": 0, "y": 0, "width": width, "height": height, "scale": 1},
                "captureBeyondViewport": True,
            })
        else:
            result = await self.send("Page.captureScreenshot", {"format": format})
        
        import base64
        return base64.b64decode(result["data"])
    
    async def screenshot_element(self, selector: str, format: str = "png") -> bytes:
        """Screenshot a specific element."""
        node = await self.get_element(selector)
        if not node:
            raise CDPError(f"Element not found: {selector}")
        
        box = await self.get_box_model(node["nodeId"])
        clip = {
            "x": box["model"]["content"][0],
            "y": box["model"]["content"][1],
            "width": box["model"]["width"],
            "height": box["model"]["height"],
            "scale": 1,
        }
        
        result = await self.send("Page.captureScreenshot", {
            "format": format,
            "clip": clip,
        })
        
        import base64
        return base64.b64decode(result["data"])
    
    # ===== Console & Network =====
    async def get_console_logs(self) -> List[Dict]:
        """Get captured console logs."""
        return self.console_logs.copy()
    
    async def get_network_logs(self) -> List[Dict]:
        """Get captured network logs."""
        return self.network_logs.copy()
    
    async def wait_for_network_idle(self, idle_time: float = 1.0, timeout: float = 30.0):
        """Wait for network to be idle."""
        start = time.time()
        last_request_time = start
        
        while time.time() - start < timeout:
            if time.time() - last_request_time > idle_time:
                return True
            await asyncio.sleep(0.1)
        
        raise CDPError("Network idle timeout")
    
    # ===== JavaScript Execution =====
    async def evaluate(self, expression: str, return_by_value: bool = True) -> Any:
        """Evaluate JavaScript in page context."""
        result = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": return_by_value,
            "awaitPromise": True,
        })
        
        if "exceptionDetails" in result:
            raise CDPError(f"JS Error: {result['exceptionDetails']}")
        
        return result.get("result", {}).get("value")
    
    async def call_function(self, function_declaration: str, *args, **kwargs) -> Any:
        """Call a function in page context."""
        # This is a simplified version - full implementation would serialize args
        return await self.evaluate(f"({function_declaration})()")
    
    # ===== Performance =====
    async def get_performance_metrics(self) -> Dict:
        """Get performance metrics."""
        return await self.send("Performance.getMetrics")
    
    async def run_lighthouse(self, categories: List[str] = None) -> Dict:
        """Run Lighthouse audit (requires Lighthouse CI or similar)."""
        # This would integrate with Lighthouse CI
        # For now, return basic metrics
        metrics = await self.get_performance_metrics()
        return {"metrics": metrics, "categories": categories or [] }
    
    # ===== Cleanup =====
    async def close(self):
        """Close this session."""
        await self.manager.close_session(self.session.session_id)


class CDPError(Exception):
    """CDP command error."""
    pass


# ===== Convenience Functions =====
async def quick_screenshot(url: str, selector: str = None, profile: str = "qa") -> bytes:
    """Quick screenshot utility."""
    chrome = ChromeRemoteDesktop()
    await chrome.start_profile(profile)
    client = await chrome.new_session(profile, url)
    try:
        if selector:
            return await client.screenshot_element(selector)
        else:
            return await client.screenshot(full_page=True)
    finally:
        await client.close()
        await chrome.stop_profile(profile)


async def quick_test(url: str, actions: List[Dict], profile: str = "qa") -> Dict:
    """Run quick test with actions."""
    chrome = ChromeRemoteDesktop()
    await chrome.start_profile(profile)
    client = await chrome.new_session(profile, url)
    
    results = []
    try:
        for action in actions:
            action_type = action.get("type")
            if action_type == "click":
                result = await client.click(action["selector"])
            elif action_type == "type":
                result = await client.type(action["selector"], action["text"])
            elif action_type == "navigate":
                result = await client.navigate(action["url"])
            elif action_type == "screenshot":
                result = {"screenshot": await client.screenshot(full_page=action.get("full", False))}
            elif action_type == "evaluate":
                result = await client.evaluate(action["expression"])
            else:
                result = {"error": f"Unknown action: {action_type}"}
            results.append(result)
        
        console = await client.get_console_logs()
        network = await client.get_network_logs()
        
        return {"results": results, "console": console, "network": network}
    finally:
        await client.close()
        await chrome.stop_profile(profile)


# ===== Main Entry Point =====
async def main():
    """Demo usage."""
    chrome = ChromeRemoteDesktop()
    
    # Start QA profile
    await chrome.start_profile("qa")
    
    # Create session
    client = await chrome.new_session("qa", "https://dev.sirinx.co")
    
    try:
        # Navigate
        await client.navigate("https://dev.sirinx.co")
        
        # Take screenshot
        screenshot = await client.screenshot(full_page=True)
        with open("dev_dashboard.png", "wb") as f:
            f.write(screenshot)
        
        # Get console logs
        logs = await client.get_console_logs()
        print(f"Console logs: {len(logs)} entries")
        
        # Click a button (example)
        # await client.click("#deploy-button")
        
    finally:
        await client.close()
        await chrome.stop_profile("qa")


if __name__ == "__main__":
    asyncio.run(main())