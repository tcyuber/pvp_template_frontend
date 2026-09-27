import React, { useEffect, useState } from "react"

export function AccountList() {

    const [accounts, setAccounts] = useState([]);
    const controller = new AbortController()

    const fetchAllAccounts = async () => {
        try {
            let header = {
                "Content-Type": "application/json"
            }
            let request = await fetch('http://localhost:8008/fetch-accounts', {
                method: 'GET',
                headers: header,
                signal: controller.signal
            })
            .then(response => response.json())
            .then(res => {
                setAccounts(res);
            });
            controller.abort();
            return request;
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        console.log("starting this thing");
        fetchAllAccounts();
        console.log("finished this thing");
    }, []);

    console.log(accounts);

    return (
        <div>
            <h1> list of accounts </h1>
            <div className="flex flex-col gap-3">
                {accounts.map((account) => (
                    <div className="card" key={account.id}>
                        <h2>id: {account.id} </h2>
                        <h3>user: {account.username}</h3>
                        <h3>pass: {account.pass}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
}