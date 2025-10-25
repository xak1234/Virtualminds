export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: ChessPiece;
  captured?: ChessPiece;
  notation: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export type ChessBoard = (ChessPiece | null)[][];

export interface ChessGameState {
  board: ChessBoard;
  currentTurn: PieceColor;
  moveHistory: ChessMove[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  lastMove?: ChessMove;
}

const PIECE_SYMBOLS: Record<PieceType, { white: string; black: string }> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
};

export class ChessService {
  private static instance: ChessService;

  private constructor() {}

  static getInstance(): ChessService {
    if (!ChessService.instance) {
      ChessService.instance = new ChessService();
    }
    return ChessService.instance;
  }

  /**
   * Create initial chess board setup
   */
  createInitialBoard(): ChessBoard {
    const board: ChessBoard = Array(8).fill(null).map(() => Array(8).fill(null));

    // Set up black pieces (top of board)
    board[0] = [
      { type: 'rook', color: 'black' },
      { type: 'knight', color: 'black' },
      { type: 'bishop', color: 'black' },
      { type: 'queen', color: 'black' },
      { type: 'king', color: 'black' },
      { type: 'bishop', color: 'black' },
      { type: 'knight', color: 'black' },
      { type: 'rook', color: 'black' },
    ];
    board[1] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'black' as PieceColor }));

    // Set up white pieces (bottom of board)
    board[6] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'white' as PieceColor }));
    board[7] = [
      { type: 'rook', color: 'white' },
      { type: 'knight', color: 'white' },
      { type: 'bishop', color: 'white' },
      { type: 'queen', color: 'white' },
      { type: 'king', color: 'white' },
      { type: 'bishop', color: 'white' },
      { type: 'knight', color: 'white' },
      { type: 'rook', color: 'white' },
    ];

    return board;
  }

  /**
   * Get piece symbol for display
   */
  getPieceSymbol(piece: ChessPiece): string {
    return PIECE_SYMBOLS[piece.type][piece.color];
  }

  /**
   * Check if a move is valid
   */
  isValidMove(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }, currentTurn: PieceColor): boolean {
    const piece = board[from.row][from.col];
    if (!piece || piece.color !== currentTurn) return false;

    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    // Check piece-specific movement rules
    const isValid = this.isPieceMovementValid(board, from, to, piece);
    if (!isValid) return false;

    // Check if move would put own king in check
    const testBoard = this.cloneBoard(board);
    testBoard[to.row][to.col] = testBoard[from.row][from.col];
    testBoard[from.row][from.col] = null;

    return !this.isKingInCheck(testBoard, currentTurn);
  }

  /**
   * Check piece-specific movement rules
   */
  private isPieceMovementValid(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }, piece: ChessPiece): boolean {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;

    switch (piece.type) {
      case 'pawn':
        return this.isPawnMoveValid(board, from, to, piece.color, rowDiff, colDiff);
      case 'rook':
        return this.isRookMoveValid(board, from, to, rowDiff, colDiff);
      case 'knight':
        return this.isKnightMoveValid(rowDiff, colDiff);
      case 'bishop':
        return this.isBishopMoveValid(board, from, to, rowDiff, colDiff);
      case 'queen':
        return this.isRookMoveValid(board, from, to, rowDiff, colDiff) || this.isBishopMoveValid(board, from, to, rowDiff, colDiff);
      case 'king':
        return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
      default:
        return false;
    }
  }

  private isPawnMoveValid(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }, color: PieceColor, rowDiff: number, colDiff: number): boolean {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const targetPiece = board[to.row][to.col];

    // Forward move
    if (colDiff === 0) {
      if (rowDiff === direction && !targetPiece) return true;
      if (from.row === startRow && rowDiff === 2 * direction && !targetPiece && !board[from.row + direction][from.col]) return true;
      return false;
    }

    // Diagonal capture
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece && targetPiece.color !== color) {
      return true;
    }

    return false;
  }

  private isRookMoveValid(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }, rowDiff: number, colDiff: number): boolean {
    if (rowDiff !== 0 && colDiff !== 0) return false;
    return this.isPathClear(board, from, to);
  }

  private isKnightMoveValid(rowDiff: number, colDiff: number): boolean {
    return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
  }

  private isBishopMoveValid(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }, rowDiff: number, colDiff: number): boolean {
    if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
    return this.isPathClear(board, from, to);
  }

  private isPathClear(board: ChessBoard, from: { row: number; col: number }, to: { row: number; col: number }): boolean {
    const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
    const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (board[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  /**
   * Find king position
   */
  private findKing(board: ChessBoard, color: PieceColor): { row: number; col: number } | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  /**
   * Check if king is in check
   */
  isKingInCheck(board: ChessBoard, color: PieceColor): boolean {
    const kingPos = this.findKing(board, color);
    if (!kingPos) return false;

    const opponentColor = color === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === opponentColor) {
          if (this.isPieceMovementValid(board, { row, col }, kingPos, piece)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all valid moves for a piece
   */
  getValidMoves(board: ChessBoard, from: { row: number; col: number }, currentTurn: PieceColor): { row: number; col: number }[] {
    const validMoves: { row: number; col: number }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.isValidMove(board, from, { row, col }, currentTurn)) {
          validMoves.push({ row, col });
        }
      }
    }

    return validMoves;
  }

  /**
   * Make a move
   */
  makeMove(gameState: ChessGameState, from: { row: number; col: number }, to: { row: number; col: number }): ChessGameState | null {
    if (!this.isValidMove(gameState.board, from, to, gameState.currentTurn)) {
      return null;
    }

    const newBoard = this.cloneBoard(gameState.board);
    const piece = newBoard[from.row][from.col]!;
    const captured = newBoard[to.row][to.col];

    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    const notation = this.getMoveNotation(from, to, piece, captured);
    const nextTurn = gameState.currentTurn === 'white' ? 'black' : 'white';
    const isCheck = this.isKingInCheck(newBoard, nextTurn);
    const isCheckmate = isCheck && this.isCheckmate(newBoard, nextTurn);
    const isStalemate = !isCheck && this.isCheckmate(newBoard, nextTurn);

    const move: ChessMove = {
      from,
      to,
      piece,
      captured: captured || undefined,
      notation,
      isCheck,
      isCheckmate,
    };

    return {
      board: newBoard,
      currentTurn: nextTurn,
      moveHistory: [...gameState.moveHistory, move],
      isCheck,
      isCheckmate,
      isStalemate,
      lastMove: move,
    };
  }

  /**
   * Check if it's checkmate
   */
  private isCheckmate(board: ChessBoard, color: PieceColor): boolean {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board[fromRow][fromCol];
        if (piece && piece.color === color) {
          const validMoves = this.getValidMoves(board, { row: fromRow, col: fromCol }, color);
          if (validMoves.length > 0) return false;
        }
      }
    }
    return true;
  }

  /**
   * Convert move to algebraic notation
   */
  private getMoveNotation(from: { row: number; col: number }, to: { row: number; col: number }, piece: ChessPiece, captured?: ChessPiece | null): string {
    const files = 'abcdefgh';
    const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
    const captureSymbol = captured ? 'x' : '';
    const fromFile = piece.type === 'pawn' && captured ? files[from.col] : '';
    
    return `${pieceSymbol}${fromFile}${captureSymbol}${files[to.col]}${8 - to.row}`;
  }

  /**
   * Parse algebraic notation to move
   */
  parseNotation(board: ChessBoard, notation: string, color: PieceColor): { from: { row: number; col: number }; to: { row: number; col: number } } | null {
    notation = notation.trim().replace(/[+#]$/, ''); // Remove check/checkmate symbols
    const files = 'abcdefgh';

    // Extract destination
    const destMatch = notation.match(/([a-h])([1-8])$/);
    if (!destMatch) return null;

    const toCol = files.indexOf(destMatch[1]);
    const toRow = 8 - parseInt(destMatch[2]);

    // Determine piece type
    let pieceType: PieceType = 'pawn';
    if (notation[0] && 'KQRBN'.includes(notation[0])) {
      const typeMap: Record<string, PieceType> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
      pieceType = typeMap[notation[0]];
    }

    // Find the piece that can make this move
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board[fromRow][fromCol];
        if (piece && piece.type === pieceType && piece.color === color) {
          if (this.isValidMove(board, { row: fromRow, col: fromCol }, { row: toRow, col: toCol }, color)) {
            return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
          }
        }
      }
    }

    return null;
  }

  /**
   * Clone board
   */
  private cloneBoard(board: ChessBoard): ChessBoard {
    return board.map(row => row.map(piece => piece ? { ...piece } : null));
  }

  /**
   * Convert board to FEN notation (simplified)
   */
  boardToString(board: ChessBoard): string {
    let result = '';
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            result += emptyCount;
            emptyCount = 0;
          }
          const symbol = piece.type.charAt(0);
          result += piece.color === 'white' ? symbol.toUpperCase() : symbol.toLowerCase();
        }
      }
      if (emptyCount > 0) result += emptyCount;
      if (row < 7) result += '/';
    }
    return result;
  }
}

export const chessService = ChessService.getInstance();

