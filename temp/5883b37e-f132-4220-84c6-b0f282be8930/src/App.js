
import React, { useState, useEffect } from 'react';

const TicTacToe = () => {
  const [board, setBoard] = useState(() => Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [isDraw, setIsDraw] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  useEffect(() => {
    const calculateWinner = () => {
      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
      ];

      for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          setWinner(board[a]);
          setWinningLine([a, b, c]);
          return;
        }
      }

      if (board.every(cell => cell !== null)) {
        setIsDraw(true);
      }
    };

    calculateWinner();
  }, [board]);

  const handleClick = (index) => {
    if (board[index] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setIsDraw(false);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  useEffect(() => {
    if (winner || isDraw) {
      setScores(prev => {
        const newScores = { ...prev };
        if (winner) newScores[winner] += 1;
        if (isDraw) newScores.draws += 1;
        return newScores;
      });
    }
  }, [winner, isDraw]);

  const getCellClass = (index) => {
    let classes = "w-full min-h-[100px] flex items-center justify-center text-5xl font-bold rounded-lg transition-all duration-300 ";

    if (winningLine.includes(index)) {
      classes += winner === 'X'
        ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-400 shadow-lg"
        : "bg-blue-100 text-blue-800 border-2 border-blue-400 shadow-lg";
    } else {
      classes += board[index]
        ? "bg-gray-50 text-gray-800 border-2 border-gray-200 shadow-sm"
        : "bg-white hover:bg-gray-50 text-gray-400 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md";
    }

    return classes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 tracking-wide">
            Tic Tac Toe
          </h1>
          <p className="text-gray-600">Professional Edition</p>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
            <div className="text-emerald-600 font-bold text-xl">X</div>
            <div className="text-gray-800 text-3xl font-mono">{scores.X}</div>
            <div className="text-gray-500 text-sm mt-1">Wins</div>
          </div>

          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
            <div className="text-amber-600 font-bold text-xl">Draws</div>
            <div className="text-gray-800 text-3xl font-mono">{scores.draws}</div>
          </div>

          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
            <div className="text-blue-600 font-bold text-xl">O</div>
            <div className="text-gray-800 text-3xl font-mono">{scores.O}</div>
            <div className="text-gray-500 text-sm mt-1">Wins</div>
          </div>
        </div>

        {/* Game Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-8 border border-gray-200 shadow-sm">
          {winner ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-emerald-600">
                Player {winner} Wins!
              </div>
              <div className="text-gray-600 text-sm mt-1">Well Played!</div>
            </div>
          ) : isDraw ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-amber-600">
                It's a Draw!
              </div>
              <div className="text-gray-500 text-sm mt-1">Try again</div>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-4 py-2">
              <div className="text-lg text-gray-700">Current turn:</div>
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl border-2 ${isXNext ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                X
              </div>
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl border-2 ${!isXNext ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                O
              </div>
            </div>
          )}
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 gap-3 mb-8 aspect-square">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className="aspect-square rounded-lg p-2 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
              disabled={!!cell || winner || isDraw}
            >
              <div className={getCellClass(index)}>
                <div className="scale-110 text-5xl font-bold">
                  {cell === 'X' ? (
                    <span className="text-emerald-600">✕</span>
                  ) : cell === 'O' ? (
                    <span className="text-blue-600">○</span>
                  ) : (
                    <span className="invisible">○</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Game Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={resetGame}
            className="py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
          >
            New Round
          </button>
          <button
            onClick={resetScores}
            className="py-3 px-6 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-all duration-300 border-2 border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
          >
            Reset Scores
          </button>
        </div>
      </div>

      <div className="mt-10 text-center text-gray-400 text-sm">
        Game state persists during session
      </div>
    </div>
  );
};

export default TicTacToe;
