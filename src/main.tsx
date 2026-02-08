import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { CharactersProvider } from "./app/CharactersContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <CharactersProvider>
                <App />
            </CharactersProvider>
        </BrowserRouter>
    </React.StrictMode>
);
