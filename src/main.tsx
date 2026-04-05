import React from "react";
import ReactDOM from "react-dom/client";
import "./app.css";

// Check if this is the capture window
const params = new URLSearchParams(window.location.search);
const windowType = params.get("window");

async function renderApp() {
  // biome-ignore lint/style/noNonNullAssertion: root element guaranteed to exist in index.html
  const root = ReactDOM.createRoot(document.getElementById("root")!);

  if (windowType === "capture") {
    const { QuickCaptureWindow } = await import("./components/capture/QuickCaptureWindow");
    root.render(
      <React.StrictMode>
        <QuickCaptureWindow />
      </React.StrictMode>,
    );
  } else {
    const App = (await import("./App")).default;
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

renderApp();
