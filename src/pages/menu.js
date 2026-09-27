import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import cookieParser from '../cookieParser.js'

export function Menu() {

    const navigate = useNavigate();
    
    // rederict to login if youre not logged in
    useEffect(() => {
        if (cookieParser(document.cookie).user == "") {
            navigate("/log-in");
        }
    }, [document.cookie]);

    const logout = () => {
        document.cookie = "username=";
        document.cookie = "pass=";
        navigate("/log-in");
    }
    
    return (
        <div>
        <nav>
        <ul className="nav-list">
            <li> <Link to="/computer"> computer </Link> </li>
            <li> <Link to="/player-match"> player match </Link> </li>
            <li> <Link to="/profile-page"> profile page </Link></li>
            <li> <button className="text-red-600" onClick={logout}> logout </button> </li>
        </ul>       
        </nav>
        </div>
    )
}