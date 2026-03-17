import { useEffect } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

async function toggleQuickCapture() {
  const existing = await WebviewWindow.getByLabel("capture");
  if (existing) {
    await existing.close();
    return;
  }

  const capture = new WebviewWindow("capture", {
    url: "index.html?window=capture",
    title: "Quick Capture",
    width: 560,
    height: 280,
    center: true,
    decorations: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focus: true,
  });

  // Ensure focus after creation
  capture.once("tauri://created", () => {
    capture.setFocus();
  });
}

export function useGlobalShortcut() {
  useEffect(() => {
    let registered = false;

    register("Control+Space", (event) => {
      if (event.state === "Pressed") {
        toggleQuickCapture();
      }
    })
      .then(() => {
        registered = true;
      })
      .catch((err) => {
        console.error("Failed to register global shortcut:", err);
      });

    return () => {
      if (registered) {
        unregister("Control+Space").catch(console.error);
      }
    };
  }, []);
}
