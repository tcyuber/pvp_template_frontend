import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cookieParser from '../cookieParser.js'

export function LogIn() {   

    // {username: <str>, pass: <val>}
    const [account, setAccount] = useState({username: cookieParser(document.cookie).user, pass: cookieParser(document.cookie).pass});
    const [state, setState] = useState("typing");

    const navigate = useNavigate();

    const controller = new AbortController();

    useEffect(() => {
        setAccount({
            username: cookieParser(document.cookie).user,
            pass: cookieParser(document.cookie).pass
        });
    }, []);

    const handleChange = (e) =>  {
        setAccount(prev=>({...prev, [e.target.name]: e.target.value}));
    }

    const handleClick = async e => {
        e.preventDefault();
        setState("submitting");
    }

    const matchAccount = async (data) => {
        let header = {
            "Content-Type": "application/json"
        };
        let matched = await fetch('http://localhost:8008/find-account', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: header,
            signal: controller.signal
        })
        .then(response => response.json())
        .then(res => {
            if (res == []) {
                setState("fail");
                return false;
            }
            else if ((res[0].user === account.user) && (res[0].pass == account.pass)) {
                return true;
            } else {
                setState("fail");
                return false;
            }
        })
        .catch(() => {
            setState("error");
            return false;
        });

        return matched;
    };
    
    useEffect(() => {
        if (state === "submitting") {
            let data = {
                "username": account.username,
                "pass": account.pass
            };
            let logIn = async () => {
                let matched = await matchAccount(data);
                if (!matched) return;
                document.cookie = "username="+data.username;
                document.cookie = "pass="+data.pass;
                setState("success");
            }
            logIn();
        } else if (state === "success") {
            navigate("/menu");
        }
        return () => {
            controller.abort();
        }
    }, [state]);

    return (
        <div className="form">
            <h1>Log In</h1>
            <input 
                type="text"
                value={account.username}
                placeholder="Username"
                disabled={state === "submitting"}
                onChange={handleChange} name="username"
            />
            <input 
                type="password"
                value={account.pass}
                placeholder="Password"
                disabled={state === "submitting"}
                onChange={handleChange} name="pass"
            />
            <button
                className="btn"
                disabled={state === "submitting"}
                onClick={handleClick}>
                Submit
            </button>
            {(state === "typing") && <p>Please type in your Username and password.</p>}
            {(state === "fail") && <p>Incorrect username or password.</p>}
            {(state === "success") && <p>Successful login!</p>}
            {(state === "submitting") && <p>Processing...</p>}
            {(state === "error") && <p>An error has occured, please try again.</p>}
        </div>
    )
}