import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import cookieParser from '../cookieParser.js'

export function ProfilePage() {

    const [user, setUser] = useState();
    const [wins, setWins] = useState();
    const [losses, setLosses] = useState();
    const [state, setState] = useState("loading");

    useEffect(() => {
        const data = {
            "username": cookieParser(document.cookie).user,
        };
        const header = {
            "Content-Type": "application/json",
        };
        fetch('http://localhost:8008/find-account', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: header
        })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText)
            return response.json()
        })
        .then(res => {
            if (res.length === 0) {
                setState("not-found")
                return
            }
            setUser(res[0].username)
            setWins(res[0].wins)
            setLosses(res[0].losses)
            setState("loaded")
        })
        .catch(() => setState("error"));
    }, []);

    if (state === "loading") return <p>Loading...</p>
    if (state === "error") return <p>An error has occured, please try again.</p>
    if (state === "not-found") {
        return (
            <div className="card">
                <p className="mb-2">You are not logged in.</p>
                <Link to="/log-in">Log in</Link> or <Link to="/sign-up">sign up</Link>
            </div>
        )
    }

    return (
        <div className="card">
            <h1>User: {user}</h1>
            <p>Wins: {wins}</p>
            <p>Losses: {losses}</p>
        </div>
    );
}