import React, { useState } from 'react';
import { chessService, type ChessBoard as ChessBoardType, type ChessPiece } from '../services/chessService';

interface ChessBoardProps {
  board: ChessBoardType;
  onMove: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  currentTurn: 'white' | 'black';
  playerColor: 'white' | 'black';
  lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } };
  isGameOver?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  onMove,
  currentTurn,
  playerColor,
  lastMove,
  isGameOver = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);

  const handleSquareClick = (row: number, col: number) => {
    try {
      if (isGameOver) return;
      if (currentTurn !== playerColor) return;

      const piece = board[row][col];

    // If a piece is already selected
    if (selectedSquare) {
      // Try to move to this square
      if (validMoves.some(m => m.row === row && m.col === col)) {
        onMove(selectedSquare, { row, col });
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (piece && piece.color === playerColor) {
        // Select a different piece
        setSelectedSquare({ row, col });
        setValidMoves(chessService.getValidMoves(board, { row, col }, currentTurn));
      } else {
        // Deselect
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Select a piece if it belongs to the current player
      if (piece && piece.color === playerColor) {
        setSelectedSquare({ row, col });
        setValidMoves(chessService.getValidMoves(board, { row, col }, currentTurn));
      }
    }
    } catch (error) {
      console.error('Error handling square click:', error);
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const isSquareHighlighted = (row: number, col: number): boolean => {
    return validMoves.some(m => m.row === row && m.col === col);
  };

  const isSquareSelected = (row: number, col: number): boolean => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };

  const isLastMoveSquare = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  };

  const renderSquare = (row: number, col: number) => {
    const piece = board[row][col];
    const isLight = (row + col) % 2 === 0;
    const isSelected = isSquareSelected(row, col);
    const isHighlighted = isSquareHighlighted(row, col);
    const isLastMove = isLastMoveSquare(row, col);

    let bgColor = isLight ? 'bg-white' : 'bg-gray-800';
    let borderColor = 'border-transparent';
    
    if (isSelected) {
      bgColor = 'bg-blue-400';
    } else if (isLastMove) {
      bgColor = isLight ? 'bg-blue-200' : 'bg-blue-700';
    } else if (isHighlighted) {
      borderColor = 'border-green-500';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`relative ${bgColor} flex items-center justify-center cursor-pointer hover:brightness-110 transition-all border-2 ${borderColor}`}
        style={{ width: '60px', height: '60px' }}
        onClick={() => handleSquareClick(row, col)}
      >
        {piece && (
          <span className="text-5xl select-none pointer-events-none drop-shadow-lg">
            {chessService.getPieceSymbol(piece)}
          </span>
        )}
        {isHighlighted && !piece && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-70"></div>
          </div>
        )}
        {/* Coordinates */}
        {col === 0 && (
          <span className={`absolute left-1 top-1 text-[10px] font-bold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            {8 - row}
          </span>
        )}
        {row === 7 && (
          <span className={`absolute right-1 bottom-1 text-[10px] font-bold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            {String.fromCharCode(97 + col)}
          </span>
        )}
      </div>
    );
  };

  // Display board from player's perspective
  const displayBoard = playerColor === 'white' ? board : [...board].reverse().map(row => [...row].reverse());
  const displayRows = playerColor === 'white' 
    ? Array.from({ length: 8 }, (_, i) => i)
    : Array.from({ length: 8 }, (_, i) => 7 - i);
  const displayCols = playerColor === 'white'
    ? Array.from({ length: 8 }, (_, i) => i)
    : Array.from({ length: 8 }, (_, i) => 7 - i);

  // Safety check
  if (!board || board.length !== 8) {
    return <div className="text-white">Error: Invalid board state</div>;
  }

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div 
        className="inline-grid grid-cols-8 border-8 border-gray-900 shadow-2xl rounded-lg overflow-hidden bg-gray-900"
        style={{ width: '480px', height: '480px' }}
      >
        {displayRows.map(row => {
          const actualRow = playerColor === 'white' ? row : 7 - row;
          return displayCols.map(col => {
            const actualCol = playerColor === 'white' ? col : 7 - col;
            return renderSquare(actualRow, actualCol);
          });
        })}
      </div>
      
      {/* Turn indicator */}
      <div className="mt-5 text-center bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-3 rounded-xl border-2 border-cyan-500/30 shadow-lg">
        <p className="text-xl font-bold text-white">
          {currentTurn === 'white' ? '⚪' : '⚫'} {currentTurn === playerColor ? 'Your Turn' : "Opponent's Turn"}
        </p>
        {isGameOver && (
          <p className="text-2xl font-bold text-red-400 mt-2 animate-pulse">
            🏁 Game Over!
          </p>
        )}
      </div>
    </div>
  );
};

