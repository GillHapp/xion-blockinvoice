import React from "react";
import ReactDOM from "react-dom/client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import App from "./App";
import "./index.css";

import "@burnt-labs/abstraxion/dist/index.css";
import "@burnt-labs/ui/dist/index.css";
import { TREASURY } from "./utils/constants";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AbstraxionProvider config={{ ...TREASURY }} >
      <App />
    </AbstraxionProvider>
  </React.StrictMode>
);
