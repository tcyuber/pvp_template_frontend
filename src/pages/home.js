import { Link } from "react-router-dom"

export function Home() {
    return (
        <div>
        <nav>
        <ul className="nav-list">
            <li><Link to="./log-in"> Log In </Link></li>
            <li><Link to="./sign-up"> Sign Up </Link></li>
            <li><Link to="./account-list"> List of accounts </Link></li>
        </ul>
        </nav>
        </div>
    );
}