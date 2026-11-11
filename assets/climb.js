// Today's climb on the web: the same ten puzzles the apps give that day, played as in the app. Ten puzzles from 600 to
// 2400, one miss ends the climb, the squares to share at the end. The day's puzzles come from climbs/YYYY-MM.json,
// written by the app's own code, so the page and both phones agree. Nothing is sent anywhere: the day's progress is
// kept in this browser so a reload carries on.

import { Position, parseUci, sameMove, uci, rank } from "./rules.js";

const SITE = "https://playchessclimb.com";
const RUNGS = 10;
const APP_STORE = "https://apps.apple.com/app/id6815836856";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.navidsamiei.chessclimb";
// The app on an Android phone that has it, on Today's climb's card; Google Play if it has gone since (findApp).
const OPEN_APP = "intent://playchessclimb.com/#Intent;scheme=https;package=com.navidsamiei.chessclimb;"
  + `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`;
const PROGRESS_KEY = "chessclimb.today";
const SOUND_KEY = "chessclimb.sound";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// The app's timings (FeedModel): the setup move after 0.5 s, sliding for 0.35 s; the reply 0.3 s after a right move,
// over 0.25 s; a tapped move 0.16 s; the next puzzle 1 s after a solve, its default; a miss's cross for 0.45 s before
// the board turns back; the end's card 1.5 s after the last result, or after a fall's solution has played.
const T = { intro: 500, setup: 350, replyWait: 300, reply: 250, tap: 160, advance: 1000, cross: 450, turnBack: 250,
            settle: 200, endCard: 1500, arrow: 800, solutionMove: 300, solutionGap: 700 };

const BOARD = { light: "#F0D9B5", dark: "#B58863" };
const COLORS = {
  lastMove: "rgba(155, 199, 0, 0.41)",
  selected: "rgba(20, 85, 30, 0.5)",
  touch: "rgba(0, 0, 0, 0.15)",
  hint: "#3692E7",
  arrow: "rgba(21, 120, 27, 0.8)",
  wrongArrow: "rgba(204, 51, 51, 0.8)",
  correct: "#629924",
  wrong: "#CC3333",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ICONS = {
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  piece: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2.5a2.5 2.5 0 0 1 4.6 1.4c0 .4-.1.7-.3 1.1h3.2c.8 0 1.5.7 1.5 1.5v3.2c.4-.2.7-.3 1.1-.3a2.5 2.5 0 1 1 0 5c-.4 0-.7-.1-1.1-.3v3.4c0 .8-.7 1.5-1.5 1.5h-3.4c.2-.3.3-.7.3-1.1a2.5 2.5 0 1 0-5 0c0 .4.1.8.3 1.1H5.5c-.8 0-1.5-.7-1.5-1.5v-3.4c.3.2.7.3 1.1.3a2.5 2.5 0 1 0 0-5c-.4 0-.8.1-1.1.3V6.5C4 5.7 4.7 5 5.5 5h4.8c-.2-.4-.3-.7-.3-1.1z"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.2h5v-.2c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.4l3.3 3.3L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = (selector) => document.querySelector(selector);
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// MARK: Days and words

/** The visitor's local date as yyyymmdd, always Gregorian, as the phones key Today's climb. */
function dayKey(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function dayParts(key) {
  return { year: Math.floor(key / 10000), month: Math.floor(key / 100) % 100, day: key % 100 };
}

/** "Nov 9", as the share says it. */
function shortDate(key) {
  const { month, day } = dayParts(key);
  return `${MONTHS[month - 1]} ${day}`;
}

/** "Monday, Nov 9", as the climb's card says it. */
function longDate(key) {
  const { year, month, day } = dayParts(key);
  return `${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}, ${shortDate(key)}`;
}

function monthFile(key) {
  const { year, month } = dayParts(key);
  return `climbs/${year}-${String(month).padStart(2, "0")}.json`;
}

/** "12 s", "1 min", "1 min 5 s", as the app's result says it. */
function thinkingTime(seconds) {
  const total = Math.max(1, Math.round(seconds));
  if (total < 60) return `${total} s`;
  return total % 60 === 0 ? `${total / 60} min` : `${Math.floor(total / 60)} min ${total % 60} s`;
}

function clockText(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** The app's share, with the site's address under it. */
function shareText(day, cleared, fell) {
  const squares = "🟩".repeat(cleared) + (fell ? "❌" : "") + "⬜".repeat(Math.max(0, RUNGS - cleared - (fell ? 1 : 0)));
  return `Chess Climb · ${shortDate(day)} · ${cleared} of ${RUNGS}\n${squares}\n${SITE}`;
}

function rungsHTML(cleared, fell, size) {
  let html = `<div class="rungs" style="--rung:${size}px" role="img" aria-label="${cleared} of ${RUNGS} solved">`;
  for (let rung = 0; rung < RUNGS; rung++) {
    const fall = fell && rung === cleared;
    html += `<span class="rung${rung < cleared ? " solved" : fall ? " fall" : ""}">${fall ? "×" : ""}</span>`;
  }
  return html + "</div>";
}

// MARK: Where the visitor is

const root = document.documentElement;
const platform = root.dataset.platform ?? "other";
const inApp = root.hasAttribute("data-inapp");
let hasApp = false;    // an Android phone with the app, once findApp has asked Chrome

/** Straight to the visitor's store, or to the badges where a store can't open from here (TikTok's browser, a computer);
 *  the app itself on an Android phone that has it. */
function storeLink() {
  if (hasApp) return OPEN_APP;
  if (inApp) return "#get";
  if (platform === "ios") return APP_STORE;
  if (platform === "android") return PLAY_STORE;
  return "#get";
}

/** What the store buttons say. */
function storeLabel() {
  return hasApp ? "Open the app" : "Get the app";
}

/** Whether Chrome on Android finds the app: the app names this site in its asset_statements (from 1.3.1), and
 *  manifest.webmanifest names the app. An iPhone can't be asked; Safari's banner offers Open there (index.html). */
async function findApp() {
  if (platform !== "android" || inApp || !navigator.getInstalledRelatedApps) return false;
  try {
    const apps = await navigator.getInstalledRelatedApps();
    return apps.some((app) => app.id === "com.navidsamiei.chessclimb");
  } catch {
    return false;
  }
}

// MARK: Storage, a convenience: a private window or blocked storage only loses the day's progress

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* the climb still plays */ }
  },
};

function loadProgress(day) {
  try {
    const saved = JSON.parse(storage.get(PROGRESS_KEY) ?? "null");
    if (saved && saved.day === day && Number.isInteger(saved.solved)) return saved;
  } catch { /* a fresh start */ }
  return { day, solved: 0, started: false, ended: false, fell: false, result: null, wrong: null, missPly: null };
}

const saveProgress = (progress) => storage.set(PROGRESS_KEY, JSON.stringify(progress));

// MARK: Sounds: the app's four, through Web Audio, which starts only from a tap

class Sounds {
  constructor() {
    this.on = storage.get(SOUND_KEY) !== "off";
    this.context = null;
    this.buffers = {};
  }

  unlock() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    // As the app's ambient session: quiet with the ring switch off, and mixed with music.
    try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch { /* older browsers */ }
    this.context = new Context();
    for (const name of ["move", "capture", "success", "miss"]) {
      fetch(`assets/sounds/${name}.wav`)
        .then((response) => response.arrayBuffer())
        .then((data) => this.context.decodeAudioData(data))
        .then((buffer) => { this.buffers[name] = buffer; })
        .catch(() => {});
    }
  }

  play(name) {
    if (!this.on || !this.context || !this.buffers[name]) return;
    if (this.context.state === "suspended") this.context.resume();
    const source = this.context.createBufferSource();
    source.buffer = this.buffers[name];
    source.connect(this.context.destination);
    source.start();
  }

  toggle() {
    this.on = !this.on;
    storage.set(SOUND_KEY, this.on ? "on" : "off");
    if (this.on) this.unlock();
  }
}

// MARK: The board's pieces, each keeping its identity so moves slide

let nextPieceID = 1;

class BoardModel {
  constructor(position) {
    this.position = position;
    this.items = [];
    position.board.forEach((piece, square) => {
      if (piece) this.items.push({ id: nextPieceID++, piece, square });
    });
  }

  clone() {
    const copy = Object.create(BoardModel.prototype);
    copy.position = this.position.clone();
    copy.items = this.items.map((item) => ({ ...item }));
    return copy;
  }

  play(move) {
    const position = this.position;
    const piece = position.board[move.from];
    if (!piece) return;
    const captured = position.isEnPassant(move) ? move.to + (piece[0] === "w" ? -8 : 8) : position.board[move.to] ? move.to : -1;
    if (captured >= 0) this.items = this.items.filter((item) => item.square !== captured);
    if (position.isCastling(move)) {
      const kingside = move.to > move.from;
      const rook = this.items.find((item) => item.square === (kingside ? move.from + 3 : move.from - 4));
      if (rook) rook.square = kingside ? move.from + 1 : move.from - 1;
    }
    const mover = this.items.find((item) => item.square === move.from);
    if (mover) {
      mover.square = move.to;
      if (move.promotion) mover.piece = piece[0] + move.promotion.toUpperCase();
    }
    this.position = position.playing(move);
  }
}

// MARK: The board, with drag and tap, as the app's BoardView

class BoardView {
  constructor(element, handlers) {
    this.element = element;
    this.canvas = element.querySelector("canvas");
    this.layer = element.querySelector(".pieces");
    this.overlay = element.querySelector(".overlay");
    this.picker = element.querySelector(".promotion");
    this.handlers = handlers;
    this.model = new BoardModel(Position.fromFen(START_FEN));
    this.lastMove = null;
    this.marks = [];
    this.arrows = [];
    this.hintSquare = -1;
    this.interactive = false;
    this.ahead = null;          // the position after the opponent's coming reply: touches are read there meanwhile
    this.selected = -1;
    this.pointer = null;
    this.start = null;
    this.drag = null;
    this.press = null;
    this.promotion = null;
    this.premove = null;        // a move made before the reply came, played as it starts
    this.images = new Map();
    this.size = 0;
    this.shows = 0;

    new ResizeObserver(() => this.resize()).observe(element);
    element.addEventListener("pointerdown", (event) => this.pointerDown(event));
    element.addEventListener("pointermove", (event) => this.pointerMove(event));
    element.addEventListener("pointerup", (event) => this.pointerUp(event));
    element.addEventListener("pointercancel", () => this.cancelTouch());
    element.addEventListener("contextmenu", (event) => event.preventDefault());
    // A tap off the board drops the selection, as in the app.
    document.addEventListener("pointerdown", (event) => {
      if (!element.contains(event.target) && (this.selected >= 0 || this.premove)) {
        this.selected = -1;
        this.premove = null;
        this.draw();
      }
    });
    this.resize();
  }

  get unit() { return this.size / 8; }
  get inputPosition() { return this.ahead ?? this.model.position; }

  /** Shows `model`, sliding the pieces over `duration` ms. */
  show(model, duration = 0) {
    this.shows += 1;
    this.model = model;
    this.renderPieces(duration);
    this.draw();
  }

  set(state) {
    const wasAhead = this.ahead !== null;
    Object.assign(this, state);
    if ("interactive" in state && !state.interactive) {
      this.selected = -1;
      this.drag = null;
      this.press = null;
      this.premove = null;
      this.closePicker();
    }
    this.element.classList.toggle("live", this.interactive);
    this.draw();
    this.drawOverlay();
    // The reply is in: a move made before it goes now, as the reply starts.
    if (wasAhead && this.ahead === null && this.premove && this.interactive) {
      const move = this.premove;
      this.premove = null;
      this.handlers.onMove(move, true);
    }
  }

  resize() {
    const size = this.element.clientWidth;
    if (!size || size === this.size) return;
    this.size = size;
    this.element.parentElement.style.setProperty("--board-px", `${size}px`);    // where the card over the board centres
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(size * ratio);
    this.canvas.height = Math.round(size * ratio);
    this.renderPieces(0);
    this.draw();
    this.drawOverlay();
  }

  // Geometry: White at the bottom, always (every climb puzzle is played as White).

  origin(square) {
    return { x: (square & 7) * this.unit, y: (7 - (square >> 3)) * this.unit };
  }

  squareAt(point) {
    const column = Math.floor(point.x / this.unit), row = Math.floor(point.y / this.unit);
    return column >= 0 && column < 8 && row >= 0 && row < 8 ? (7 - row) * 8 + column : -1;
  }

  point(event) {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // Pieces

  renderPieces(duration) {
    const unit = this.unit;
    if (!unit) return;
    const seen = new Set();
    for (const item of this.model.items) {
      seen.add(item.id);
      let image = this.images.get(item.id);
      const fresh = !image;
      if (fresh) {
        image = document.createElement("img");
        image.className = "piece";
        image.alt = "";
        image.draggable = false;
        this.layer.appendChild(image);
        this.images.set(item.id, image);
      }
      if (image.dataset.piece !== item.piece) {
        image.src = `assets/pieces/${item.piece}.svg`;
        image.dataset.piece = item.piece;
      }
      image.style.width = image.style.height = `${unit}px`;
      if (this.drag?.lifted && this.drag.pieceID === item.id) continue;
      const { x, y } = this.origin(item.square);
      if (fresh && duration > 0) {
        // A piece taken back fades in as the move reverses.
        image.style.transition = "none";
        image.style.opacity = "0";
        image.style.translate = `${x}px ${y}px`;
        image.getBoundingClientRect();
        image.style.transition = `opacity ${duration * 0.25}ms linear`;
        image.style.opacity = "1";
      } else {
        image.style.transition = duration > 0 ? `translate ${duration}ms ease-in-out, scale 30ms ease-out` : "scale 30ms ease-out";
        image.style.translate = `${x}px ${y}px`;
        image.style.opacity = "1";
      }
    }
    for (const [id, image] of this.images) {
      if (seen.has(id)) continue;
      this.images.delete(id);
      // A captured piece stays while the capturing piece comes, then fades as it lands.
      image.style.transition = duration > 0 ? `opacity ${duration * 0.25}ms linear ${duration * 0.75}ms` : "none";
      image.style.opacity = "0";
      setTimeout(() => image.remove(), duration + 30);
    }
  }

  placeLifted() {
    const image = this.images.get(this.drag.pieceID);
    if (!image) return;
    const unit = this.unit, { x, y } = this.drag.location;
    // On a touch screen the piece grows to twice its size and stands on the finger, as in the app; a mouse holds it
    // by its middle.
    const touch = this.drag.touch;
    image.classList.add("lifted");
    image.style.transition = "scale 100ms ease-out";
    image.style.scale = touch ? "2" : "1";
    image.style.translate = `${x - unit / 2}px ${touch ? y - unit : y - unit / 2}px`;
  }

  dropLifted(drag) {
    const image = this.images.get(drag.pieceID);
    if (!image) return;
    image.classList.remove("lifted");
    image.style.scale = "1";
  }

  // Squares, highlights and coordinates, drawn as the app's Canvas draws them

  touchedSquare() {
    if (!this.interactive) return -1;
    if (this.drag) return this.drag.lifted ? this.squareAt(this.drag.location) : this.drag.from;
    if (this.press) return this.press.moved ? this.squareAt(this.press.location) : this.press.square;
    return -1;
  }

  draw() {
    const context = this.canvas.getContext("2d");
    const ratio = this.canvas.width / (this.size || 1);
    const unit = this.unit;
    if (!unit) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    for (let square = 0; square < 64; square++) {
      const { x, y } = this.origin(square);
      context.fillStyle = ((square & 7) + (square >> 3)) % 2 === 1 ? BOARD.light : BOARD.dark;
      context.fillRect(x, y, unit, unit);
    }
    const position = this.model.position;
    const checkSquare = position.isCheck ? position.kingSquare(position.side) : -1;
    const highlighted = this.drag?.from ?? this.selected;
    const touched = this.touchedSquare();
    const doubled = touched >= 0 && touched === this.selected && highlighted === this.selected ? touched : -1;
    if (this.drag?.lifted && touched >= 0) {
      // Under the highlights, so the touched square keeps its full color.
      const { x, y } = this.origin(touched);
      context.fillStyle = COLORS.touch;
      context.beginPath();
      context.arc(x + unit / 2, y + unit / 2, unit * 1.2, 0, Math.PI * 2);
      context.fill();
    }
    for (let square = 0; square < 64; square++) {
      const { x, y } = this.origin(square);
      if (this.lastMove && (square === this.lastMove.from || square === this.lastMove.to)) {
        context.fillStyle = COLORS.lastMove;
        context.fillRect(x, y, unit, unit);
      }
      if (this.interactive && (square === highlighted || square === touched || square === this.premove?.from
                               || square === this.premove?.to)) {
        context.fillStyle = COLORS.selected;
        context.fillRect(x, y, unit, unit);
        if (square === doubled) context.fillRect(x, y, unit, unit);
      }
      if (square === checkSquare) {
        const gradient = context.createRadialGradient(x + unit / 2, y + unit / 2, 0, x + unit / 2, y + unit / 2, unit * 0.7);
        gradient.addColorStop(0, "rgba(255, 0, 0, 1)");
        gradient.addColorStop(0.5, "rgba(255, 0, 0, 0.5)");
        gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
        context.fillStyle = gradient;
        context.fillRect(x, y, unit, unit);
      }
      if (square === this.hintSquare) {
        context.strokeStyle = COLORS.hint;
        context.lineWidth = unit * 0.09;
        context.beginPath();
        context.arc(x + unit / 2, y + unit / 2, unit / 2 - unit * 0.06 - unit * 0.045, 0, Math.PI * 2);
        context.stroke();
      }
    }
    // The bottom-left square is always dark.
    context.font = `600 ${unit * 0.2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let index = 0; index < 8; index++) {
      context.fillStyle = index % 2 === 0 ? BOARD.light : BOARD.dark;
      context.fillText("abcdefgh"[index], index * unit + unit * 0.86, unit * 7.84);
      context.fillStyle = index % 2 === 0 ? BOARD.dark : BOARD.light;
      context.fillText(String(8 - index), unit * 0.12, index * unit + unit * 0.17);
    }
  }

  /** Arrows and the check and cross marks over the board, drawn as the app draws them. */
  drawOverlay() {
    const u = this.unit;
    if (!u) return;
    let svg = "";
    const center = (square) => ({ x: ((square & 7) + 0.5) * u, y: (7 - (square >> 3) + 0.5) * u });
    for (const arrow of this.arrows) {
      const start = center(arrow.from), end = center(arrow.to);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const neck = { x: end.x - Math.cos(angle) * u * 0.45, y: end.y - Math.sin(angle) * u * 0.45 };
      const side = { x: -Math.sin(angle) * u * 0.3, y: Math.cos(angle) * u * 0.3 };
      const color = arrow.kind === "wrong" ? COLORS.wrongArrow : COLORS.arrow;
      svg += `<line x1="${start.x}" y1="${start.y}" x2="${neck.x}" y2="${neck.y}" stroke="${color}" stroke-width="${u * 0.2}" stroke-linecap="round"/>`
        + `<path d="M${end.x} ${end.y}L${neck.x + side.x} ${neck.y + side.y}L${neck.x - side.x} ${neck.y - side.y}Z" fill="${color}"/>`;
    }
    for (const mark of this.marks) {
      // A badge at the square's top right corner, as the app's check and cross.
      const x = ((mark.square & 7) + 0.84) * u, y = (7 - (mark.square >> 3) + 0.16) * u, r = u * 0.21;
      const glyph = mark.kind === "correct"
        ? `M${x - r * 0.45} ${y + r * 0.02}l${r * 0.3} ${r * 0.3}l${r * 0.62} ${-r * 0.62}`
        : `M${x - r * 0.36} ${y - r * 0.36}l${r * 0.72} ${r * 0.72}M${x + r * 0.36} ${y - r * 0.36}l${-r * 0.72} ${r * 0.72}`;
      svg += `<g class="mark"><circle cx="${x}" cy="${y}" r="${r}" fill="${mark.kind === "correct" ? COLORS.correct : COLORS.wrong}"/>`
        + `<path d="${glyph}" fill="none" stroke="#fff" stroke-width="${r * 0.26}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    const box = `0 0 ${this.size} ${this.size}`;
    if (this.overlay.getAttribute("viewBox") !== box) this.overlay.setAttribute("viewBox", box);
    if (this.overlay.dataset.svg !== svg) {
      this.overlay.innerHTML = svg;
      this.overlay.dataset.svg = svg;
    }
  }

  // Input, as the app's drag gesture: drag a piece, or tap it and then its square. A held press on a target can slide.

  targets(from) {
    return new Set(this.inputPosition.legalMoves(from).map((move) => move.to));
  }

  pointerDown(event) {
    if (!this.interactive || this.promotion || this.pointer !== null || event.button > 0) return;
    const point = this.point(event);
    const from = this.squareAt(point);
    if (from < 0) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.start = point;
    this.premove = null;    // a new touch takes the place of a move waiting for the reply
    const position = this.inputPosition;
    const item = this.model.items.find((candidate) => candidate.square === from);
    if (item && item.piece[0] === position.side && position.board[from]?.[0] === item.piece[0]) {
      this.drag = { pieceID: item.id, from, start: point, location: point, lifted: false, touch: event.pointerType !== "mouse" };
      this.handlers.onTouchDown();
    } else if (this.selected >= 0) {
      this.press = { square: from, start: point, location: point, moved: false };
      this.handlers.onTouchDown();
    }
    try { this.element.setPointerCapture(event.pointerId); } catch { /* the board still gets the touch */ }
    this.draw();
  }

  pointerMove(event) {
    if (event.pointerId !== this.pointer) return;
    const point = this.point(event);
    if (this.drag) {
      this.drag.location = point;
      if (Math.hypot(point.x - this.drag.start.x, point.y - this.drag.start.y) > 6) this.drag.lifted = true;
      if (this.drag.lifted) this.placeLifted();
      this.draw();
    } else if (this.press) {
      this.press.location = point;
      if (Math.hypot(point.x - this.press.start.x, point.y - this.press.start.y) > 6) this.press.moved = true;
      this.draw();
    }
  }

  pointerUp(event) {
    if (event.pointerId !== this.pointer) return;
    this.pointer = null;
    const point = this.point(event);
    const current = this.drag, pressed = this.press;
    this.drag = null;
    this.press = null;
    if (current?.lifted) {
      this.dropLifted(current);
      const shows = this.shows;
      if (Math.hypot(point.x - current.start.x, point.y - current.start.y) > this.unit * 0.3) {
        const to = this.squareAt(point);
        if (to >= 0 && to !== current.from && this.targets(current.from).has(to)) {
          this.attempt(current.from, to, false);
        } else {
          this.selected = current.from;
        }
        // Back to its square, unless the move was played: one waiting for the reply, a promotion to pick, or none.
        if (this.shows === shows) this.renderPieces(0);
        this.draw();
        return;
      }
      this.renderPieces(0);
    }
    // The finger slid from the pressed square: the move goes where it lets go, or nowhere.
    if (pressed) {
      pressed.location = point;
      if (Math.hypot(point.x - pressed.start.x, point.y - pressed.start.y) > 6) pressed.moved = true;
    }
    if (pressed?.moved) {
      const to = this.squareAt(pressed.location);
      if (this.selected >= 0 && to >= 0 && this.targets(this.selected).has(to)) this.attempt(this.selected, to, true);
      this.draw();
      return;
    }
    const tapped = this.squareAt(this.start);
    const position = this.inputPosition;
    if (tapped < 0) {
      this.selected = -1;
    } else if (this.selected >= 0 && this.selected !== tapped && this.targets(this.selected).has(tapped)) {
      this.attempt(this.selected, tapped, true);
    } else if (position.board[tapped]?.[0] === position.side) {
      this.selected = tapped;
    } else {
      this.selected = -1;
    }
    this.draw();
  }

  cancelTouch() {
    if (this.drag?.lifted) this.dropLifted(this.drag);
    this.pointer = null;
    this.drag = null;
    this.press = null;
    this.renderPieces(0);
    this.draw();
  }

  attempt(from, to, animated) {
    this.selected = -1;
    const piece = this.inputPosition.board[from];
    if (piece?.[1] === "P" && rank(to) === (piece[0] === "w" ? 7 : 0)) {
      this.openPicker(from, to);
    } else {
      this.play({ from, to, promotion: null }, animated);
    }
  }

  play(move, animated) {
    if (this.ahead) {
      this.premove = move;
      this.draw();
    } else {
      this.handlers.onMove(move, animated);
    }
  }

  openPicker(from, to) {
    this.promotion = { from, to };
    const color = this.inputPosition.board[from][0];
    const { x, y } = this.origin(to);
    const direction = y < this.unit * 4 ? 1 : -1;
    this.picker.innerHTML = ["q", "n", "r", "b"].map((kind, index) =>
      `<button type="button" data-kind="${kind}" style="left:${x}px;top:${y + index * this.unit * direction}px;width:${this.unit}px;height:${this.unit}px" aria-label="${{ q: "Queen", n: "Knight", r: "Rook", b: "Bishop" }[kind]}">`
      + `<img src="assets/pieces/${color}${kind.toUpperCase()}.svg" alt=""></button>`).join("");
    this.picker.hidden = false;
    this.picker.onclick = (event) => {
      const kind = event.target.closest("button")?.dataset.kind;
      const pending = this.promotion;
      this.closePicker();
      if (kind && pending) this.play({ from: pending.from, to: pending.to, promotion: kind }, true);
    };
  }

  closePicker() {
    this.promotion = null;
    this.picker.hidden = true;
    this.picker.innerHTML = "";
  }
}

// MARK: One puzzle's rules, as the app's PuzzleSession

class Session {
  constructor(puzzle) {
    this.position = Position.fromFen(puzzle.fen);
    this.moves = puzzle.moves.map(parseUci);
    this.ply = 0;
    this.status = "setup";
    this.hintUsed = false;
    this.wrongMove = null;
    this.played = [];
  }

  get expectedMove() {
    return this.ply < this.moves.length ? this.position.normalized(this.moves[this.ply]) : null;
  }

  get result() {
    if (this.status === "solved") return this.hintUsed ? "hinted" : "solved";
    if (this.status === "failed") return this.wrongMove ? "missed" : "gaveUp";
    return null;
  }

  playSetup() {
    const move = this._advance();
    this.status = "player";
    return move;
  }

  /** Checks a legal move by the player. Any checkmate counts as correct, as on Lichess. */
  submit(move) {
    const after = this.position.playing(move);
    if (!sameMove(move, this.expectedMove) && !after.isCheckmate) {
      this.wrongMove = move;
      this.status = "failed";
      return "wrong";
    }
    this.position = after;
    this.played.push(move);
    this.ply += 1;
    if (after.isCheckmate || this.ply >= this.moves.length) {
      this.status = "solved";
      return "completed";
    }
    this.status = "opponent";
    return "correct";
  }

  playReply() {
    const move = this._advance();
    this.status = "player";
    return move;
  }

  useHint() {
    if (this.status !== "player" || !this.expectedMove) return -1;
    this.hintUsed = true;
    return this.expectedMove.from;
  }

  giveUp() {
    if (this.status === "player" || this.status === "opponent") this.status = "failed";
  }

  /** The rest of the solution from the current position (a wrong move is never applied). */
  remainingLine() {
    const board = this.position.clone();
    const line = [];
    for (let index = this.ply; index < this.moves.length; index++) {
      const move = board.normalized(this.moves[index]);
      line.push(move);
      board.play(move);
    }
    return line;
  }

  _advance() {
    const move = this.position.normalized(this.moves[this.ply]);
    this.position.play(move);
    this.played.push(move);
    this.ply += 1;
    return move;
  }
}

// MARK: A missed puzzle's solution to step through, as the app's EarlierCard

class Study {
  /** `start` is the puzzle's board before the setup move; `wrong` the wrong move, played at `missPly`. */
  constructor(puzzle, start, result, wrong, missPly) {
    const session = new Session(puzzle);
    const board = start.clone();
    const setup = session.playSetup();
    board.play(setup);
    this.frames = [{ board: board.clone(), move: setup }];
    for (const move of session.remainingLine()) {
      board.play(move);
      this.frames.push({ board: board.clone(), move });
    }
    this.result = result;
    // The player's moves are the odd plies, so the position before the wrong one is frame ply − 1.
    if (wrong && missPly >= 1 && missPly - 1 < this.frames.length) {
      const frame = missPly - 1;
      this.mistake = { frame, move: wrong, san: this.frames[frame].board.position.san(wrong) };
    } else {
      this.mistake = null;
    }
    this.index = this.mistake?.frame ?? 0;
  }

  get frame() { return this.frames[this.index]; }

  /** At the mistake, the wrong move in red and the answer in green; after a give-up, the answer. */
  get arrows() {
    if (this.index + 1 >= this.frames.length) return [];
    const answer = this.frames[this.index + 1].move;
    if (this.mistake && this.mistake.frame === this.index) {
      return [{ from: this.mistake.move.from, to: this.mistake.move.to, kind: "wrong" }, { from: answer.from, to: answer.to }];
    }
    if (!this.mistake && this.result !== "solved" && this.index === 0) return [{ from: answer.from, to: answer.to }];
    return [];
  }

  get label() {
    if (this.mistake && this.index === this.mistake.frame) return { text: `You played ${this.mistake.san}`, kind: "wrong" };
    if (this.index === 0) return { text: "Start", kind: "plain" };
    return { text: `Step ${this.index} of ${this.frames.length - 1}`, kind: "plain" };
  }

  /** The frame showing `position`, to keep ‹ › in step with the solution as it plays out. */
  follow(position) {
    const shown = this.frames.findIndex((frame) => frame.board.position.fen === position.fen);
    if (shown >= 0) this.index = shown;
  }
}

// MARK: The climb

class Climb {
  constructor() {
    this.sounds = new Sounds();
    this.view = new BoardView($("#board"), {
      onMove: (move, animated) => this.userMove(move, animated),
      onTouchDown: () => this.sounds.unlock(),
    });
    this.section = $("#climb");
    this.header = $("#puzzle-header");
    this.under = $("#under");
    this.controls = $("#controls");
    this.cardLayer = $("#board-card");
    this.day = dayKey();
    this.progress = loadProgress(this.day);
    this.ladder = undefined;    // undefined while loading, null when the day has no climb
    this.failed = false;
    this.card = null;           // the puzzle on the board
    this.armed = null;
    this.armTimer = null;
    this.endStage = null;       // once the climb has ended: "card" over the board, then "closed" with the share above it

    this.setUpChrome();
    this.render();
    this.load();
    setInterval(() => this.tick(), 250);
    document.addEventListener("visibilitychange", () => this.visibilityChanged());
  }

  setUpChrome() {
    const sound = $("#sound");
    const showSound = () => {
      sound.innerHTML = this.sounds.on ? ICONS.soundOn : ICONS.soundOff;
      sound.setAttribute("aria-label", this.sounds.on ? "Sound on" : "Sound off");
      sound.setAttribute("aria-pressed", String(this.sounds.on));
    };
    showSound();
    sound.addEventListener("click", () => {
      this.sounds.toggle();
      showSound();
    });
    const showStore = () => {
      for (const link of document.querySelectorAll("[data-store]")) {
        link.href = storeLink();
        link.textContent = storeLabel();
      }
    };
    showStore();
    findApp().then((found) => {
      if (!found) return;
      hasApp = true;
      showStore();
    });
    this.section.addEventListener("click", (event) => this.clicked(event));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.endStage === "card") this.closeEndCard();
      if (this.card?.study && this.endStage !== "card" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        this.step(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
  }

  async load() {
    this.failed = false;
    this.ladder = undefined;
    this.render();
    try {
      const response = await fetch(monthFile(this.day), { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      const month = await response.json();
      this.ladder = month.days?.[String(this.day)] ?? null;
    } catch {
      this.failed = true;
    }
    if (this.ladder && this.progress.ended) this.showEnded();
    this.render();
  }

  // The day's state

  get status() {
    if (this.failed) return "failed";
    if (this.ladder === undefined) return "loading";
    if (this.ladder === null) return "unavailable";
    if (this.progress.ended) return "ended";
    if (this.card) return "playing";
    return "ready";
  }

  /** When the day turns over, a climb not started or already ended gives way to the new day's. One under way keeps
   *  its day, as in the app. */
  checkDay() {
    const today = dayKey();
    if (today === this.day || (this.progress.started && !this.progress.ended)) return;
    this.day = today;
    this.progress = loadProgress(today);
    this.card = null;
    this.endStage = null;
    this.view.show(new BoardModel(Position.fromFen(START_FEN)), 0);
    this.view.set({ lastMove: null, marks: [], arrows: [], hintSquare: -1, interactive: false, ahead: null });
    this.load();
  }

  visibilityChanged() {
    const card = this.card;
    if (document.hidden) {
      if (card && !card.hiddenAt) card.hiddenAt = performance.now();
    } else {
      if (card?.hiddenAt) {
        card.away += performance.now() - card.hiddenAt;
        card.hiddenAt = 0;
      }
      this.checkDay();
    }
  }

  start() {
    this.sounds.unlock();
    if (!this.ladder || this.progress.ended) return;
    this.progress.started = true;
    saveProgress(this.progress);
    this.present(this.progress.solved);
  }

  // A puzzle, start to finish

  async present(index) {
    const puzzle = this.ladder[index];
    const session = new Session(puzzle);
    const board = new BoardModel(session.position.clone());
    const card = { index, puzzle, session, board, start: board.clone(), phase: "intro", lastMove: null, marks: [],
                   arrows: [], hint: -1, outcome: null, study: null, stepped: false, settled: false,
                   turnStartedAt: 0, endedAt: 0, away: 0, hiddenAt: 0 };
    this.card = card;
    this.disarm();
    this.fadeBoard(board);
    this.view.set({ lastMove: null, marks: [], arrows: [], hintSquare: -1, interactive: false, ahead: null });
    this.render();
    await sleep(T.intro);
    if (this.card !== card) return;
    const setup = session.playSetup();
    const capture = board.position.isCapture(setup);
    board.play(setup);
    card.lastMove = setup;
    card.phase = "solving";
    card.turnStartedAt = performance.now() + T.setup;
    this.view.show(board, T.setup);
    this.view.set({ lastMove: setup, interactive: true });
    this.sounds.play(capture ? "capture" : "move");
    this.render();
  }

  /** A new puzzle's pieces fade in, as the app's card slides in. */
  fadeBoard(board) {
    const layer = this.view.layer;
    layer.style.transition = "none";
    layer.style.opacity = "0";
    this.view.show(board, 0);
    layer.getBoundingClientRect();
    layer.style.transition = "opacity 200ms ease-out";
    layer.style.opacity = "1";
  }

  async userMove(move, animated) {
    const card = this.card;
    if (!card || card.phase !== "solving") return;
    this.disarm();
    const before = card.board.clone();
    const capture = card.board.position.isCapture(move);
    card.board.play(move);
    card.lastMove = move;
    card.hint = -1;
    this.view.show(card.board, animated ? T.tap : 0);
    this.view.set({ lastMove: move, hintSquare: -1 });
    const reply = card.session.submit(move);
    if (reply === "correct") {
      this.sounds.play(capture ? "capture" : "move");
      card.marks = [{ square: move.to, kind: "correct" }];
      card.phase = "opponent";
      // Touches are read in the position after the known reply, so a move made now waits for it.
      const coming = card.session.expectedMove;
      this.view.set({ marks: card.marks, ahead: coming ? card.board.position.playing(coming) : null });
      this.render();
      await sleep(T.replyWait);
      if (this.card !== card || card.phase !== "opponent") return;
      const answer = card.session.playReply();
      const replyCapture = card.board.position.isCapture(answer);
      card.board.play(answer);
      card.lastMove = answer;
      card.marks = [];
      card.phase = "solving";
      this.view.show(card.board, T.reply);
      this.sounds.play(replyCapture ? "capture" : "move");
      this.render();
      this.view.set({ lastMove: answer, marks: [], ahead: null });
    } else if (reply === "completed") {
      this.sounds.play(capture ? "capture" : "move");
      card.marks = [{ square: move.to, kind: "correct" }];
      this.view.set({ marks: card.marks, interactive: false });
      this.finish(card);
    } else {
      this.sounds.play("miss");
      card.marks = [{ square: move.to, kind: "wrong" }];
      card.phase = "result";
      card.endedAt = performance.now();
      this.view.set({ marks: card.marks, interactive: false });
      this.settle(card);    // kept at once, so a reload can't take the miss back
      this.render();
      await sleep(T.cross);
      if (this.card !== card) return;
      card.board = before;
      card.marks = [];
      card.lastMove = card.session.played[card.session.played.length - 1];
      this.view.show(before, T.turnBack);
      this.view.set({ marks: [], lastMove: card.lastMove });
      await sleep(T.settle);
      if (this.card !== card) return;
      this.finish(card);
    }
  }

  /** The result into the day's progress, once. */
  settle(card) {
    if (card.settled) return;
    card.settled = true;
    const progress = this.progress;
    const result = card.session.result;
    if (result === "solved") {
      progress.solved += 1;
      if (progress.solved >= RUNGS) progress.ended = true;
    } else {
      progress.ended = true;
      progress.fell = true;
      progress.result = result;
      progress.wrong = card.session.wrongMove ? uci(card.session.wrongMove) : null;
      progress.missPly = card.session.ply;
    }
    saveProgress(progress);
  }

  async finish(card) {
    if (card.outcome) return;
    this.disarm();
    if (!card.endedAt) card.endedAt = performance.now();
    this.settle(card);
    const result = card.session.result;
    card.phase = "result";
    card.outcome = { result, seconds: this.thinkingSeconds(card) };
    card.hint = -1;
    this.view.set({ interactive: false, hintSquare: -1 });
    if (result === "missed" || result === "gaveUp") {
      card.study = new Study(card.puzzle, card.start, result, card.session.wrongMove, card.session.ply);
      card.study.follow(card.board.position);
    }
    if (result === "solved") this.sounds.play("success");
    this.render();
    // A miss ends the climb and plays its solution at once; the end card waits for it (the owner, 2026-11-09).
    if (card.study) await this.playSolution(card);
    if (this.progress.ended) {
      await sleep(T.endCard);
      if (this.card !== card || this.endStage) return;
      this.endStage = "card";
      this.render();
    } else {
      await sleep(T.advance);
      if (this.card === card) this.present(card.index + 1);
    }
  }

  async playSolution(card) {
    const line = card.session.remainingLine();
    if (!line.length) return;
    card.arrows = [{ from: line[0].from, to: line[0].to }];
    this.view.set({ arrows: card.arrows });
    await sleep(T.arrow);
    if (this.card !== card || card.stepped) return;
    for (let index = 0; index < line.length; index++) {
      const move = line[index];
      const capture = card.board.position.isCapture(move);
      card.board.play(move);
      card.lastMove = move;
      card.arrows = [];
      this.view.show(card.board, T.solutionMove);
      this.view.set({ lastMove: move, arrows: [] });
      card.study.follow(card.board.position);
      this.sounds.play(capture ? "capture" : "move");
      this.render();
      await sleep(index === line.length - 1 ? T.settle : T.solutionGap);
      if (this.card !== card || card.stepped) return;
    }
  }

  /** ‹ › after a miss: stops the solution playing out and steps through it. */
  step(delta) {
    const card = this.card, study = card?.study;
    if (!study) return;
    card.stepped = true;
    const index = Math.min(Math.max(study.index + delta, 0), study.frames.length - 1);
    if (index === study.index) return;
    study.index = index;
    card.board = study.frame.board.clone();
    card.lastMove = study.frame.move;
    card.arrows = study.arrows;
    this.view.show(card.board, 200);
    this.view.set({ lastMove: card.lastMove, arrows: card.arrows, marks: [] });
    this.render();
  }

  /** The climb ended on an earlier visit today: its last puzzle as it ended, under its card. */
  showEnded() {
    const { solved, fell, result, wrong, missPly } = this.progress;
    const index = Math.min(solved, RUNGS - 1);
    const puzzle = this.ladder[index];
    const start = new BoardModel(Position.fromFen(puzzle.fen));
    const card = { index, puzzle, phase: "result", marks: [], hint: -1, outcome: null, settled: true, stepped: true };
    if (fell && (result === "missed" || result === "gaveUp")) {
      card.study = new Study(puzzle, start, result, wrong ? parseUci(wrong) : null, missPly);
      if (!card.study.mistake && missPly) card.study.index = Math.max(0, Math.min(missPly - 1, card.study.frames.length - 1));
      card.outcome = { result, seconds: null };
    } else {
      // The summit, or a solve with a hint: the puzzle's last position.
      const study = new Study(puzzle, start, "solved", null, null);
      study.index = study.frames.length - 1;
      card.board = study.frame.board;
      card.lastMove = study.frame.move;
      card.outcome = { result: fell ? "hinted" : "solved", seconds: null };
    }
    if (card.study) {
      card.board = card.study.frame.board.clone();
      card.lastMove = card.study.frame.move;
    }
    card.arrows = card.study?.arrows ?? [];
    this.card = card;
    this.endStage = "card";
    this.view.show(card.board, 0);
    this.view.set({ lastMove: card.lastMove, marks: [], arrows: card.arrows, hintSquare: -1, interactive: false, ahead: null });
  }

  // Hint and Give up: the first tap says what it costs, the second within 3 seconds acts.

  press(action) {
    const card = this.card;
    if (!card) return;
    if (this.armed === action) {
      this.disarm();
      if (action === "hint") {
        const square = card.session.useHint();
        if (square >= 0) {
          card.hint = square;
          this.view.set({ hintSquare: square });
        }
      } else {
        card.session.giveUp();
        card.endedAt = performance.now();
        this.view.set({ interactive: false, ahead: null });
        this.finish(card);
      }
      this.render();
      return;
    }
    this.armed = action;
    clearTimeout(this.armTimer);
    this.armTimer = setTimeout(() => {
      this.armed = null;
      this.renderControls();
    }, 3000);
    this.renderControls();
  }

  disarm() {
    clearTimeout(this.armTimer);
    this.armed = null;
  }

  // The thinking time: from the setup move's landing, without time away from the page.

  thinkingSeconds(card) {
    if (!card.turnStartedAt) return null;
    const end = card.endedAt || performance.now();
    const away = card.away + (card.hiddenAt ? end - card.hiddenAt : 0);
    return Math.max(0, (end - card.turnStartedAt - away) / 1000);
  }

  tick() {
    const clock = this.under.querySelector(".clock");
    if (clock && this.card && !this.card.outcome) clock.textContent = clockText(this.thinkingSeconds(this.card) ?? 0);
  }

  // Sharing

  async share(button) {
    const { day, solved, fell } = this.progress;
    const text = shareText(day, solved, fell);
    // Phones get the share sheet; a computer copies the text.
    if (navigator.share && platform !== "other") {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      this.flash(button, "Copied");
    } catch {
      window.prompt("Copy your climb:", text);
    }
  }

  flash(button, text) {
    if (!button) return;
    const original = button.dataset.title ?? button.textContent;
    button.dataset.title = original;
    button.textContent = text;
    setTimeout(() => { button.textContent = original; }, 1600);
  }

  closeEndCard() {
    this.endStage = "closed";
    this.render();
  }

  clicked(event) {
    const target = event.target.closest("[data-action]");
    if (!target) {
      // A tap on the dimmed climb around the end card closes it, as in the app.
      if (this.endStage === "card" && event.target === this.cardLayer) this.closeEndCard();
      return;
    }
    switch (target.dataset.action) {
      case "start": this.start(); break;
      case "retry": this.load(); break;
      case "hint": this.press("hint"); break;
      case "giveUp": this.press("giveUp"); break;
      case "share": this.share(target); break;
      case "close": this.closeEndCard(); break;
      case "back": this.step(-1); break;
      case "forward": this.step(1); break;
    }
  }

  // Drawing the climb around the board

  render() {
    this.renderHeader();
    this.renderUnder();
    this.renderControls();
    this.renderCard();
  }

  renderHeader() {
    const card = this.card;
    const ended = this.status === "ended";
    let html;
    if (ended && this.endStage === "closed") {
      const { day, solved, fell } = this.progress;
      html = `<div class="share-banner"><div class="share-score"><div class="share-line">${shortDate(day)} · ${solved} of ${RUNGS}</div>`
        + `${rungsHTML(solved, fell, 16)}</div><button type="button" class="capsule" data-action="share">Share</button></div>`;
    } else if (card?.outcome) {
      const { result, seconds } = card.outcome;
      const title = { solved: "Solved", hinted: "Solved with a hint", missed: "Missed", gaveUp: "Gave up" }[result];
      html = `<div class="banner ${result}" role="status"><span class="banner-icon">${result === "solved" ? ICONS.check : ICONS.cross}</span>`
        + `<div><div class="banner-title">${title}</div>${seconds == null ? "" : `<div class="banner-detail">${thinkingTime(seconds)}</div>`}</div></div>`;
    } else {
      const thinking = card?.phase === "opponent" ? "Good move" : "Find the best move";
      html = `<div class="prompt"><span class="side-dot"></span><div><div class="prompt-title">White to move</div>`
        + `<div class="prompt-detail">${thinking}</div></div></div>`;
    }
    if (this.header.dataset.html !== html) {
      this.header.innerHTML = html;
      this.header.dataset.html = html;
    }
  }

  renderUnder() {
    const card = this.card;
    let html = "";
    if (card?.study && card.outcome) {
      const study = card.study, label = study.label;
      html = `<div class="steps"><button type="button" class="step" data-action="back" aria-label="Previous move"${study.index > 0 ? "" : " disabled"}>${ICONS.left}</button>`
        + `<button type="button" class="step" data-action="forward" aria-label="Next move"${study.index < study.frames.length - 1 ? "" : " disabled"}>${ICONS.right}</button>`
        + `<span class="step-label ${label.kind}">${escape(label.text)}</span></div>`
        + `<div class="chips one-row">${card.puzzle.themes.map((theme) => `<span class="chip">${escape(theme)}</span>`).join("")}</div>`;
    } else if (card?.outcome) {
      html = `<div class="chips">${card.puzzle.themes.slice(0, 5).map((theme) => `<span class="chip">${escape(theme)}</span>`).join("")}</div>`;
    } else if (card) {
      html = `<div class="climb-row"><span class="capsule-static">${ICONS.calendar}<b>${Math.min(card.index + 1, RUNGS)} of ${RUNGS}</b></span>`
        + `<span class="clock">${clockText(this.thinkingSeconds(card) ?? 0)}</span><span class="spacer"></span>`
        + `<span class="rating" aria-label="Puzzle rated ${card.puzzle.rating}">${ICONS.piece}${card.puzzle.rating}</span></div>`;
    }
    if (this.under.dataset.html !== html) {
      this.under.innerHTML = html;
      this.under.dataset.html = html;
      this.tick();
    }
  }

  renderControls() {
    let html;
    if (this.status === "ended") {
      html = `<a class="control prominent" href="${storeLink()}" data-store>${storeLabel()}</a>`;
    } else {
      const card = this.card;
      const solving = card?.phase === "solving";
      const hintOn = solving && card.hint < 0;
      const giveUpOn = solving || card?.phase === "opponent";
      const button = (action, icon, title, enabled, tint) => {
        const armed = this.armed === action;
        return `<button type="button" class="control${armed ? ` armed ${tint}` : ""}" data-action="${action}"${enabled ? "" : " disabled"}>`
          + `<span class="control-title">${icon}${armed ? "Tap again" : title}</span>${armed ? '<span class="control-detail">Ends the climb</span>' : ""}</button>`;
      };
      html = button("hint", ICONS.bulb, "Hint", hintOn, "warning") + button("giveUp", ICONS.flag, "Give up", giveUpOn, "wrong");
    }
    if (this.controls.dataset.html !== html) {
      this.controls.innerHTML = html;
      this.controls.dataset.html = html;
    }
  }

  renderCard() {
    const status = this.status;
    let html = "";
    if (status === "loading") {
      html = this.startCard({ loading: true });
    } else if (status === "failed") {
      html = `<div class="card-panel"><h2 class="card-title">Today's climb</h2><p class="card-text">Today's climb didn't load. Check your connection and try again.</p>`
        + `<button type="button" class="card-button" data-action="retry">Try again</button></div>`;
    } else if (status === "unavailable") {
      html = `<div class="card-panel"><h2 class="card-title">Today's climb</h2><p class="card-day">${longDate(this.day)}</p>`
        + `<p class="card-text">Not available today.</p></div>`;
    } else if (status === "ready") {
      html = this.startCard({});
    } else if (status === "ended" && this.endStage === "card") {
      const { day, solved, fell } = this.progress;
      html = `<div class="card-panel" role="dialog" aria-label="Today's climb, ${solved} of ${RUNGS}"><p class="card-small">Today's climb · ${shortDate(day)}</p>`
        + `<p class="card-score">${solved} of ${RUNGS}</p>${rungsHTML(solved, fell, 22)}<p class="card-note">A new climb tomorrow.</p>`
        + `<button type="button" class="card-button" data-action="share">Share</button>`
        + `<a class="card-button secondary" href="${storeLink()}" data-store>${storeLabel()}</a>`
        + `<button type="button" class="card-link" data-action="close">Close</button></div>`;
    }
    const shown = html !== "";
    this.section.classList.toggle("covered", shown);
    if (this.cardLayer.dataset.html !== html) {
      this.cardLayer.innerHTML = html;
      this.cardLayer.dataset.html = html;
    }
    this.cardLayer.hidden = !shown;
  }

  startCard({ loading }) {
    const solved = this.progress.solved;
    const begun = this.progress.started && solved > 0;
    return `<div class="card-panel"><h2 class="card-title">Today's climb</h2><p class="card-day">${longDate(this.day)}</p>`
      + `<p class="card-text">Ten puzzles, each harder than the last, from 600 to 2400. One miss ends the climb. Everyone gets the same ten today.</p>`
      + (begun ? `<p class="card-progress">${solved} solved so far</p>` : "")
      + `<button type="button" class="card-button" data-action="start"${loading ? " disabled" : ""}>${this.progress.started ? "Continue" : "Start"}</button></div>`;
  }
}

new Climb();
