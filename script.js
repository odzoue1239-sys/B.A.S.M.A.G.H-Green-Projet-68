/* Ce fichier est relié à index.html par <script src="script.js"></script>
Il utilise les id de index.html (ex. #matricule, #calendar) et les classes de style.css (ex. .stamp.on, .day.pick). */
const PRIX_ACHAT = 60, MIN_KG = 2, TAMPONS_CARTE = 12, BONUS = 250, PAS_JOURS = 2;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fcfa = n => n.toLocaleString('fr-FR') + ' FCFA';
const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const toUTC = s => { const [y,m,d] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
const diffDays = (a,b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
const today = iso(new Date());

/* ---------- Données (enregistrées dans le navigateur) ---------- */
const demo = () => ({
anchor: '2026-01-01',
people: [
{id:'BG-6801', nom:'Awa Sarr', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6802', nom:'Mariétou Lassana', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6803', nom:'Binetou Cheikh Ly', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6804', nom:'KOUYI ODZOUE Gilles Emmanuel', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6805', nom:'Adja Sarata GUEYE', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6806', nom:'Aicha Ngoné Sarr', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]},
{id:'BG-6807', nom:'Dieynaba Hanne', quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]}],
collectors: []
});
let db;
try { db = JSON.parse(localStorage.getItem('basmagh2')) || demo(); } catch { db = demo(); }
const save = () => { try { localStorage.setItem('basmagh2', JSON.stringify(db)); } catch {} };

/* ---------- Rôles et droits ---------- */
const STAFF = {'ADM-001':['Administrateur','KOUYI ODZOUE Gilles Emmanuel'],'ADM-002':['Administrateur','MARIETOU'],
'RESP-001':['Responsable','Adja Sarata GUEYE'],'RESP-002':['Responsable','Aicha Ngoné Sarr'],'RESP-003':['Responsable','Dieynaba Hanne'],'RESP-004':['Responsable','Awa Sarr'],
'COLL-001':['Collecteur','OUSMAN Ndeye'],'COLL-002':['Collecteur','Lucas Sanchez'],'COLL-003':['Collecteur','Arthur DUPONT']};
const PARTS = [['PART-001','Mamadou Diop'],['PART-002','Fatou Ndiaye'],['PART-003','Ibrahima Fall'],['PART-004','Aminata Ba'],['PART-005','Cheikh Sarr']];
const DROITS = {Administrateur:'gère la plateforme', Responsable:'supervise les activités', Collecteur:'enregistre les apports de plastique', Participant:'suit sa carte de fidélité'};
const words = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/);
const sameName = (a, b) => { const x = words(a), y = words(b), [s, l] = x.length <= y.length ? [x, y] : [y, x]; return s.every(w => l.includes(w)); };
const isBoss = nom => Object.values(STAFF).some(([r, n]) => r !== 'Collecteur' && sameName(nom, n)); /* admin ou responsable : pas participant */
const nextId = (prefix, pad) => prefix + String(Math.max(0, ...[...db.people, ...db.collectors].filter(x => x.id.startsWith(prefix)).map(x => parseInt(x.id.slice(prefix.length)) || 0)) + 1).padStart(pad, '0');
const blank = (id, nom) => ({id, nom, quartier:'Dakar', tel:'', stamps:0, cartes:0, kg:0, paye:0, last:null, histo:[]});
function fixData() {
db.people = db.people.filter(p => !isBoss(p.nom));
PARTS.forEach(([id, nom]) => { if (!db.people.some(p => p.id === id)) db.people.push(blank(id, nom)); });
const TELS = {'COLL-001':'77-000-00-00','COLL-002':'78-000-00-00','COLL-003':'76-000-00-00'};
Object.entries(STAFF).filter(([, v]) => v[0] === 'Collecteur').forEach(([id, v]) => {
let c = db.collectors.find(x => x.id === id);
if (!c) { c = {id, nom: v[1], zone:'', tel:''}; db.collectors.push(c); }
if (!c.zone || c.zone === '—') c.zone = 'Dakar';
if (!c.tel) c.tel = TELS[id];
});
db.people.forEach(p => { if (!p.id.startsWith('PART-')) p.id = nextId('PART-', 3); });
db.collectors.forEach(c => { if (!c.id.startsWith('COLL-')) c.id = nextId('COLL-', 3); });
save();
}
fixData();
let me = null;
const who = id => STAFF[id] ? {id, role: STAFF[id][0], nom: STAFF[id][1]} : (db.people.find(p => p.id === id) ? {id, role:'Participant', nom: db.people.find(p => p.id === id).nom} : null);
/* qui voit quel matricule : admin = tous ; responsable = participants, collecteurs et le sien ; collecteur = participants et le sien ; participant = aucun */
const canSeeId = (type, id) => !me ? false : me.role === 'Administrateur' ? true : type === 'part' ? me.role !== 'Participant' : type === 'coll' ? (me.role === 'Responsable' || me.id === id) : me.id === id;

/* ---------- Onglets ---------- */
$('nav').addEventListener('click', e => {
const t = e.target.dataset.tab; if (!t) return;
document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b === e.target));
document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
});

/* ---------- Carte à tampons ---------- */
let current = null;
function showCard(p) {
current = p; $('cardView').hidden = false;
$('cNom').textContent = p.nom; $('cMat').textContent = p.id;
$('cInfo').textContent = 'Quartier : ' + p.quartier + (p.tel ? ' – ' + p.tel : '');
$('stamps').innerHTML = Array.from({length: TAMPONS_CARTE}, (_, i) =>
`<div class="stamp ${i < p.stamps ? 'on' : ''}">${i < p.stamps ? 'B' : i + 1}</div>`).join('');
$('cTampons').textContent = p.stamps + ' / ' + TAMPONS_CARTE;
$('cCartes').textContent = p.cartes; $('cKg').textContent = p.kg + ' kg'; $('cPaye').textContent = fcfa(p.paye);
$('histo').innerHTML = p.histo.length ? p.histo.slice().reverse().map(h => `<li>${esc(h)}</li>`).join('') : '<li>Aucun apport pour le moment.</li>';
}
$('dateApport').value = today;
$('formApport').addEventListener('submit', e => {
e.preventDefault(); if (!current || !me || me.role !== 'Collecteur') return;
const kg = parseFloat($('kg').value), date = $('dateApport').value, p = current;
const paie = Math.round(kg * PRIX_ACHAT);
let txt = `${date} : ${kg} kg, payé ${fcfa(paie)}`, msg = '', ok = true;
p.kg += kg; p.paye += paie;
if (kg < MIN_KG) { msg = `Moins de ${MIN_KG} kg : payé, mais pas de tampon.`; ok = false; }
else if (p.last && diffDays(p.last, date) < PAS_JOURS) { msg = 'Déjà un tampon il y a moins de 2 jours : payé, mais pas de tampon.'; ok = false; }
else {
p.stamps++; p.last = date; msg = 'Tampon ajouté.'; txt += ' + 1 tampon';
if (p.stamps === TAMPONS_CARTE) { p.stamps = 0; p.cartes++; p.paye += BONUS; msg = `Carte pleine ! Bonus de ${fcfa(BONUS)} à remettre.`; txt += ` + bonus ${fcfa(BONUS)}`; }
}
p.histo.push(txt); save(); showCard(p); renderPeople();
$('apportMsg').className = 'msg ' + (ok ? 'ok' : 'no'); $('apportMsg').textContent = `À payer : ${fcfa(paie)}. ` + msg;
});

/* ---------- Participants et collecteurs ---------- */
function renderPeople() {
const sh = (t, id) => canSeeId(t, id) ? esc(id) : '••••';
$('tPeople').innerHTML = '<tr><th>Matricule</th><th>Nom</th><th>Quartier</th><th>Tampons</th><th>Cartes</th><th>Kg</th><th>Payé</th></tr>' +
db.people.map(p => `<tr><td>${sh('part', p.id)}</td><td>${esc(p.nom)}</td><td>${esc(p.quartier)}</td><td>${p.stamps}/${TAMPONS_CARTE}</td><td>${p.cartes}</td><td>${p.kg}</td><td>${fcfa(p.paye)}</td></tr>`).join('');
const phone = me && (me.role === 'Administrateur' || me.role === 'Responsable'), noId = me && me.role === 'Participant';
$('tCollectors').innerHTML = '<tr>' + (noId ? '' : '<th>Matricule</th>') + '<th>Nom</th><th>Zone</th>' + (phone ? '<th>Téléphone</th>' : '') + '</tr>' +
db.collectors.map(c => '<tr>' + (noId ? '' : `<td>${sh('coll', c.id)}</td>`) + `<td>${esc(c.nom)}</td><td>${esc(c.zone)}</td>` + (phone ? `<td>${esc(c.tel)}</td>` : '') + '</tr>').join('');
$('tResp').innerHTML = '<tr><th>Matricule</th><th>Nom</th></tr>' +
Object.entries(STAFF).filter(([, v]) => v[0] === 'Responsable').map(([id, v]) => `<tr><td>${sh('resp', id)}</td><td>${esc(v[1])}</td></tr>`).join('');
$('tRank').innerHTML = '<tr><th>Rang</th><th>Nom</th><th>Matricule</th><th>Plastique apporté</th></tr>' +
db.people.slice().sort((a, b) => b.kg - a.kg).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nom)}</td><td>${sh('part', p.id)}</td><td>${p.kg} kg</td></tr>`).join('');
}
$('formPerson').addEventListener('submit', e => {
e.preventDefault();
const nom = $('pNom').value.trim();
if (isBoss(nom)) { $('pMsg').className = 'msg no'; $('pMsg').textContent = 'Cette personne est administrateur ou responsable : elle ne compte pas comme participant.'; return; }
const p = blank(nextId('PART-', 3), nom); p.quartier = $('pQuartier').value.trim(); p.tel = $('pTel').value.trim();
db.people.push(p); save(); renderPeople(); e.target.reset();
$('pMsg').className = 'msg ok'; $('pMsg').textContent = 'Carte créée. Matricule à écrire sur la carte : ' + p.id;
});
$('formCollector').addEventListener('submit', e => {
e.preventDefault();
db.collectors.push({id: nextId('COLL-', 3), nom: $('kNom').value.trim(), zone: $('kZone').value.trim(), tel: $('kTel').value.trim()});
save(); renderPeople(); renderPlanning(); e.target.reset();
});

/* ---------- Planning 2026 : un ramassage tous les 2 jours à partir de la date d'ancrage ---------- */
let view = new Date(2026, today.startsWith('2026') ? new Date().getMonth() : 0, 1);
const isPickup = d => { const k = diffDays(db.anchor, d); return d.startsWith('2026') && k % PAS_JOURS === 0; };
function collectorFor(d) { const n = db.collectors.length; if (!n) return '—'; const k = Math.floor(diffDays('2026-01-01', d) / PAS_JOURS); return db.collectors[((k % n) + n) % n].nom; }
function renderPlanning() {
$('anchor').value = db.anchor;
$('monthTitle').textContent = view.toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
const first = new Date(view.getFullYear(), view.getMonth(), 1), last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
let h = ['L','M','M','J','V','S','D'].map(x => `<div class="dow">${x}</div>`).join('');
h += '<div class="day void"></div>'.repeat((first.getDay() + 6) % 7);
for (let n = 1; n <= last.getDate(); n++) {
const d = iso(new Date(view.getFullYear(), view.getMonth(), n));
h += `<div class="day ${isPickup(d) ? 'pick' : ''} ${d === today ? 'now' : ''}">${n}</div>`;
}
$('calendar').innerHTML = h;
let ref = today.startsWith('2026') ? today : '2026-01-01', out = [];
for (let i = 0; out.length < 5 && i < 366; i++) {
const d = iso(new Date(toUTC(ref) + i * 86400000 + 12 * 3600000));
if (isPickup(d)) out.push(`<li><strong>${new Date(toUTC(d) + 12 * 3600000).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'})}</strong> – collecteur : ${esc(collectorFor(d))}</li>`);
}
$('nextList').innerHTML = out.join('') || '<li>Plus de collecte prévue en 2026.</li>';
}
$('anchor').addEventListener('change', e => { if (e.target.value) { db.anchor = e.target.value; save(); renderPlanning(); } });
$('btnToday').addEventListener('click', () => {
if (!today.startsWith('2026')) { alert('Le planning couvre uniquement l’année 2026.'); return; }
db.anchor = today; save(); renderPlanning();
});
$('prev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderPlanning(); });
$('next').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderPlanning(); });

renderPeople(); renderPlanning();


/* ================= AJOUTS : connexion, droits, vidéo ================= */
function applyRole() {
const r = me ? me.role : '';
document.body.classList.toggle('in', !!me);
$('whoami').textContent = me ? me.nom + ' – ' + me.role : ''; $('logout').hidden = !me;
document.querySelector('[data-tab="personnes"]').style.display = me ? '' : 'none';
const tp = [...$('tab-personnes').children], ki = tp.indexOf($('tCollectors').parentElement); /* participant : seulement la liste des collecteurs (noms et zones) */
tp.forEach((el, i) => el.style.display = (r === 'Participant' && i !== 0 && i !== ki && i !== ki - 1) ? 'none' : '');
tp[0].textContent = r === 'Participant' ? 'Collecteurs' : 'Participants et collecteurs';
$('formSearch').style.display = $('searchMsg').style.display = r === 'Participant' ? 'none' : '';
$('formApport').style.display = r === 'Collecteur' ? '' : 'none';
$('formPerson').style.display = r === 'Participant' ? 'none' : '';
$('formCollector').style.display = (r === 'Administrateur' || r === 'Responsable') ? '' : 'none';
renderPeople();
}
function login(id) {
const r = who(id); if (!r) return false;
me = r; try { sessionStorage.setItem('basmagh_me', id); } catch {}
applyRole(); document.querySelector('[data-tab="carte"]').click(); $('cardView').hidden = true;
if (r.role === 'Participant') showCard(db.people.find(p => p.id === id));
return true;
}
$('loginMat').addEventListener('input', () => { const r = who($('loginMat').value.trim().toUpperCase()); $('loginMsg').className = 'msg ok'; $('loginMsg').textContent = r ? r.nom + ' – ' + r.role + ' (' + DROITS[r.role] + ')' : ''; });
$('formLogin').addEventListener('submit', e => { e.preventDefault(); if (!login($('loginMat').value.trim().toUpperCase())) { $('loginMsg').className = 'msg no'; $('loginMsg').textContent = 'Matricule inconnu.'; } });
$('logout').addEventListener('click', () => { me = null; try { sessionStorage.removeItem('basmagh_me'); } catch {} $('loginMat').value = ''; $('loginMsg').textContent = ''; $('cardView').hidden = true; applyRole(); });
$('formSearch').addEventListener('submit', e => {
e.preventDefault(); if (!me) return;
const m = $('matricule').value.trim().toUpperCase(), r = who(m), p = db.people.find(x => x.id === m);
$('searchMsg').className = 'msg ' + (r ? 'ok' : 'no');
$('searchMsg').textContent = !r ? 'Matricule introuvable. Vérifie le code sur la carte ou crée la carte dans l’onglet Personnes.' : p ? '' : (me.role === 'Administrateur' ? r.nom + ' – ' + r.role + ' : pas de carte.' : 'Ce matricule n’a pas de carte.');
if (p) showCard(p); else $('cardView').hidden = true;
});
{ let id = null; try { id = sessionStorage.getItem('basmagh_me'); } catch {} if (id && who(id)) login(id); else applyRole(); }
(() => {

const END = 168, EV = [], at = (t, f) => EV.push([t, f]); let now = 0, cur = 0, spd = 1, inst = false, playing = false, voiceOn = true, idx = 0, last = 0; const LM = {};
const VO = [['Au point de collecte','Un participant arrive avec son sac de plastique.'],['Deux agents l’accueillent','Deux agents l’accueillent.'],['L’agent informatique saisit le matricule','L’agent informatique saisit le matricule.'],['Sa fiche apparaît','Sa fiche apparaît, avec sa carte de douze cases.'],['Zoom sur la carte','Zoom sur la carte.'],['L’agent de terrain récupère','Il pose le sac sur la balance.'],['La balance affiche clairement','La balance affiche deux kilos.'],['L’agent informatique saisit le poids','Il saisit le poids sur l’ordinateur.'],['Le site calcule automatiquement','Deux kilos fois soixante : cent vingt francs.'],['Le dépôt atteint le minimum','Minimum de deux kilos atteint : un tampon.'],['L’agent de terrain appose','L’agent appose le tampon sur la carte physique.'],['Un autre participant','Un autre participant dépose un sac de quatre kilos.'],['La balance affiche 4 kg','La balance affiche quatre kilos.'],['Le site calcule 240','Deux cent quarante francs, mais un seul tampon.'],['Montant versé','Deux cent quarante francs versés.'],['Un participant (PART-003)','Un participant dépose un sac d’un kilo.'],['La balance affiche 1 kg','La balance affiche un kilo.'],['Le site calcule 60','Soixante francs, aucun tampon : minimum deux kilos.'],['Le temps passe','Le temps passe.'],['Le participant revient','Il revient avec un deuxième sac d’un kilo.'],['Le site enregistre et paie','Soixante francs payés, toujours aucun tampon.'],['Les deux dépôts','Un kilo plus un kilo ne donnent pas un tampon.'],['L’horloge avance','L’horloge avance jusqu’à une nouvelle visite.'],['Ce matin, Aminata','Ce matin, Aminata a déjà reçu un tampon.'],['Elle revient','Elle revient le même jour avec deux kilos.'],['Le site enregistre le dépôt','Cent vingt francs payés.'],['Pas de deuxième tampon','Pas de deuxième tampon : un seul tous les deux jours.'],['L’agent informatique affiche','L’agent affiche l’historique du participant.'],['Il montre','Il suit ses apports et ses récompenses.'],['Ouverture de l’onglet','Le planning 2026 montre un ramassage tous les deux jours.'],['Les prochaines dates','Les prochaines collectes sont bien visibles.'],['Deux agents, deux rôles','Deux agents, deux rôles : l’ordinateur, et l’accueil avec la pesée.'],['Le tableau de bord','Voici le tableau de bord, avec le classement des participants.'],['B.A.S.M.A.G.H Green –','B.A.S.M.A.G.H Green, du déchet à la ressource.']];
const speak = t => { if (!voiceOn || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('fr')); if (v) u.voice = v; u.rate = Math.min(2, 1.05 * spd); speechSynthesis.speak(u); };
const cap = s => { $('vcap').textContent = s; const v = s && !inst && VO.find(([k]) => s.startsWith(k)); if (v) speak(v[1]); }, ttl = s => $('vt').textContent = s;
const mv = (id, x, y, ms = 1000) => { const e = $(id); LM[id] = {x, y, d: ms / 1000, t0: cur}; e.style.transition = (inst || !ms) ? 'none' : `transform ${ms / spd}ms ease-in-out`; e.style.transform = `translate(${x}px,${y}px)`; };
const scr = (h, op) => { const o = $('vov'); o.className = 'ov'; if (h == null) return; o.style.background = op ? '#1F4D3A' : ''; o.innerHTML = '<div class="scr">' + h + '</div>'; void o.offsetWidth; o.className = 'ov on'; };
const zoom = on => $('vov').classList.toggle('zoom', on);
const flash = id => { if (inst) return; const e = $(id); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); };
const walk = (id, on) => $(id).classList.toggle('w', on);
const card = (nom, mat, n, note = '') => `<b>${nom} – ${mat}</b><div class="stamps">${Array.from({length:12}, (_, i) => `<div class="stamp ${i < n ? 'on' : ''}">${i < n ? 'B' : i + 1}</div>`).join('')}</div><p>${note}</p>`;
const calc = kg => `<div class="calc">${kg} kg × 60 FCFA = ${kg * 60} FCFA</div>`;
const typeIn = (t, s) => { for (let i = 0; i < s.length; i++) at(t + i * .3, () => $('vmon').textContent = s.slice(0, i + 1)); };
const clock = (t, deg, txt) => {
at(t, () => { cap(txt); scr(`<svg viewBox="0 0 100 100" width="120"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#1F4D3A" stroke-width="4"/><line id="vh" x1="50" y1="50" x2="50" y2="18" stroke="#E8590C" stroke-width="5" stroke-linecap="round" style="transform-origin:50px 50px;transition:transform 3s ease-in-out"/></svg>`, 1); });
at(t + .2, () => $('vh').style.transform = `rotate(${deg}deg)`);
};
const arrive = (t, nom, col) => {
at(t, () => { mv('vP', 900, 330, 0); mv('vbag', 870, 322, 0); mv('vA', 335, 330, 0); $('vbw').textContent = ''; $('vmon').textContent = ''; $('vPn').textContent = nom; $('vpb').setAttribute('fill', col); });
at(t + .2, () => { walk('vP', 1); mv('vP', 630, 330, 3000); mv('vbag', 585, 322, 3000); });
at(t + 3.4, () => walk('vP', 0));
};
const weigh = (t, kg) => {
at(t, () => { walk('vA', 1); mv('vA', 560, 330, 1500); });
at(t + 1.8, () => { mv('vbag', 400, 306, 1000); mv('vA', 335, 330, 1200); });
at(t + 3.1, () => { walk('vA', 0); $('vbw').textContent = kg + ' kg'; });
};
const stamp = t => {
at(t, () => { $('vpc').style.opacity = 1; $('vst').style.transition = 'none'; $('vst').style.transform = 'scale(0)'; });
at(t + .6, () => { $('vst').style.transition = 'transform .25s'; $('vst').style.transform = 'scale(1)'; });
at(t + 1.2, () => $('vw').style.transform = 'scale(2.2)'); at(t + 3, () => $('vw').style.transform = 'none'); at(t + 3.6, () => $('vpc').style.opacity = 0);
};
const reset = () => { scr(null); $('vw').style.transform = 'none'; ['vP','vA','vB'].forEach(i => walk(i, 0)); mv('vP', 900, 330, 0); mv('vbag', 870, 322, 0); mv('vA', 335, 330, 0); $('vbw').textContent = ''; $('vmon').textContent = ''; $('vpc').style.opacity = 0; cap(''); ttl(''); };

function build() {
/* Scène 1 – Accueil et identification */
at(0, () => { ttl('Scène 1 – Accueil et identification'); cap('Au point de collecte, un participant arrive avec un sac de déchets plastiques.'); });
arrive(.1, 'Mamadou Diop', '#E8590C');
at(4, () => cap('Deux agents l’accueillent : l’agent de terrain, et l’agent informatique assis devant son ordinateur.'));
at(7, () => { cap('L’agent informatique saisit le matricule du participant sur le site : PART-001.'); walk('vB', 1); }); typeIn(7, 'PART-001'); at(10, () => walk('vB', 0));
at(11, () => { cap('Sa fiche apparaît, avec sa carte numérique de fidélité de 12 cases.'); scr(card('Mamadou Diop', 'PART-001', 0, 'Carte numérique : 12 cases')); });
at(16, () => { zoom(true); cap('Zoom sur la carte numérique…'); }); at(19, () => { zoom(false); scr(null); cap('…puis direction la balance.'); });
/* Scène 2 – Pesée et premier dépôt */
at(21, () => ttl('Scène 2 – Pesée et premier dépôt')); weigh(21.2, 2);
at(21.2, () => cap('L’agent de terrain récupère le sac et le pose sur la balance électronique.'));
at(24.6, () => cap('La balance affiche clairement 2 kg.'));
at(28, () => { cap('L’agent informatique saisit le poids sur son ordinateur.'); walk('vB', 1); }); typeIn(28, 'Poids : 2 kg'); at(31.6, () => walk('vB', 0));
at(32, () => { cap('Le site calcule automatiquement : 2 kg × 60 FCFA = 120 FCFA.'); scr(card('Mamadou Diop', 'PART-001', 0) + calc(2)); });
at(36, () => { cap('Le dépôt atteint le minimum de 2 kg : un tampon numérique est ajouté à la carte.'); scr(card('Mamadou Diop', 'PART-001', 1, 'Dépôt de 2 kg : +1 tampon') + calc(2)); });
at(40, () => scr(null)); at(40.2, () => cap('L’agent de terrain appose ensuite un tampon sur la carte physique.')); stamp(40.4);
at(44.6, () => { cap('Gros plan terminé : balayage vers un autre dépôt…'); flash('vwp'); });
/* Scène 3 – Un dépôt de 4 kg */
at(45.2, () => ttl('Scène 3 – Un dépôt de 4 kg')); arrive(45.2, 'Fatou Ndiaye', '#C2185B'); weigh(48.8, 4);
at(45.4, () => cap('Un autre participant (PART-002) dépose un sac de 4 kg.')); at(52.2, () => cap('La balance affiche 4 kg.'));
at(53, () => { walk('vB', 1); }); typeIn(53, 'Poids : 4 kg'); at(56.6, () => walk('vB', 0));
at(57, () => { cap('Le site calcule 240 FCFA et attribue un seul tampon.'); scr(card('Fatou Ndiaye', 'PART-002', 1, 'Même avec 4 kg : un seul tampon, pas deux.') + calc(4)); });
at(62, () => { cap('Montant versé au participant : 240 FCFA.'); scr('<div class="big">240 FCFA</div>'); });
at(64.8, () => flash('vfd'));
/* Scène 4 – Un dépôt de 1 kg */
at(65.4, () => { scr(null); ttl('Scène 4 – Un dépôt de 1 kg'); cap('Un participant (PART-003) dépose un sac de 1 kg.'); }); arrive(65.4, 'Ibrahima Fall', '#7B5EA7'); weigh(69, 1);
at(72.4, () => cap('La balance affiche 1 kg.')); at(73, () => walk('vB', 1)); typeIn(73, 'Poids : 1 kg'); at(76, () => walk('vB', 0));
at(76.5, () => { cap('Le site calcule 60 FCFA et enregistre le dépôt, mais aucun tampon : le minimum est de 2 kg par dépôt.'); scr(card('Ibrahima Fall', 'PART-003', 0, '1 kg < 2 kg : aucun tampon') + calc(1)); });
clock(81.5, 120, 'Le temps passe…');
/* Scène 5 – Deux petits dépôts séparés */
arrive(84.5, 'Ibrahima Fall', '#7B5EA7'); weigh(88.1, 1);
at(85.5, () => { scr(null); ttl('Scène 5 – Deux petits dépôts séparés'); cap('Le participant revient avec un deuxième sac de 1 kg.'); });
at(91.4, () => cap('La balance affiche 1 kg.')); at(92, () => walk('vB', 1)); typeIn(92, 'Poids : 1 kg'); at(95, () => walk('vB', 0));
at(95.5, () => { cap('Le site enregistre et paie aussi 60 FCFA, mais n’accorde toujours aucun tampon.'); scr(card('Ibrahima Fall', 'PART-003', 0, '1 kg < 2 kg : aucun tampon') + calc(1)); });
at(100, () => { cap('Les deux dépôts de 1 kg ne peuvent pas être additionnés pour obtenir un tampon.'); scr('<b>Dépôt 1 : 1 kg – 60 FCFA – aucun tampon</b><br><b>Dépôt 2 : 1 kg – 60 FCFA – aucun tampon</b><p>1 kg + 1 kg ≠ un dépôt de 2 kg</p>'); });
clock(104.5, 300, 'L’horloge avance jusqu’à une nouvelle visite…');
/* Scène 6 – Limite d'un tampon tous les deux jours */
arrive(107.5, 'Aminata Ba', '#00897B'); weigh(111.1, 2);
at(108.5, () => { scr(card('Aminata Ba', 'PART-004', 1, 'Tampon reçu ce matin'), 0); ttl('Scène 6 – Un tampon tous les deux jours'); cap('Ce matin, Aminata (PART-004) a déjà reçu un tampon.'); });
at(112, () => { scr(null); cap('Elle revient le même jour avec un sac de 2 kg : la balance affiche 2 kg.'); });
at(114.4, () => walk('vB', 1)); typeIn(114.4, 'Poids : 2 kg'); at(117.8, () => walk('vB', 0));
at(118, () => { cap('Le site enregistre le dépôt et calcule 120 FCFA.'); scr(card('Aminata Ba', 'PART-004', 1) + calc(2)); });
at(122, () => { cap('Pas de deuxième tampon : un seul dépôt admissible donne un tampon tous les deux jours.'); scr(card('Aminata Ba', 'PART-004', 1, 'Déjà un tampon aujourd’hui : aucun deuxième tampon') + calc(2)); });
at(126, () => { zoom(true); cap('Zoom sur l’écran de l’ordinateur…'); });
/* Scène 7 – Historique */
at(128, () => { zoom(false); ttl('Scène 7 – Historique du participant'); cap('L’agent informatique affiche l’historique actualisé : dates, poids, montants et tampons.');
scr('<b>Historique – Aminata Ba (PART-004)</b><table><tr><th>Date</th><th>Poids</th><th>Montant versé</th><th>Tampon</th></tr><tr><td>12/01/2026 (matin)</td><td>2 kg</td><td>120 FCFA</td><td>+1</td></tr><tr><td>12/01/2026 (après-midi)</td><td>2 kg</td><td>120 FCFA</td><td>0</td></tr></table>'); });
at(133, () => cap('Il montre les informations au participant, qui suit ainsi ses apports et ses récompenses.'));
at(137, () => { zoom(true); cap('Zoom arrière sur l’écran…'); }); at(138.5, () => { zoom(false); scr(null); });
/* Scène 8 – Planning */
at(139, () => { ttl('Scène 8 – Planning des collectes'); cap('Ouverture de l’onglet Planning : le calendrier 2026 avec un ramassage tous les deux jours.');
let h = '<b>Onglets : Ma carte · <u>Planning 2026</u> · Personnes · Le projet</b><div class="cal">' + ['L','M','M','J','V','S','D'].map(x => `<div class="dow">${x}</div>`).join('') + '<div class="day void"></div>'.repeat(3);
for (let n = 1; n <= 31; n++) h += `<div class="day ${n % 2 ? 'pick' : ''}">${n}</div>`;
scr(h + '</div><p><b>Janvier 2026</b> – Prochaines collectes : 13, 15 et 17 janvier</p>'); });
at(146, () => cap('Les prochaines dates de collecte sont clairement visibles.'));
at(150, () => { scr(null); cap('Le calendrier se transforme peu à peu en vue générale du point de collecte.'); });
/* Scène 9 – Conclusion */
at(153, () => { ttl('Scène 9 – Conclusion'); cap('Deux agents, deux rôles : l’un gère les informations sur ordinateur, l’autre accueille les participants et pèse les sacs.'); walk('vA', 1); walk('vB', 1); walk('vP', 1); mv('vP', 900, 330, 3500); mv('vbag', 400, 306, 0); });
at(159, () => { walk('vA', 0); walk('vB', 0); cap('Le tableau de bord du site.');
scr('<b>Tableau de bord</b><dl class="stats"><div><dt>Dépôts</dt><dd>6</dd></div><div><dt>Plastique apporté</dt><dd>12 kg</dd></div><div><dt>Total payé</dt><dd>720 FCFA</dd></div><div><dt>Tampons</dt><dd>3</dd></div></dl><b>Classement</b><br><ol><li>Fatou Ndiaye – 4 kg</li><li>Aminata Ba – 4 kg</li><li>Mamadou Diop – 2 kg</li><li>Ibrahima Fall – 2 kg</li></ol>'); });
at(166, () => { scr(null); cap('B.A.S.M.A.G.H Green – Du déchet à la ressource, à Dakar'); });
}
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const ui = () => { $('vsl').value = now; $('vtm').textContent = fmt(now) + ' / ' + fmt(END); };
const run = t => { inst = true; if ('speechSynthesis' in window) speechSynthesis.cancel(); reset(); now = Math.max(0, Math.min(END, t)); idx = 0; while (idx < EV.length && EV[idx][0] <= now) { cur = EV[idx][0]; EV[idx][1](); idx++; } inst = false; ui(); };
const loop = ts => { if (!playing) return; now += Math.min(.1, (ts - last) / 1000) * spd; last = ts;
while (idx < EV.length && EV[idx][0] <= now) { cur = EV[idx][0]; EV[idx][1](); idx++; }
if (now >= END) { now = END; ui(); stop(); return; } ui(); requestAnimationFrame(loop); };
const freeze = () => Object.keys(LM).forEach(id => { const e = $(id), c = getComputedStyle(e).transform; if (c && c !== 'none') { e.style.transition = 'none'; e.style.transform = c; } });
const stop = () => { playing = false; freeze(); $('vplay').textContent = now >= END ? '↻ Rejouer' : '▶ Lecture'; box.classList.add('paused'); if ('speechSynthesis' in window) speechSynthesis[now >= END ? 'cancel' : 'pause'](); };
const box = document.querySelector('.vid');
function start() { if (now >= END) run(0); playing = true; cur = now; Object.entries(LM).forEach(([id, m]) => { const rem = m.d - (now - m.t0); mv(id, m.x, m.y, rem > .05 ? rem * 1000 : 0); });
$('vplay').textContent = '⏸ Pause'; box.classList.remove('paused'); if ('speechSynthesis' in window) speechSynthesis.resume(); last = performance.now(); requestAnimationFrame(loop); }
$('vplay').addEventListener('click', () => playing ? stop() : start());
$('vback').addEventListener('click', () => { run(now - 10); });
$('vspd').addEventListener('click', () => { spd = spd === 1 ? 2 : 1; $('vspd').textContent = 'x' + spd; });
$('vvoice').addEventListener('click', () => { voiceOn = !voiceOn; $('vvoice').textContent = (voiceOn ? '🔊' : '🔇') + ' Voix'; if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel(); });
$('vsl').addEventListener('input', () => run(parseFloat($('vsl').value)));
build(); EV.sort((a, b) => a[0] - b[0]); reset(); cap('Appuie sur « Lecture » (durée : environ 2 min 50, avec voix).');
})();
