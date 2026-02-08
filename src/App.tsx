import { NavLink, Route, Routes } from "react-router-dom";
import CharactersPage from "./pages/CharactersPage";
import RollerPage from "./pages/RollerPage";

export default function App() {
    return (
        <div className="appShell">
            <nav className="nav">
                <div className="brand">🎲 JDR Dice</div>
                <NavLink className={({ isActive }) => (isActive ? "navItem active" : "navItem")} to="/">
                    Personnages
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? "navItem active" : "navItem")} to="/roller">
                    Lancer
                </NavLink>
            </nav>

            <main className="main">
                <Routes>
                    <Route path="/" element={<CharactersPage />} />
                    <Route path="/roller" element={<RollerPage />} />
                </Routes>
            </main>
        </div>
    );
}
