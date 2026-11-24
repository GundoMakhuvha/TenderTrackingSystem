import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { configureCalendar } from "./lib/calendar";
import "./index.css";

configureCalendar({ utcOffset: import.meta.env.VITE_APP_UTC_OFFSET });

createRoot(document.getElementById("root")!).render(<App />);
