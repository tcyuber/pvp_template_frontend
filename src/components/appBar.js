import { Link, useLocation } from 'react-router-dom'
import cookieParser from '../cookieParser'

// top bar on every page, only shown when logged in.
// useLocation re-renders the bar on navigation, so it picks up log-in/log-out cookie changes
export function AppBar() {
    useLocation();
    const user = cookieParser(document.cookie).user;

    if (user === "") return null;

    return (
        <header className="app-bar">
            <Link to="/" className="font-semibold text-slate-800 hover:no-underline">PVP Template</Link>
            <Link to="/profile-page" className="text-sm">{user}</Link>
        </header>
    );
}
