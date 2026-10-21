// =========================================================
// Petit Colis Doux — logique du site
// =========================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import * as CFG from "/config.js";
const { SUPABASE_URL, SUPABASE_ANON_KEY } = CFG;
const SUPPORT_URL = (() => { try { const u = new URL(CFG.SUPPORT_URL || ""); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } })();
const supportBox = (txt) => SUPPORT_URL ? `<div class="support">
  <p>${txt}</p>
  <a class="btn ghost" href="${SUPPORT_URL.replace(/"/g, "&quot;")}" target="_blank" rel="noopener">☕ Soutenir Petit Colis Doux</a></div>` : "";

const CONFIGURED = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("TON-PROJET");
const sb = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const BUCKET = "colis-media";
const MEDIA_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const app = document.getElementById("app");
let session = null;

// ---------- Utilitaires ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const okUrl = (u) => {
  u = (u || "").trim(); if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch { return ""; }
};
const isMedia = (u) => typeof u === "string" && u.startsWith(MEDIA_PREFIX);
const ytId = (u) => {
  try {
    const x = new URL(u); let id = null;
    if (x.hostname.endsWith("youtu.be")) id = x.pathname.slice(1);
    else if (x.hostname.endsWith("youtube.com")) id = x.searchParams.get("v") || (x.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/) || [])[2];
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch { return null; }
};
const spotifyEmbed = (u) => {
  const m = (u || "").match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
};

// ---------- Les petites attentions ----------
const S = (p) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ITEMS = [
  { n: "Thé chaud", s: '<path d="M14 26h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" fill="#e8d6b8"/><path d="M44 30h4a6 6 0 0 1 0 12h-5"/><path d="M24 12c-3 4 3 6 0 10M32 12c-3 4 3 6 0 10"/><path d="M10 56h40"/>' },
  { n: "Biscuit", s: '<circle cx="32" cy="32" r="20" fill="#d9a465"/><circle cx="25" cy="26" r="2.5" fill="currentColor"/><circle cx="38" cy="28" r="2.5" fill="currentColor"/><circle cx="30" cy="38" r="2.5" fill="currentColor"/><circle cx="40" cy="40" r="2" fill="currentColor"/>' },
  { n: "Fleurs", s: '<path d="M32 34v20M32 44c-6-1-10-5-10-10M32 48c5-1 9-5 9-10"/><circle cx="32" cy="12" r="5" fill="#f08c9b"/><circle cx="41" cy="20" r="5" fill="#f08c9b"/><circle cx="23" cy="20" r="5" fill="#f08c9b"/><circle cx="37" cy="30" r="5" fill="#f08c9b"/><circle cx="27" cy="30" r="5" fill="#f08c9b"/><circle cx="32" cy="22" r="5" fill="#f2c94c"/>' },
  { n: "Chocolat", s: '<rect x="16" y="12" width="32" height="40" rx="3" fill="#7a4a2c"/><path d="M16 25h32M16 38h32M32 12v40"/><path d="M16 44l32-14v22H16z" fill="#d2463c"/>' },
  { n: "Bougie", s: '<rect x="20" y="28" width="24" height="26" rx="3" fill="#f3e3c4"/><path d="M32 28v-5"/><path d="M32 8c5 6 5 10 0 14-5-4-5-8 0-14z" fill="#f2a73b"/><path d="M20 36h24"/>' },
  { n: "Chaussettes douces", s: '<path d="M22 10h16v26l8 8a6 6 0 0 1-8 9l-13-12a6 6 0 0 1-3-5z" fill="#9db6e6"/><path d="M22 18h16M22 24h16"/>' },
  { n: "Câlin", s: '<path d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z" fill="#f07a6e"/><path d="M20 24a5 5 0 0 1 5-5"/>' },
  { n: "Petite plante", s: '<path d="M18 38h28l-4 16H22z" fill="#c9774a"/><path d="M32 38V24"/><path d="M32 28c-8 0-12-6-12-12 7 0 12 5 12 12zM32 24c0-7 5-12 13-12 0 7-5 12-13 12z" fill="#8cc084"/>' },
  { n: "Rayon de soleil", s: '<circle cx="32" cy="32" r="11" fill="#f6c844"/><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M15 49l5-5M44 20l5-5"/>' },
  { n: "Playlist", s: '<circle cx="32" cy="32" r="22" fill="#3a3040"/><circle cx="32" cy="32" r="7" fill="#c7a6f0"/><circle cx="32" cy="32" r="1.5" fill="currentColor"/><path d="M18 26a15 15 0 0 1 8-8" stroke="#8a7a99"/>' },
  { n: "Pansement", s: '<rect x="8" y="24" width="48" height="16" rx="8" fill="#f0c19c" transform="rotate(-30 32 32)"/><rect x="24" y="26" width="16" height="12" rx="2" fill="#f7dcc4" transform="rotate(-30 32 32)"/>' },
  { n: "Lettre d'amour", s: '<rect x="10" y="16" width="44" height="32" rx="3" fill="#fbecd5"/><path d="M10 18l22 16 22-16"/><path d="M32 44s-6-4-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8z" fill="#d2463c" stroke-width="1.5"/>' },
];
const icon = (i) => S(ITEMS[i].s);

// ---------- Les objets à ajouter ----------
const KINDS = {
  note:     { n: "Note",     f: [["text", "Ton mot", "area", 600]] },
  photo:    { n: "Photo",    f: [["media", "Photo", "photo"], ["cap", "Légende", "text", 60]] },
  song:     { n: "Chanson",  f: [["title", "Titre", "text", 80], ["artist", "Artiste", "text", 60], ["url", "Lien Spotify ou YouTube", "url", 400]] },
  video:    { n: "Vidéo",    f: [["media", "Vidéo", "video"], ["title", "Titre", "text", 80]] },
  gift:     { n: "Cadeau",   f: [["title", "Le cadeau", "text", 80], ["text", "Un mot sur le cadeau", "area", 240], ["url", "Lien (optionnel)", "url", 400]] },
  voice:    { n: "Vocal",    f: [["media", "Message vocal", "voice"], ["title", "Titre", "text", 60]] },
  drawing:  { n: "Dessin",   f: [["media", "Ton dessin", "draw"], ["cap", "Légende", "text", 60]] },
  location: { n: "Lieu",     f: [["title", "Nom du lieu", "text", 80], ["place", "Adresse ou ville", "text", 140], ["text", "Pourquoi ce lieu", "area", 240]] },
  coupon:   { n: "Coupon",   f: [["title", "Bon pour…", "text", 80], ["until", "Valable jusqu'au", "text", 40], ["text", "Conditions", "area", 160]] },
  news:     { n: "Nouvelle", f: [["title", "Gros titre", "text", 90], ["text", "L'article", "area", 600]] },
};
const ORDER = ["note", "photo", "song", "video", "gift", "voice", "drawing", "location", "coupon", "news"];
const A = (p) => `<svg viewBox="0 0 100 80" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${p}</svg>`;
const keys = (() => { let s = ""; for (let r = 0; r < 3; r++) for (let c = 0; c < 9 - r; c++) s += `<circle cx="${22 + r * 3 + c * 7}" cy="${38 + r * 7}" r="2.4" fill="#2a2118" stroke="none"/>`; return s; })();
const ART = {
  note: A(`<rect x="28" y="4" width="44" height="22" fill="#fff"/><path d="M34 12h30M34 18h22" stroke="#999"/><path d="M16 26h68l8 34H8z" fill="#9fcfb7"/><rect x="10" y="22" width="80" height="8" rx="3" fill="#7fb59b"/>${keys}<rect x="8" y="60" width="84" height="9" rx="2" fill="#6f9f88"/><path d="M34 64h32" stroke-width="2.4"/>`),
  photo: A(`<path d="M52 4C24 2 6 18 8 40s26 36 50 34 38-20 36-38S74 4 46 7" stroke="#a3333b" stroke-width="3.5"/><rect x="38" y="20" width="22" height="9" rx="2" fill="#bfc2c6"/><rect x="22" y="27" width="56" height="34" rx="4" fill="#d8dadd"/><rect x="22" y="42" width="56" height="19" fill="#2c2c2c"/><circle cx="50" cy="45" r="14" fill="#1a1a1a"/><circle cx="50" cy="45" r="8.5" fill="#3b4a5a"/><circle cx="47" cy="42" r="2.2" fill="#fff" stroke="none"/><rect x="66" y="30" width="7" height="5" fill="#2c2c2c"/>`),
  song: A(`<circle cx="50" cy="40" r="33" fill="#e3e6ea"/><path d="M50 7a33 33 0 0 1 30 20" stroke="#f3a6cf" stroke-width="7" opacity=".75"/><path d="M20 54a33 33 0 0 0 16 15" stroke="#9fd8f2" stroke-width="7" opacity=".75"/><path d="M76 58a33 33 0 0 1-9 9" stroke="#f6e08a" stroke-width="7" opacity=".85"/><circle cx="50" cy="40" r="12" fill="#fff"/><circle cx="50" cy="40" r="5" fill="#cfd3d8"/>`),
  video: A(`<rect x="30" y="24" width="40" height="26" rx="3" fill="#2f2f33"/><path d="M30 30l-14-6v26l14-6z" fill="#3a3a40"/><circle cx="18" cy="37" r="6" fill="#5b6fb0"/><rect x="58" y="14" width="18" height="10" rx="3" fill="#2f2f33"/><rect x="44" y="50" width="11" height="26" rx="3" fill="#2f2f33"/><circle cx="50" cy="31" r="2" fill="#d2463c" stroke="none"/>`),
  gift: A(`<path d="M50 6l8 18 20-6-10 18 20 8-20 6 10 18-20-6-8 16-8-16-20 6 10-18-20-6 20-8-10-18 20 6z" fill="#3f63b8"/><path d="M50 22l5 13 13 1-10 8 4 13-12-7-12 7 4-13-10-8 13-1z" fill="#6e8fd8"/><circle cx="50" cy="40" r="5" fill="#2d4a92"/>`),
  voice: A(`<rect x="36" y="4" width="28" height="72" rx="6" fill="#d8dadd"/><rect x="41" y="10" width="18" height="12" rx="2" fill="#2d3e7a"/><path d="M44 16h8" stroke="#9fc0ff"/><circle cx="45" cy="31" r="3.2" fill="#d2463c"/><circle cx="56" cy="29" r="2.6" fill="#bbb"/><circle cx="56" cy="36" r="2.6" fill="#bbb"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${44 + (i % 4) * 4}" cy="${50 + Math.floor(i / 4) * 5}" r="1" fill="#555" stroke="none"/>`).join("")}`),
  drawing: A(`<path d="M10 42l10-3h56v6H20z" fill="#d7b25b"/><path d="M76 39h12v6H76z" fill="#b9bcc0"/><path d="M10 42l-6 0 6-2" fill="#444"/><path d="M30 41h36" stroke="#9c7e34" stroke-width=".8"/>`),
  location: A(`<path d="M10 22l26-6 28 6 26-6v44l-26 6-28-6-26 6z" fill="#efe8d6"/><path d="M36 16v44M64 22v44" stroke="#bbb"/><path d="M16 50c10-14 18 2 26-10s16-14 22-4 12 0 18-12" stroke="#c2455a" stroke-width="2.2"/><path d="M22 30h10M70 54h12" stroke="#7fa6c9" stroke-width="3"/>`),
  coupon: A(`<rect x="6" y="20" width="88" height="40" fill="#d9c08f"/><rect x="10" y="24" width="80" height="32" stroke-dasharray="3 2"/><text x="26" y="47" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="#2a2118" stroke="none">50</text><text x="64" y="37" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8" fill="#2a2118" stroke="none">BON POUR</text><path d="M44 43h40M44 49h30" stroke="#6b5530"/>`),
  news: A(`<path d="M14 24l64-10 10 44-64 10z" fill="#e2e0db"/><path d="M10 28l64-8 8 44-64 8z" fill="#f4f2ed"/><path d="M18 31l46-6M19 36l46-6" stroke-width="2.4"/><rect x="22" y="41" width="20" height="14" fill="#9a9a9a" transform="rotate(-7 32 48)"/><path d="M48 43l22-3M49 48l22-3M50 53l22-3M24 60l46-6" stroke="#888"/>`),
};
const summary = (c) => c.title || c.text || c.cap ||
  ({ photo: "photo ajoutée", drawing: "dessin ajouté", voice: "vocal ajouté", video: "vidéo ajoutée" }[c.k] || "");

// ---------- Brouillon (gardé sur l'appareil) ----------
const state = Object.assign({ to: "", from: "", msg: "", q: ITEMS.map(() => 0), c: [] }, store.get("colis-draft", {}));
if (!Array.isArray(state.q) || state.q.length !== ITEMS.length) state.q = ITEMS.map(() => 0);
if (!Array.isArray(state.c)) state.c = [];
const save = () => store.set("colis-draft", state);
const track = () => "CL" + String(Math.abs([...(state.to + state.from)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1e9, 7))).padStart(9, "0") + "CA";

// ---------- Envoi de fichiers vers Supabase Storage ----------
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/webm": "webm", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/aac": "aac", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
async function upload(blob) {
  const type = (blob.type || "").split(";")[0];
  if (!EXT[type]) throw new Error("Ce type de fichier n'est pas accepté (" + (type || "inconnu") + ").");
  if (!session) throw new Error("Ta session a expiré. Reconnecte-toi pour ajouter des fichiers.");
  const path = `${session.user.id}/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${EXT[type]}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message?.includes("exceeded") ? "Ce fichier est trop lourd (25 Mo max.)." : "L'envoi du fichier a échoué. Vérifie ta connexion et réessaie.");
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function shrinkImage(file, max = 1600) {
  const url = URL.createObjectURL(file); const img = new Image();
  try { await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; }); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
}

// =========================================================
// Page de création
// =========================================================
function builder(justSent = null) {
  document.title = "Petit Colis Doux";
  app.innerHTML = `
  ${CONFIGURED ? "" : `<div class="setup"><b>Presque prêt.</b> Ouvre <code>config.js</code> et colle l'URL et la clé de ton projet Supabase (voir le README).</div>`}
  ${session ? `<div class="account"><span>Connecté : <b>${esc(session.user.email)}</b></span><button id="logout">Se déconnecter</button></div>` : ""}
  <section class="label" aria-label="Étiquette d'expédition">
    <div class="brand">
      <div><h1>Petit Colis Doux</h1><div class="est">expédié avec soin · depuis 2026</div></div>
      <div class="stamp">${S('<path d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z"/>')}POSTE<br>DU CŒUR</div>
    </div>
    <div class="field"><label for="to">À</label><input id="to" maxlength="40" placeholder="son prénom" value="${esc(state.to)}"></div>
    <div class="field"><label for="from">De</label><input id="from" maxlength="40" placeholder="ton prénom" value="${esc(state.from)}"></div>
    <div class="field"><label for="msg">Mot</label><textarea id="msg" rows="3" maxlength="600" placeholder="un petit mot glissé dans la boîte…">${esc(state.msg)}</textarea></div>
    <div class="barcode" aria-hidden="true"></div>
    <div class="tracking" id="trk">${track()}</div>
  </section>

  <section style="display:grid;gap:14px">
    <div><div class="stars">*** ajoute du contenu ***</div><h2>Glisse un souvenir</h2></div>
    <div class="kinds" id="kinds">${ORDER.map((k) => `<button class="kind" data-k="${k}">${ART[k]}<b>+ ${KINDS[k].n}</b></button>`).join("")}</div>
    <div class="added" id="added"></div>
  </section>

  <section style="display:grid;gap:14px">
    <div><div class="stars">*** choisis ce que tu glisses dedans ***</div><h2>Les petites attentions</h2></div>
    <div class="grid" id="grid"></div>
  </section>

  <section class="receipt" aria-label="Reçu">
    <div class="hd"><b>Petit Colis Doux</b><span class="stars">reçu · ${new Date().toLocaleDateString("fr-CA")}</span></div>
    <div class="row head"><span>ARTICLE</span><span>QTÉ</span></div>
    <div id="lines"></div>
    <div class="row total"><span>TOTAL D'ATTENTIONS</span><span id="tot">0</span></div>
    <div class="row"><span>PRIX</span><span>gratuit ♥</span></div>
    <div class="thanks"><b>MERCI DE PRENDRE SOIN</b><span>bonne journée :)</span></div>
  </section>

  <section class="send">
    <div><div class="stars">*** obtiens ton lien ***</div><h2>Envoie ton colis</h2></div>
    <button class="btn" id="gen">Fermer la boîte et créer le lien</button>
    <p class="err-msg" id="generr" hidden></p>
    <div id="out" hidden style="display:grid;gap:10px">
      <div class="linkbox"><input id="link" readonly aria-label="Lien du colis"><button id="copy">Copier</button></div>
      <div class="btnrow"><a class="btn ghost" id="prev" target="_blank" rel="noopener">Voir le colis</a><button class="btn ghost" id="new">Nouveau colis</button></div>
      <p class="hint">Envoie ce lien à quelqu'un de spécial. Il verra une boîte à ouvrir.</p>
    </div>
  </section>

  <section class="sent" id="sent" hidden>
    <div><div class="stars">*** suivi ***</div><h2>Mes colis envoyés</h2></div>
    <div id="sentlist" class="sent"></div>
  </section>
  ${supportBox("Petit Colis Doux est gratuit et sans pub. Si tu l'aimes, tu peux aider à le garder en ligne.")}
  <footer>livré avec soin et amour</footer>`;

  const grid = $("#grid");
  const render = () => {
    grid.innerHTML = ITEMS.map((it, i) => `
      <div class="item ${state.q[i] ? "on" : ""}">
        ${state.q[i] ? `<span class="badge">×${state.q[i]}</span>` : ""}
        ${icon(i)}<div class="nm">${it.n}</div>
        <div class="qty">${state.q[i] ? `<button data-d="-1" data-i="${i}" aria-label="Retirer ${it.n}">−</button><span>${state.q[i]}</span>` : ""}
        <button class="add" data-d="1" data-i="${i}" aria-label="Ajouter ${it.n}">+</button></div>
      </div>`).join("");
    const picked = ITEMS.map((it, i) => [it.n, state.q[i]]).filter((x) => x[1]);
    const kc = {}; state.c.forEach((c) => (kc[c.k] = (kc[c.k] || 0) + 1));
    const lines = ORDER.filter((k) => kc[k]).map((k) => [KINDS[k].n, kc[k]]).concat(picked);
    $("#lines").innerHTML = lines.length
      ? lines.map(([n, q]) => `<div class="row"><span>${esc(n).toUpperCase()}</span><span>${q}</span></div>`).join("")
      : `<div class="empty">la boîte est vide pour l'instant</div>`;
    $("#tot").textContent = lines.reduce((a, x) => a + x[1], 0);
    $("#gen").disabled = !lines.length || !CONFIGURED;
    $("#added").innerHTML = state.c.map((c, i) => `<div class="chip">
      <span class="k">${KINDS[c.k].n}</span><span class="t">${esc(summary(c))}</span>
      <button data-e="${i}">Modifier</button><button data-x="${i}" aria-label="Retirer">✕</button></div>`).join("");
  };

  grid.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const i = +b.dataset.i; state.q[i] = Math.max(0, Math.min(9, state.q[i] + +b.dataset.d));
    save(); render();
  });
  $("#kinds").addEventListener("click", (e) => { const b = e.target.closest(".kind"); if (b) openSheet(b.dataset.k, null, render); });
  $("#added").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.x != null) { state.c.splice(+b.dataset.x, 1); save(); render(); }
    else openSheet(state.c[+b.dataset.e].k, +b.dataset.e, render);
  });
  ["to", "from", "msg"].forEach((k) => $("#" + k).addEventListener("input", (e) => {
    state[k] = e.target.value; save(); $("#trk").textContent = track();
  }));
  render();
  renderSent();

  $("#gen").onclick = async (e) => {
    const btn = e.target; btn.disabled = true; btn.textContent = "Emballage en cours…"; $("#generr").hidden = true;
    try {
      const { data: code, error } = await sb.rpc("create_package", {
        p_to: state.to.trim(), p_from: state.from.trim(), p_message: state.msg.trim(),
        p_attentions: state.q.map((q, i) => (q ? [i, q] : null)).filter(Boolean),
        p_contents: state.c,
      });
      if (error?.message?.includes("connexion requise")) { loginView("Ta session a expiré. Reconnecte-toi : ton colis est gardé."); return; }
      if (error?.message?.includes("limite quotidienne")) throw new Error("Tu as atteint la limite de 50 colis aujourd'hui. Réessaie demain.");
      if (error || !code) throw error || new Error("pas de code");
      // Colis envoyé : on vide la boîte pour que le prochain colis reparte de zéro
      const sentTo = state.to.trim();
      Object.assign(state, { to: "", from: state.from, msg: "", q: ITEMS.map(() => 0), c: [] });
      save();
      builder({ link: shareLink(code), to: sentTo });
      return;
    } catch (err) {
      console.error(err);
      $("#generr").textContent = err?.message?.startsWith("Tu as atteint") ? err.message : "Le colis n'a pas pu être créé. Vérifie ta connexion, puis réessaie.";
      $("#generr").hidden = false;
    } finally { btn.disabled = false; btn.textContent = "Fermer la boîte et créer le lien"; }
  };
  $("#copy").onclick = async (e) => {
    const inp = $("#link");
    try { await navigator.clipboard.writeText(inp.value); e.target.textContent = "Copié !"; }
    catch { inp.select(); e.target.textContent = "Sélectionné"; }
    setTimeout(() => (e.target.textContent = "Copier"), 1800);
  };
  const lo = $("#logout");
  if (lo) lo.onclick = async () => { lo.disabled = true; await sb.auth.signOut(); session = null; loginView(); };
  $("#sentlist").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    if (!confirm("Supprimer ce colis ? Son lien ne marchera plus.")) return;
    b.disabled = true;
    const { error } = await sb.rpc("delete_package", { p_code: b.dataset.del });
    if (error) { b.disabled = false; alert("La suppression a échoué. Réessaie."); return; }
    renderSent();
  });
  $("#new").onclick = () => {
    Object.assign(state, { to: "", from: state.from, msg: "", q: ITEMS.map(() => 0), c: [] });
    save(); builder(); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (justSent) {
    $("#link").value = justSent.link; $("#prev").href = justSent.link; $("#out").hidden = false;
    $("#out .hint").textContent = `Ton colis${justSent.to ? " pour " + justSent.to : ""} est prêt : envoie-lui ce lien. La boîte a été vidée pour ton prochain colis.`;
    setTimeout(() => $("#out").scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }
}

function shareLink(code) {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname) || location.protocol === "file:";
  return local ? `${location.origin}/?c=${code}` : `${location.origin}/c/${code}`;
}

async function renderSent() {
  const box = $("#sent"); if (!box || !CONFIGURED || !session) return;
  const { data, error } = await sb.rpc("my_packages");
  if (error || !data?.length) { box.hidden = true; return; }
  box.hidden = false;
  $("#sentlist").innerHTML = data.map((p) => `<div class="row">
    <span><a href="${esc(shareLink(p.code))}" target="_blank" rel="noopener">Pour ${esc(p.to_name || "quelqu'un")}</a> · ${new Date(p.created_at).toLocaleDateString("fr-CA")}</span>
    <span class="sent-actions"><span class="pill ${p.opened_at ? "ok" : ""}">${p.opened_at ? "ouvert ♥" : "pas encore ouvert"}</span>
    <button class="del" data-del="${esc(p.code)}" aria-label="Supprimer le colis pour ${esc(p.to_name || "quelqu'un")}">✕</button></span></div>`).join("");
}

// =========================================================
// Connexion par email + code
// =========================================================
function loginView(notice = "") {
  document.title = "Connexion · Petit Colis Doux";
  const saved = store.get("colis-login-email", "");
  app.innerHTML = `
  <section class="label" aria-label="Connexion">
    <div class="brand">
      <div><h1>Petit Colis Doux</h1><div class="est">expédié avec soin · depuis 2026</div></div>
      <div class="stamp">${S('<path d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z"/>')}POSTE<br>DU CŒUR</div>
    </div>
    <div><div class="stars">*** guichet d'envoi ***</div><h2>Connecte-toi pour envoyer un colis</h2></div>
    ${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
    <form class="login" id="step1">
      <label for="email">Ton adresse email</label>
      <input id="email" type="email" autocomplete="email" required placeholder="toi@exemple.com" value="${esc(saved)}">
      <button class="btn" type="submit" id="send1">Recevoir mon code</button>
    </form>
    <form class="login" id="step2" hidden>
      <p class="hint" id="sentto"></p>
      <label for="otp">Code reçu par email</label>
      <input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" placeholder="123456">
      <button class="btn" type="submit" id="send2">Valider</button>
      <div class="login-links"><button type="button" id="resend">Renvoyer le code</button><button type="button" id="change">Changer d'email</button></div>
    </form>
    <p class="err-msg" id="lerr" role="alert" hidden></p>
    <p class="hint">Pas de mot de passe : on t'envoie un code à chaque connexion. Pour <b>ouvrir</b> un colis reçu, pas besoin de compte.</p>
  </section>
  ${supportBox("Petit Colis Doux est gratuit et sans pub. Si tu l'aimes, tu peux aider à le garder en ligne.")}
  <footer>livré avec soin et amour</footer>`;

  const lerr = $("#lerr");
  const fail = (m) => { lerr.textContent = m; lerr.hidden = false; };
  let email = saved, cooldown = 0, timer = null;
  const tick = () => {
    const r = $("#resend"); if (!r) return clearInterval(timer);
    r.disabled = cooldown > 0;
    r.textContent = cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code";
    if (cooldown-- <= 0) clearInterval(timer);
  };
  const sendCode = async () => {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      const rl = error.status === 429 || /rate|limit|seconds/i.test(error.message || "");
      throw new Error(rl ? "Trop de demandes de code. Attends une minute, puis réessaie." : "Le code n'a pas pu être envoyé. Vérifie ton adresse email.");
    }
    cooldown = 60; clearInterval(timer); timer = setInterval(tick, 1000); tick();
  };

  $("#step1").onsubmit = async (e) => {
    e.preventDefault(); lerr.hidden = true;
    email = $("#email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Cette adresse email n'est pas valide.");
    const b = $("#send1"); b.disabled = true; b.textContent = "Envoi du code…";
    try {
      await sendCode();
      store.set("colis-login-email", email);
      $("#step1").hidden = true; $("#step2").hidden = false;
      $("#sentto").innerHTML = `Code envoyé à <b>${esc(email)}</b>. Regarde aussi dans tes courriels indésirables.`;
      $("#otp").focus();
    } catch (x) { fail(x.message); }
    finally { b.disabled = false; b.textContent = "Recevoir mon code"; }
  };
  $("#step2").onsubmit = async (e) => {
    e.preventDefault(); lerr.hidden = true;
    const token = $("#otp").value.replace(/\D/g, "");
    if (token.length < 6) return fail("Entre le code complet reçu par email.");
    const b = $("#send2"); b.disabled = true; b.textContent = "Vérification…";
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    b.disabled = false; b.textContent = "Valider";
    if (error || !data?.session) return fail("Ce code est incorrect ou a expiré. Vérifie-le, ou demande un nouveau code.");
    session = data.session;
    clearInterval(timer);
    builder(); window.scrollTo({ top: 0 });
  };
  $("#resend").onclick = async () => {
    lerr.hidden = true;
    try { await sendCode(); $("#sentto").innerHTML = `Nouveau code envoyé à <b>${esc(email)}</b>.`; } catch (x) { fail(x.message); }
  };
  $("#change").onclick = () => { clearInterval(timer); $("#step2").hidden = true; $("#step1").hidden = false; lerr.hidden = true; $("#email").focus(); };
}

async function home() {
  if (!CONFIGURED) return builder();
  const { data } = await sb.auth.getSession();
  session = data.session;
  session ? builder() : loginView();
}

// =========================================================
// Fenêtre pour ajouter un objet
// =========================================================
function openSheet(kind, idx, done) {
  const K = KINDS[kind];
  const cur = idx != null ? { ...state.c[idx] } : { k: kind };
  let pending = null;       // fichier à envoyer (Blob)
  let getDrawing = null;    // fonction qui exporte le dessin
  let recorder = null, recStream = null, recTimer = null;

  const bg = document.createElement("div"); bg.className = "sheet-bg";
  bg.innerHTML = `<form class="sheet" role="dialog" aria-label="${K.n}">
    <h3>${idx != null ? "Modifier" : "Ajouter"} : ${K.n}</h3>
    ${K.f.map(([key, lab, type, max]) => {
      const id = "f_" + key;
      if (type === "area") return `<label for="${id}">${lab}<textarea id="${id}" rows="4" maxlength="${max}">${esc(cur[key])}</textarea></label>`;
      if (type === "photo") return `<label for="f_file">${lab}<input id="f_file" type="file" accept="image/*"></label><img class="thumb" id="pv" ${isMedia(cur.media) ? `src="${esc(cur.media)}"` : "hidden"} alt="">`;
      if (type === "video") return `<label for="f_file">Fichier vidéo (25 Mo max.)<input id="f_file" type="file" accept="video/*"></label>
        <video class="thumb" id="pv" controls playsinline ${isMedia(cur.media) ? `src="${esc(cur.media)}"` : "hidden"}></video>
        <div class="or">ou</div>
        <label for="f_url">Lien YouTube ou autre<input id="f_url" type="url" maxlength="400" value="${esc(cur.url)}"></label>`;
      if (type === "voice") return `<div class="rec"><button type="button" id="recbtn">● Enregistrer</button><span id="rectime">0:00 / 2:00</span></div>
        <audio id="pv" controls ${isMedia(cur.media) ? `src="${esc(cur.media)}"` : "hidden"}></audio>
        <div class="or">ou</div>
        <label for="f_file">Choisir un fichier audio<input id="f_file" type="file" accept="audio/*"></label>`;
      if (type === "draw") return `<div style="display:grid;gap:8px"><canvas class="pad" id="pad" width="720" height="720"></canvas>
        <div class="swatches" id="sw">${["#2a2118", "#d2463c", "#2f5aa8", "#4f8a4b", "#e0a422", "#c26fb2"].map((c, i) => `<button type="button" class="sw ${i ? "" : "sel"}" data-c="${c}" style="background:${c}" aria-label="Couleur"></button>`).join("")}<button type="button" class="clr" id="clr">Effacer</button></div></div>`;
      return `<label for="${id}">${lab}<input id="${id}" type="${type === "url" ? "url" : "text"}" maxlength="${max}" value="${esc(cur[key])}"></label>`;
    }).join("")}
    <p class="err-msg" id="em" hidden></p>
    <div class="btnrow"><button type="button" class="btn ghost" id="cancel">Annuler</button><button type="submit" class="btn" id="ok">${idx != null ? "Enregistrer" : "Mettre dans la boîte"}</button></div>
  </form>`;
  document.body.appendChild(bg);
  document.body.style.overflow = "hidden";
  const q = (s) => $(s, bg), em = q("#em");
  const err = (m) => { em.textContent = m; em.hidden = false; };
  const stopRec = () => { try { recorder?.state === "recording" && recorder.stop(); } catch {} recStream?.getTracks().forEach((t) => t.stop()); clearInterval(recTimer); };
  const close = () => { stopRec(); bg.remove(); document.body.style.overflow = ""; };
  q("#cancel").onclick = close;
  bg.addEventListener("click", (e) => { if (e.target === bg) close(); });

  const preview = (blob) => { const pv = q("#pv"); pv.src = URL.createObjectURL(blob); pv.hidden = false; em.hidden = true; };

  // Photo / vidéo / audio depuis un fichier
  const fi = q("#f_file");
  if (fi) fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    try {
      if (kind === "photo") pending = await shrinkImage(f);
      else if (f.size > 25 * 1024 * 1024) { err(`Ce fichier fait ${Math.round(f.size / 1048576)} Mo. La limite est de 25 Mo.`); fi.value = ""; return; }
      else pending = f;
      preview(pending);
    } catch { err("Ce fichier ne s'ouvre pas ici. Essaie un autre format."); }
  };

  // Enregistrement au micro
  const rb = q("#recbtn");
  if (rb) {
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) { rb.disabled = true; rb.textContent = "Micro indisponible"; }
    rb.onclick = async () => {
      if (recorder?.state === "recording") { stopRec(); return; }
      try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
        recorder = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined);
        const chunks = []; const t0 = Date.now();
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = () => {
          rb.classList.remove("on"); rb.textContent = "● Recommencer";
          pending = new Blob(chunks, { type: (recorder.mimeType || "audio/webm").split(";")[0] });
          preview(pending);
        };
        recorder.start();
        rb.classList.add("on"); rb.textContent = "■ Arrêter";
        recTimer = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000);
          q("#rectime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} / 2:00`;
          if (s >= 120) stopRec();
        }, 250);
      } catch { err("Le micro est bloqué. Autorise-le dans ton navigateur, ou choisis un fichier audio."); }
    };
  }

  // Dessin
  const pad = q("#pad");
  if (pad) {
    const W = 720, g = pad.getContext("2d"); let col = "#2a2118", drawing = false, dirty = false;
    const blank = () => { g.fillStyle = "#fff"; g.fillRect(0, 0, W, W); };
    blank();
    if (isMedia(cur.media)) { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { g.drawImage(im, 0, 0, W, W); }; im.src = cur.media; }
    g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 9;
    const pt = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * W / r.height]; };
    pad.onpointerdown = (e) => { drawing = true; dirty = true; pad.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.strokeStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); };
    pad.onpointermove = (e) => { if (!drawing) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); };
    pad.onpointerup = pad.onpointercancel = () => (drawing = false);
    q("#sw").onclick = (e) => { const b = e.target.closest(".sw"); if (!b) return; col = b.dataset.c; bg.querySelectorAll(".sw").forEach((x) => x.classList.toggle("sel", x === b)); };
    q("#clr").onclick = () => { blank(); dirty = true; cur.media = ""; };
    getDrawing = () => (dirty ? new Promise((r) => pad.toBlob(r, "image/png")) : null);
  }

  q("form").onsubmit = async (e) => {
    e.preventDefault(); em.hidden = true;
    K.f.forEach(([key, , type]) => { if (["text", "area", "url"].includes(type)) cur[key] = q("#f_" + key).value.trim(); });
    if (kind === "video") cur.url = q("#f_url").value.trim();
    if (cur.url && !okUrl(cur.url)) return err("Ce lien n'est pas valide. Colle l'adresse complète.");
    if (cur.url) cur.url = okUrl(cur.url);
    if (recorder?.state === "recording") return err("Arrête l'enregistrement avant de continuer.");

    const ok = q("#ok"); ok.disabled = true; ok.textContent = "Envoi…";
    try {
      if (getDrawing) { const b = await getDrawing(); if (b) pending = b; }
      if (pending) cur.media = await upload(pending);
    } catch (x) { ok.disabled = false; ok.textContent = "Réessayer"; return err(x.message); }
    ok.disabled = false; ok.textContent = idx != null ? "Enregistrer" : "Mettre dans la boîte";

    const missing = {
      photo: !cur.media && "Choisis une photo.",
      drawing: !cur.media && "Dessine quelque chose avant de l'ajouter.",
      voice: !cur.media && "Enregistre un vocal ou choisis un fichier audio.",
      video: !cur.media && !cur.url && "Choisis une vidéo ou colle un lien.",
    }[kind] ?? (!cur[K.f[0][0]] && `Remplis « ${K.f[0][1]} ».`);
    if (missing) return err(missing);

    Object.keys(cur).forEach((k) => { if (cur[k] === "") delete cur[k]; });
    if (idx != null) state.c[idx] = cur; else state.c.push(cur);
    save(); close(); done();
  };
}

// =========================================================
// Page du destinataire
// =========================================================
async function recipient(code) {
  if (!CONFIGURED) { app.innerHTML = `<div class="setup">Le site n'est pas encore relié à Supabase (voir config.js).</div>`; return; }
  const { data: p, error } = await sb.rpc("get_package", { p_code: code });
  if (error || !p) {
    app.innerHTML = `<div class="err"><h2>Ce colis est introuvable</h2><p>Le lien est incomplet ou mal copié. Demande à la personne de te le renvoyer.</p><a class="btn ghost" href="/">Créer mon propre colis</a></div>`;
    return;
  }
  document.title = p.to ? `Un colis pour ${p.to}` : "Un colis pour toi";
  const items = (p.attentions || []).filter((x) => Array.isArray(x) && ITEMS[x[0]]);
  const cs = (p.contents || []).filter((c) => c && KINDS[c.k]);

  app.innerHTML = `
    <div class="open-stage">
      <div class="stars">*** un colis est arrivé pour toi ***</div>
      <button class="box wiggle" id="box" aria-label="Ouvrir le colis">
        <div class="body"></div><div class="tape"></div><div class="lid"></div>
        <div class="tag">À : ${esc(p.to || "toi")}<br>De : ${esc(p.from || "quelqu'un qui t'aime")}</div>
      </button>
      <div class="tap" id="tap">touche pour ouvrir</div>
    </div>
    <div id="inside" hidden style="display:grid;gap:22px"></div>`;

  const box = $("#box");
  box.onclick = () => {
    if (box.classList.contains("opened")) return;
    box.classList.remove("wiggle"); box.classList.add("opened");
    $("#tap").textContent = "pour " + (p.to || "toi") + " ♥";
    sb.rpc("mark_opened", { p_code: code }).then(() => {}, () => {});
    const inside = $("#inside");
    inside.innerHTML = `
      ${p.message ? `<div class="letter pop">${esc(p.message)}<span class="sig">— ${esc(p.from || "")}</span></div>` : ""}
      ${cs.length ? `<div class="contents">${cs.map((c, k) => `<div class="pop" style="animation-delay:${0.2 + k * 0.12}s;display:grid">${showContent(c)}</div>`).join("")}</div>` : ""}
      ${items.length ? `<div><div class="stars">et aussi</div><h2>${items.reduce((a, x) => a + x[1], 0)} petites attentions</h2></div>
      <div class="gifts">${items.map(([i, n], k) => `<div class="gift pop" style="animation-delay:${0.3 + k * 0.1}s">${icon(i)}<b>${ITEMS[i].n}</b><span>×${n}</span></div>`).join("")}</div>` : ""}
      <a class="btn" href="/">Envoyer un colis à mon tour</a>
      ${supportBox("Ce colis t'a fait sourire ? Petit Colis Doux est gratuit, un petit don aide à le garder en ligne.")}`;
    inside.hidden = false;
    setTimeout(() => inside.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
  };
}

function showContent(c) {
  const u = okUrl(c.url), m = isMedia(c.media) ? esc(c.media) : "";
  const go = (label) => (u ? `<a class="go" href="${esc(u)}" target="_blank" rel="noopener">${label} ↗</a>` : "");
  switch (c.k) {
    case "note": return `<div class="letter">${esc(c.text)}</div>`;
    case "photo": return m ? `<figure class="polaroid"><img src="${m}" alt="${esc(c.cap || "Photo")}" loading="lazy">${c.cap ? `<span>${esc(c.cap)}</span>` : ""}</figure>` : "";
    case "drawing": return m ? `<figure class="polaroid l"><img src="${m}" alt="Dessin" loading="lazy"><span>${esc(c.cap || "un dessin pour toi")}</span></figure>` : "";
    case "song": {
      const sp = spotifyEmbed(u), yt = ytId(u);
      const embed = sp ? `<iframe class="embed music" src="${sp}" allow="encrypted-media" loading="lazy" title="Spotify"></iframe>`
        : yt ? `<iframe class="embed video" src="https://www.youtube-nocookie.com/embed/${yt}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy" title="YouTube"></iframe>` : go("Écouter");
      return `<div class="card"><div class="mini">${ART.song}<div><span class="k">une chanson pour toi</span><h4>${esc(c.title)}</h4>${c.artist ? `<span>${esc(c.artist)}</span>` : ""}</div></div>${embed}</div>`;
    }
    case "video": {
      const yt = ytId(u);
      const body = m ? `<video src="${m}" controls playsinline preload="metadata"></video>`
        : yt ? `<iframe class="embed video" src="https://www.youtube-nocookie.com/embed/${yt}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy" title="YouTube"></iframe>` : go("Regarder");
      return `<div class="card"><div class="mini">${ART.video}<div><span class="k">une vidéo</span><h4>${esc(c.title || "À regarder")}</h4></div></div>${body}</div>`;
    }
    case "gift": return `<div class="card mini">${ART.gift}<div><span class="k">un cadeau</span><h4>${esc(c.title)}</h4>${c.text ? `<p>${esc(c.text)}</p>` : ""}${go("Voir le cadeau")}</div></div>`;
    case "voice": return `<div class="card"><div class="mini">${ART.voice}<div><span class="k">un message vocal</span><h4>${esc(c.title || "Écoute-moi")}</h4></div></div>${m ? `<audio src="${m}" controls preload="metadata"></audio>` : ""}</div>`;
    case "location": {
      const qy = encodeURIComponent([c.title, c.place].filter(Boolean).join(", "));
      return `<div class="card"><div class="mini">${ART.location}<div><span class="k">un lieu</span><h4>${esc(c.title)}</h4>${c.place ? `<span>${esc(c.place)}</span>` : ""}</div></div>
        ${c.text ? `<p>${esc(c.text)}</p>` : ""}
        <iframe class="embed map" src="https://maps.google.com/maps?q=${qy}&output=embed" loading="lazy" title="Carte"></iframe>
        <a class="go" href="https://www.google.com/maps/search/?api=1&query=${qy}" target="_blank" rel="noopener">Ouvrir dans Maps ↗</a></div>`;
    }
    case "coupon": return `<div class="card coupon"><span class="k">coupon · valeur inestimable</span><h4>Bon pour ${esc(c.title)}</h4>${c.until ? `<span>valable jusqu'au ${esc(c.until)}</span>` : ""}${c.text ? `<p style="font-size:.85rem">${esc(c.text)}</p>` : ""}</div>`;
    case "news": return `<article class="card news"><span class="k">édition spéciale</span><h4>${esc(c.title)}</h4>${c.text ? `<p>${esc(c.text)}</p>` : ""}</article>`;
  }
  return "";
}

// ---------- Démarrage : /c/CODE ou ?c=CODE ouvre un colis, sinon la page de création ----------
const code = (location.pathname.match(/^\/c\/([a-z0-9]{4,12})\/?$/i) || [])[1] || new URLSearchParams(location.search).get("c");
sb?.auth.onAuthStateChange((event, s) => {
  session = s;
  if (event === "SIGNED_OUT" && document.getElementById("logout")) loginView("Tu as été déconnecté. Reconnecte-toi pour continuer.");
});
if (code && /^[a-z0-9]{4,12}$/i.test(code)) recipient(code.toLowerCase()); else home();