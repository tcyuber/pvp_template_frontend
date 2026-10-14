// model for the L game: starting board, move rules, and the board component.
// everything here works on plain board/selection data so it has no socket or page dependencies.
// the game logic only knows about pieces ("player-1", "player-2", "coin", "empty"); colours are a rendering concern

export const INITIAL_BOARD = {
    A1: 'coin',     A2: 'empty',    A3: 'empty',    A4: 'empty',
    B1: 'player-1', B2: 'player-2', B3: 'player-2', B4: 'player-2',
    C1: 'player-1', C2: 'player-1', C3: 'player-1', C4: 'player-2',
    D1: 'empty',    D2: 'empty',    D3: 'empty',    D4: 'coin'
};

// game state uses "player_1"/"player_2" for turns, the board uses "player-1"/"player-2" for pieces
const PLAYER_PIECES = {player_1: 'player-1', player_2: 'player-2'};

// squares in render order: row by row, columns A-D
const SQUARES = ['1', '2', '3', '4'].flatMap(row => ['A', 'B', 'C', 'D'].map(col => col + row));

// l-move: player can pick empty squares or their own L; coin-move: coins or empty squares
export function canSelect(board, square, phase, player) {
    const piece = board[square];
    if (phase === "l-move") return piece === 'empty' || piece === PLAYER_PIECES[player];
    if (phase === "coin-move") return piece === 'empty' || piece === 'coin';
    return false;
}

// selection after clicking a square: clicking a selected square deselects it.
// in coin-move at most one coin and one destination (empty) can be selected,
// so selecting a new square replaces the selected square holding the same piece
export function toggleSelection(board, selected, square, phase) {
    if (selected.includes(square)) return selected.filter(s => s !== square);
    if (phase === "coin-move") {
        return [...selected.filter(s => board[s] !== board[square]), square];
    }
    return [...selected, square];
}

// checks whether an l-move is valid.
// is allowed to assume that only legal squares were selected (empty or the player's own)
export function isValidLMove(board, selected, player) {
    if (selected.length !== 4) return false;

    // squares as column/row indices, e.g. "B3" -> x = 1, y = 2
    const xs = selected.map(square => square.charCodeAt(0) - 65);
    const ys = selected.map(square => Number(square[1]) - 1);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    const height = Math.max(...ys) - Math.min(...ys) + 1;

    // an L always fills exactly a 2x3 or 3x2 box
    if (width * height !== 6) return false;

    // split into the long axis (length 3) and short axis (length 2)
    const [long, short] = (width === 3) ? [xs, ys] : [ys, xs];

    // one side of the box has 3 squares (the full line), the other has 1
    const shortMin = Math.min(...short);
    const onMinSide = short.filter(v => v === shortMin).length;
    if (onMinSide !== 1 && onMinSide !== 3) return false;

    // the lone square must be at an end of the line, otherwise it's a T
    const loneSide = (onMinSide === 1) ? shortMin : Math.max(...short);
    const loneLong = long[short.indexOf(loneSide)];
    if (loneLong !== Math.min(...long) && loneLong !== Math.max(...long)) return false;

    // the piece must actually move: at least one square isn't already part of the player's L
    return selected.some(square => board[square] !== PLAYER_PIECES[player]);
}

// exactly one coin and one empty square
export function isValidCoinMove(board, selected) {
    if (selected.length !== 2) return false;
    const pieces = selected.map(square => board[square]);
    return pieces.includes('coin') && pieces.includes('empty');
}

// [square, piece] changes for an l-move: old L is emptied first, then the new L is placed,
// so squares in both end up as the player's piece
export function lMoveChanges(board, selected, player) {
    const piece = PLAYER_PIECES[player];
    const oldL = Object.keys(board).filter(square => board[square] === piece);
    return [...oldL.map(square => [square, 'empty']), ...selected.map(square => [square, piece])];
}

// [square, piece] changes for a coin move: the coin's square is emptied, the empty square gets the coin
export function coinMoveChanges(board, selected) {
    return selected.map(square => [square, (board[square] === 'empty') ? 'coin' : 'empty']);
}

// ---------------------------------------------------------------------------------------------------------------------
//                                    RENDERING (the only place pieces become colours)
// ---------------------------------------------------------------------------------------------------------------------

const PIECE_COLOURS = {'player-1': 'red', 'player-2': 'blue', coin: 'black', empty: 'grey'};
const SELECTED_COLOURS = {player_1: '#FFB6C1', player_2: '#89CFF0'};   // light pink, baby blue
const COIN_SELECTED_COLOUR = '#D3D3D3';                                  // light grey

// players' piece colours, also used by the page for names in chat and the turn indicator
export const PLAYER_COLOURS = {player_1: PIECE_COLOURS['player-1'], player_2: PIECE_COLOURS['player-2']};

// selected squares are shown in the selecting player's highlight colour, or light grey when selecting coins
export function GameBoard({ board, selected, phase, playerTurn, onSquareClick }) {
    const squareColour = (square) => !selected.includes(square)
        ? PIECE_COLOURS[board[square]]
        : (phase === "coin-move") ? COIN_SELECTED_COLOUR : SELECTED_COLOURS[playerTurn];

    return (
        <div className="board">
            {SQUARES.map(square => (
                <button
                    key={square}
                    name={square}
                    className="square"
                    onClick={() => onSquareClick(square)}
                    style={{backgroundColor: squareColour(square)}} />
            ))}
        </div>
    );
}
