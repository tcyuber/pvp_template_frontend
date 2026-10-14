import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from 'react'
import cookieParser from '../cookieParser'
import { GameBoard, INITIAL_BOARD, PLAYER_COLOURS, canSelect, toggleSelection, isValidLMove, isValidCoinMove, lMoveChanges, coinMoveChanges } from '../models/gameBoard'

export function PlayerMatch() {
    const connection = useRef(null);                    // socket
    const navigate = useNavigate();                     // send them back to log-in
    const [chatHistory, setChatHistory] = useState([]); // [{sender, text, whisper}] received from the server, plus local whispers
    const [localMsg, setLocalMsg] = useState("");       // msg being typed
    const chatEnd = useRef(null);                       // for scrolling to newest msg
    // phases (state diagram waow):
    //
    // l-move -> coin-move -> legal-moves -> l-move   (other players turn)
    //                            |
    //        (no legal moves)    V
    //                         game-end
    const [gameState, setGameState] = useState({
        player_1: "",
        player_2: "",
        player_turn: "player_1",
        phase: "l-move",
        started: false,
        no_turns: 0 
    })
    const [boardState, setBoardState] = useState(INITIAL_BOARD);
    const [selectedSquares, setSelectedSquares] = useState([]);

    let user = cookieParser(document.cookie).user;

    // which slot this session holds, assigned by the server
    const [myPlayer, setMyPlayer] = useState("spectator");
    const isMyTurn = gameState.started && gameState.player_turn === myPlayer;
    const isSpectator = myPlayer === "spectator";

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                    HOOKS
    // ---------------------------------------------------------------------------------------------------------------------

    // take user back to log-in if they are not logged in
    useEffect(() => {
        if (cookieParser(document.cookie).user == "") {
            navigate("/log-in");
        }
    }, []);

    // selections don't carry over between turns or phases
    useEffect(() => {
        setSelectedSquares([]);
    }, [gameState.player_turn, gameState.phase]);

    // Socket hook
    useEffect(() => {
        console.log("start");

        // Socket object
        const socket = new WebSocket(`${process.env.REACT_APP_WS_URL}?user=${user}`); // url must be the same as app, but with ws protocol instead of http

        // Socket listen for connection opened
        socket.addEventListener("open", () => {
            console.log("["+user+"]: successfully connected to websocket server");
        });

        socket.addEventListener("close", () => {
            console.log("["+user+"]: successfully disconnected from websocket server");
        });

        // Socket listen for messages:
        //     user-enter: user has entered the room
        //     opponent-enter: opponent has entered the room, you need to give info on what they neeed to render
        //     phase-change: phange from one game phase to the other
        //     chat: player sends a message in chat
        //     l-move: player makes a move with their l piece
        //     coin-move: player makes a move with a coin piece
        //     game-end: game has ended, do appropriate teardown and point reward
        socket.addEventListener("message", (message) => {

            let parsed_message = JSON.parse(message.data);

            if (parsed_message.msg_type == "phase-change") {
                makePhaseChange(parsed_message);
            } else if (parsed_message.msg_type == "players") {
                const { player_1, player_2, you } = parsed_message.msg_content;
                setGameState(prevState => ({...prevState, player_1, player_2}));
                setMyPlayer(you);
            } else if (parsed_message.msg_type == "game-start") {
                setBoardState(INITIAL_BOARD);
                setGameState(prevState => ({...prevState, started: true, player_turn: parsed_message.msg_content.first, phase: "l-move", no_turns: 0}));
            } else if (parsed_message.msg_type == "game-sync") {
                // joined mid-game: apply the moves made so far to the starting board
                const { player_turn, phase, board_changes } = parsed_message.msg_content;
                const board = {...INITIAL_BOARD};
                for (const square in board_changes) {
                    board[square] = board_changes[square];
                }
                setBoardState(board);
                setGameState(prevState => ({...prevState, started: true, player_turn, phase}));
            } else if (parsed_message.msg_type == "game-waiting") {
                setGameState(prevState => ({...prevState, started: false}));
            } else if (parsed_message.msg_type == "chat") {
                printMsg(parsed_message);
            } else if (parsed_message.msg_type == "game-log") {
                setChatHistory(prevHistory => [...prevHistory, {sender: parsed_message.sender, squares: parsed_message.msg_content.squares, log: true}]);
            } else if (parsed_message.msg_type == "l-move") {
                makeMove(parsed_message);
            } else if (parsed_message.msg_type == "coin-move") {
                makeMove(parsed_message);
            } else {
                console.log("["+user+"]: tried to make action type: "+parsed_message.msg_type);
            }
        });

        connection.current = socket;

        // handler for page exit, close socket
        return () => (connection.current).close();

    }, [connection])

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                    CHAT
    // ---------------------------------------------------------------------------------------------------------------------

    // for dynamically updating local text
    const handleChange = (e) =>  {
        setLocalMsg(e.target.value);
    };

    // called by socket reciever here
    const printMsg = (parsed_message) => {
        console.log("["+user+"]: recieved message: "+parsed_message.msg_content);
        setChatHistory(prevHistory => [...prevHistory, {sender: parsed_message.sender, text: parsed_message.msg_content}]);
    }

    // send data to socket server
    const sendMessage = (e) => {
        e.preventDefault();
        if (localMsg.trim() === "") return;
        // whispers ("/w msg") are only visible to the sender, so they never reach the server
        if (localMsg.startsWith("/w ")) {
            const text = localMsg.slice(3).trim();
            if (text !== "") {
                setChatHistory(prevHistory => [...prevHistory, {sender: user, text, whisper: true}]);
            }
            setLocalMsg("");
            return;
        }
        let message = {
            msg_type: "chat",
            msg_content: localMsg
        };
        console.log("["+user+"] sending message: "+localMsg);
        connection.current.send(JSON.stringify(message));
        setLocalMsg("");
    };

    // players' names are shown in their piece colour, spectators in green
    const senderColour = (sender) => {
        if (sender === gameState.player_1) return PLAYER_COLOURS.player_1;
        if (sender === gameState.player_2) return PLAYER_COLOURS.player_2;
        return 'green';
    }

    // spectator messages are shown in italics
    const isSpectatorSender = (sender) => sender !== gameState.player_1 && sender !== gameState.player_2;

    // keep the newest message in view
    useEffect(() => {
        chatEnd.current?.scrollIntoView({ block: "nearest" });
    }, [chatHistory]);

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                PHASE-CHANGE
    // ---------------------------------------------------------------------------------------------------------------------

    // is called locally by socket reciever
    const makePhaseChange = (parsed_message) => {
        console.log("here1");
        console.log(parsed_message.msg_content.new_phase);
        if (parsed_message.msg_content.new_phase == 'l-move') {
            setGameState(prevState => ({...prevState, player_turn: (prevState.player_turn == "player_1" ? "player_2" : "player_1"), phase: 'l-move'}));
        } else if (parsed_message.msg_content.new_phase == 'coin-move') {
            setGameState(prevState => ({...prevState, phase: 'coin-move'}));
        } else if (parsed_message.msg_content.new_phase == 'legal-move') {
            console.log("here");
            setGameState(prevState => ({...prevState, phase: 'legal-move'}));
        }
    }
    
    // sends data to socket server
    const sendPhaseChange = (newPhase) => {
        let message = {
            msg_type: "phase-change",
            msg_content: {
                new_phase: newPhase
            }
        };
        console.log("["+user+"] is initating a phase change");
        connection.current.send(JSON.stringify(message));
    }

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                BUTTON FUNCTIONS
    // ---------------------------------------------------------------------------------------------------------------------

    // only squares that are legal for the current phase can be selected
    const handleSquareClick = (square) => {
        if (!isMyTurn || !canSelect(boardState, square, gameState.phase, gameState.player_turn)) return;
        setSelectedSquares(prev => toggleSelection(boardState, prev, square, gameState.phase));
    }

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                GENERIC MOVE
    // ---------------------------------------------------------------------------------------------------------------------

    // called by socket reciever here
    // only alters one square, to be called in succession by main handler
    // assumes whatever alteration it makes is legal
    const makeMove = (parsed_message) => {
        setBoardState(prevBoardState => ({
            ...prevBoardState, [parsed_message.msg_content.square]: parsed_message.msg_content.piece
        }));
        setSelectedSquares(prevSelectedSquares => prevSelectedSquares.filter(square => square !== parsed_message.msg_content.square));
    }

    // send data for single square to server for it to be updated on both peoples board
    const updateSquare = (type, name, piece) => {
        let message = {
            msg_type: type,
            msg_content: {
                square: name,
                piece: piece
            }
        };
        console.log("["+user+"] making l-move");
        connection.current.send(JSON.stringify(message));
    }

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                   L-MOVE
    // ---------------------------------------------------------------------------------------------------------------------

    // does server calls. doesn't do 4 squares at once but consecutively sends 4 different squares
    const sendLMove = () => {
        if (!isValidLMove(boardState, selectedSquares, gameState.player_turn)) {
            console.log("not a valid l-move");
            return;
        }
        lMoveChanges(boardState, selectedSquares, gameState.player_turn)
            .forEach(([square, piece]) => updateSquare('l-move', square, piece));
        // game log: the new L's squares, in board order
        connection.current.send(JSON.stringify({
            msg_type: "game-log",
            msg_content: { squares: [...selectedSquares].sort() }
        }));
        // only the moving player sends the phase change, once
        sendPhaseChange("coin-move");
    }

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                  COIN-MOVE
    // ---------------------------------------------------------------------------------------------------------------------

    // does sequence of server calls
    const sendCoinMove = () => {
        if (!isValidCoinMove(boardState, selectedSquares)) {
            console.log("not a valid coin move");
            return;
        }
        coinMoveChanges(boardState, selectedSquares)
            .forEach(([square, piece]) => updateSquare('coin-move', square, piece));
        sendPhaseChange("l-move");
    }

    // ---------------------------------------------------------------------------------------------------------------------
    //                                                  RENDERING
    // ---------------------------------------------------------------------------------------------------------------------

    return (
        <div className="wide flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-1 flex-col gap-3">
            <h1>Player Match</h1>
            {(!gameState.started) && <p className="text-slate-500">Waiting for another player to join...</p>}
            {(gameState.started) && <>
                <p>
                    <span className="font-semibold" style={{color: PLAYER_COLOURS[gameState.player_turn]}}>
                        {gameState[gameState.player_turn]}
                    </span>'s turn to move...
                </p>
                <p>Phase: {gameState.phase}</p>
            </>}

            <GameBoard
                board={boardState}
                selected={selectedSquares}
                phase={gameState.phase}
                playerTurn={gameState.player_turn}
                onSquareClick={handleSquareClick} />

            {(isSpectator) && <p className="text-slate-500">You are spectating.</p>}
            {(gameState.started && !isSpectator && !isMyTurn) && <p className="text-slate-500">Waiting for the other player...</p>}

            {(isMyTurn && gameState.phase === "l-move") && <div className="flex gap-2">
                <button // submit l-move button
                    className="btn"
                    disabled={selectedSquares.length !== 4}
                    onClick={sendLMove}>
                        Make L-move
                </button>
            </div>}

            {(isMyTurn && gameState.phase === "coin-move") && <div className="flex gap-2">
                <button // submit coin move button
                    className="btn"
                    disabled={selectedSquares.length !== 2}
                    onClick={sendCoinMove}>
                        Make coin move
                </button>
                <button // coin move is optional
                    className="btn-secondary"
                    onClick={() => sendPhaseChange("l-move")}>
                        Skip coin move
                </button>
            </div>}
        </div>

        <aside className="card flex flex-col gap-3 md:w-80">
            <h2>Chat</h2>
            <div className="flex h-80 flex-col gap-1 overflow-y-auto text-sm">
                {(chatHistory.length === 0) && <p className="text-slate-400">No messages yet.</p>}
                {chatHistory.map((msg, index) => msg.log
                    ? <p key={index} className="break-words italic">
                        <span className="font-semibold" style={{color: senderColour(msg.sender)}}>
                            {msg.sender}
                        </span> made a move: {msg.squares.join(", ")}
                    </p>
                    : <p key={index} className={"break-words"
                        + (msg.whisper ? " italic text-slate-500" : "")
                        + (!msg.whisper && isSpectatorSender(msg.sender) ? " italic" : "")}>
                        <span className="font-semibold" style={{color: senderColour(msg.sender)}}>
                            {msg.sender}
                        </span>{msg.whisper && " (whisper)"}: {msg.text}
                    </p>
                )}
                <div ref={chatEnd} />
            </div>
            <form className="flex gap-2" onSubmit={sendMessage}>
                <input
                    value={localMsg}
                    onChange={handleChange}
                    name="text"
                    placeholder={isSpectator ? "Message (spectators only)... /w to whisper" : "Message... /w to whisper"} />
                <button className="btn" type="submit">Send</button>
            </form>
        </aside>
        </div>
    );
}