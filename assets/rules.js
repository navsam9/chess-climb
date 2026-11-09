// Chess rules for the web climb, ported from the app's Chess.swift: FEN, legal moves, making moves, check and mate,
// castling in either notation, SAN. Squares are 0…63 with a1 = 0, h1 = 7, a8 = 56 and h8 = 63. A piece is a color
// and a letter, "wN" for a white knight, as the piece images are named. A move is { from, to, promotion }, with the
// promotion a lowercase letter or null.

const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHOGONALS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const WHITE_KINGSIDE = 1, WHITE_QUEENSIDE = 2, BLACK_KINGSIDE = 4, BLACK_QUEENSIDE = 8;
const kingside = (color) => (color === "w" ? WHITE_KINGSIDE : BLACK_KINGSIDE);
const queenside = (color) => (color === "w" ? WHITE_QUEENSIDE : BLACK_QUEENSIDE);
const opposite = (color) => (color === "w" ? "b" : "w");

export const file = (square) => square & 7;
export const rank = (square) => square >> 3;

/** The square at a file and rank, or -1 off the board. */
export function at(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;
}

export const squareName = (square) => "abcdefgh"[file(square)] + (rank(square) + 1);

export function parseSquare(text) {
  if (typeof text !== "string" || text.length !== 2) return -1;
  return at(text.charCodeAt(0) - 97, text.charCodeAt(1) - 49);
}

export function parseUci(text) {
  if (text.length !== 4 && text.length !== 5) return null;
  const from = parseSquare(text.slice(0, 2)), to = parseSquare(text.slice(2, 4));
  if (from < 0 || to < 0) return null;
  const promotion = text.length === 5 ? text[4].toLowerCase() : null;
  if (promotion !== null && !"nbrq".includes(promotion)) return null;
  return { from, to, promotion };
}

export const uci = (move) => squareName(move.from) + squareName(move.to) + (move.promotion ?? "");

export const sameMove = (a, b) => !!a && !!b && a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);

export class Position {
  constructor(board, side, castling, enPassant, halfmove, fullmove) {
    this.board = board;          // 64 entries: "wP" … "bK", or null
    this.side = side;            // "w" or "b"
    this.castling = castling;    // a bit for each right
    this.enPassant = enPassant;  // a square, or -1
    this.halfmove = halfmove;
    this.fullmove = fullmove;
  }

  static fromFen(fen) {
    const fields = fen.trim().split(/\s+/);
    if (fields.length < 4) return null;
    const rows = fields[0].split("/");
    if (rows.length !== 8) return null;
    const board = new Array(64).fill(null);
    for (let index = 0; index < 8; index++) {
      const r = 7 - index;
      let f = 0;
      for (const char of rows[index]) {
        if (char >= "1" && char <= "8") {
          f += Number(char);
        } else {
          const kind = char.toUpperCase();
          if (f >= 8 || !"PNBRQK".includes(kind)) return null;
          board[r * 8 + f] = (char === kind ? "w" : "b") + kind;
          f += 1;
        }
      }
      if (f !== 8) return null;
    }
    let castling = 0;
    for (const char of fields[2]) {
      castling |= { K: WHITE_KINGSIDE, Q: WHITE_QUEENSIDE, k: BLACK_KINGSIDE, q: BLACK_QUEENSIDE }[char] ?? 0;
    }
    return new Position(board, fields[1] === "b" ? "b" : "w", castling, fields[3] === "-" ? -1 : parseSquare(fields[3]),
                        fields.length > 4 ? Number(fields[4]) || 0 : 0, fields.length > 5 ? Number(fields[5]) || 1 : 1);
  }

  get fen() {
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = "", empty = 0;
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r * 8 + f];
        if (piece) {
          if (empty > 0) row += empty;
          empty = 0;
          row += piece[0] === "w" ? piece[1] : piece[1].toLowerCase();
        } else {
          empty += 1;
        }
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    let rights = "";
    if (this.castling & WHITE_KINGSIDE) rights += "K";
    if (this.castling & WHITE_QUEENSIDE) rights += "Q";
    if (this.castling & BLACK_KINGSIDE) rights += "k";
    if (this.castling & BLACK_QUEENSIDE) rights += "q";
    return [rows.join("/"), this.side, rights || "-", this.enPassant < 0 ? "-" : squareName(this.enPassant),
            String(this.halfmove), String(this.fullmove)].join(" ");
  }

  clone() {
    return new Position(this.board.slice(), this.side, this.castling, this.enPassant, this.halfmove, this.fullmove);
  }

  // Attacks and check

  kingSquare(color) {
    return this.board.indexOf(color + "K");
  }

  isInCheck(color) {
    const king = this.kingSquare(color);
    return king >= 0 && this.isAttacked(king, opposite(color));
  }

  get isCheck() {
    return this.isInCheck(this.side);
  }

  get isCheckmate() {
    return this.isCheck && this.legalMoves().length === 0;
  }

  isAttacked(square, attacker) {
    const f = file(square), r = rank(square);
    // Pawns capture diagonally forward, so look one rank behind the square from the attacker's side.
    const pawnRank = attacker === "w" ? r - 1 : r + 1;
    for (const step of [-1, 1]) {
      const from = at(f + step, pawnRank);
      if (from >= 0 && this.board[from] === attacker + "P") return true;
    }
    for (const [df, dr] of KNIGHT_JUMPS) {
      const from = at(f + df, r + dr);
      if (from >= 0 && this.board[from] === attacker + "N") return true;
    }
    for (const [df, dr] of KING_STEPS) {
      const from = at(f + df, r + dr);
      if (from >= 0 && this.board[from] === attacker + "K") return true;
    }
    return this._rayHits(square, DIAGONALS, attacker, "B") || this._rayHits(square, ORTHOGONALS, attacker, "R");
  }

  /** Whether a slider of `kind` (or a queen) of `attacker` sees `square` along `directions`. */
  _rayHits(square, directions, attacker, kind) {
    for (const [df, dr] of directions) {
      let f = file(square) + df, r = rank(square) + dr;
      for (let next = at(f, r); next >= 0; next = at(f, r)) {
        const piece = this.board[next];
        if (piece) {
          if (piece[0] === attacker && (piece[1] === kind || piece[1] === "Q")) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }
    return false;
  }

  // Move generation

  legalMoves(from) {
    if (from === undefined) {
      const moves = [];
      for (let square = 0; square < 64; square++) moves.push(...this.legalMoves(square));
      return moves;
    }
    const piece = this.board[from];
    if (!piece || piece[0] !== this.side) return [];
    return this._pseudoLegalMoves(from, piece).filter((move) => !this.playing(move).isInCheck(piece[0]));
  }

  isLegal(move) {
    return this.legalMoves(move.from).some((legal) => sameMove(legal, move));
  }

  _pseudoLegalMoves(square, piece) {
    const moves = [];
    const color = piece[0], f = file(square), r = rank(square);
    const add = (to, promotion = null) => moves.push({ from: square, to, promotion });
    const slide = (directions) => {
      for (const [df, dr] of directions) {
        let tf = f + df, tr = r + dr;
        for (let to = at(tf, tr); to >= 0; to = at(tf, tr)) {
          const other = this.board[to];
          if (other) {
            if (other[0] !== color) add(to);
            break;
          }
          add(to);
          tf += df;
          tr += dr;
        }
      }
    };
    switch (piece[1]) {
      case "P": {
        const forward = color === "w" ? 1 : -1;
        const promotes = r + forward === (color === "w" ? 7 : 0);
        const addPawnMove = (to) => {
          if (promotes) {
            for (const kind of ["q", "r", "b", "n"]) add(to, kind);
          } else {
            add(to);
          }
        };
        const one = at(f, r + forward);
        if (one >= 0 && !this.board[one]) {
          addPawnMove(one);
          const two = at(f, r + 2 * forward);
          if (r === (color === "w" ? 1 : 6) && two >= 0 && !this.board[two]) add(two);
        }
        for (const step of [-1, 1]) {
          const to = at(f + step, r + forward);
          if (to < 0) continue;
          const other = this.board[to];
          if (other) {
            if (other[0] !== color) addPawnMove(to);
          } else if (to === this.enPassant) {
            add(to);
          }
        }
        break;
      }
      case "N":
        for (const [df, dr] of KNIGHT_JUMPS) {
          const to = at(f + df, r + dr);
          if (to >= 0 && this.board[to]?.[0] !== color) add(to);
        }
        break;
      case "B":
        slide(DIAGONALS);
        break;
      case "R":
        slide(ORTHOGONALS);
        break;
      case "Q":
        slide(DIAGONALS.concat(ORTHOGONALS));
        break;
      case "K": {
        for (const [df, dr] of KING_STEPS) {
          const to = at(f + df, r + dr);
          if (to >= 0 && this.board[to]?.[0] !== color) add(to);
        }
        const home = color === "w" ? 4 : 60;
        const enemy = opposite(color);
        if (square === home && !this.isAttacked(home, enemy)) {
          const rook = color + "R";
          if ((this.castling & kingside(color)) && !this.board[home + 1] && !this.board[home + 2]
              && this.board[home + 3] === rook && !this.isAttacked(home + 1, enemy) && !this.isAttacked(home + 2, enemy)) {
            add(home + 2);
          }
          if ((this.castling & queenside(color)) && !this.board[home - 1] && !this.board[home - 2] && !this.board[home - 3]
              && this.board[home - 4] === rook && !this.isAttacked(home - 1, enemy) && !this.isAttacked(home - 2, enemy)) {
            add(home - 2);
          }
        }
        break;
      }
    }
    return moves;
  }

  // Making moves

  isCapture(move) {
    return !!this.board[move.to] || this.isEnPassant(move);
  }

  isEnPassant(move) {
    const piece = this.board[move.from];
    if (!piece || piece[1] !== "P") return false;
    return move.to === this.enPassant && !this.board[move.to] && file(move.from) !== file(move.to);
  }

  isCastling(move) {
    return this.board[move.from]?.[1] === "K" && Math.abs(move.to - move.from) === 2;
  }

  /** Plays a move without checking that it is legal. */
  play(move) {
    const piece = this.board[move.from];
    if (!piece) return;
    const color = piece[0];
    const capture = this.isCapture(move);
    if (this.isEnPassant(move)) this.board[move.to + (color === "w" ? -8 : 8)] = null;
    if (this.isCastling(move)) {
      const isKingside = move.to > move.from;
      const rookFrom = isKingside ? move.from + 3 : move.from - 4;
      this.board[isKingside ? move.from + 1 : move.from - 1] = this.board[rookFrom];
      this.board[rookFrom] = null;
    }
    this.board[move.to] = move.promotion ? color + move.promotion.toUpperCase() : piece;
    this.board[move.from] = null;

    if (piece[1] === "K") this.castling &= ~(kingside(color) | queenside(color));
    for (const square of [move.from, move.to]) {
      if (square === 0) this.castling &= ~WHITE_QUEENSIDE;
      if (square === 7) this.castling &= ~WHITE_KINGSIDE;
      if (square === 56) this.castling &= ~BLACK_QUEENSIDE;
      if (square === 63) this.castling &= ~BLACK_KINGSIDE;
    }
    this.enPassant = piece[1] === "P" && Math.abs(move.to - move.from) === 16 ? (move.from + move.to) / 2 : -1;
    this.halfmove = piece[1] === "P" || capture ? 0 : this.halfmove + 1;
    if (this.side === "b") this.fullmove += 1;
    this.side = opposite(this.side);
  }

  playing(move) {
    const next = this.clone();
    next.play(move);
    return next;
  }

  /** Maps king-takes-own-rook castling notation (e1h1) to the king's two-square move (e1g1). */
  normalized(move) {
    const king = this.board[move.from];
    if (!king || king[1] !== "K" || this.board[move.to] !== king[0] + "R" || rank(move.from) !== rank(move.to)) return move;
    return { from: move.from, to: move.to > move.from ? move.from + 2 : move.from - 2, promotion: null };
  }

  // Notation

  san(move) {
    const piece = this.board[move.from];
    if (!piece) return uci(move);
    let text;
    if (this.isCastling(move)) {
      text = move.to > move.from ? "O-O" : "O-O-O";
    } else if (piece[1] === "P") {
      text = this.isCapture(move) ? "abcdefgh"[file(move.from)] + "x" + squareName(move.to) : squareName(move.to);
      if (move.promotion) text += "=" + move.promotion.toUpperCase();
    } else {
      text = piece[1];
      const rivals = this.legalMoves().filter((other) => other.to === move.to && other.from !== move.from
                                                         && this.board[other.from] === piece);
      if (rivals.length > 0) {
        if (!rivals.some((other) => file(other.from) === file(move.from))) {
          text += "abcdefgh"[file(move.from)];
        } else if (!rivals.some((other) => rank(other.from) === rank(move.from))) {
          text += String(rank(move.from) + 1);
        } else {
          text += squareName(move.from);
        }
      }
      if (this.isCapture(move)) text += "x";
      text += squareName(move.to);
    }
    const after = this.playing(move);
    if (after.isCheck) text += after.legalMoves().length === 0 ? "#" : "+";
    return text;
  }

  /** Number of leaf positions `depth` plies deep; the standard way to test move generation. */
  perft(depth) {
    if (depth <= 0) return 1;
    const moves = this.legalMoves();
    if (depth === 1) return moves.length;
    return moves.reduce((sum, move) => sum + this.playing(move).perft(depth - 1), 0);
  }
}
