const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const timeline = document.querySelector('#timeline');
const playButton = document.querySelector('#playButton');
const playIcon = document.querySelector('#playIcon');
const poseName = document.querySelector('#poseName');
const poseTime = document.querySelector('#poseTime');
const frameReadout = document.querySelector('#frameReadout');
const statusText = document.querySelector('#statusText');
const beatButtons = [...document.querySelectorAll('.beat')];
let time = 0;
let playing = false;
let lastStamp = 0;
let recorder;
let chunks = [];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (value) => value * value * (3 - 2 * value);
const lerp = (a, b, amount) => a + (b - a) * amount;
const fmt = (value) => `00:${String(Math.floor(value)).padStart(2, '0')}`;

function roundedRect(x, y, width, height, radius, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(x1, y1, x2, y2, width, color, cap = 'round') {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = cap; ctx.stroke();
}
function circle(x, y, radius, fill) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 720);
  gradient.addColorStop(0, '#d8e1d9'); gradient.addColorStop(1, '#b5c8bd');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let x = 50; x < 1280; x += 44) for (let y = 38; y < 630; y += 44) circle(x, y, 1.2, '#fff');
  ctx.fillStyle = '#9eb6a8'; ctx.fillRect(0, 610, 1280, 110);
  ctx.fillStyle = '#87a494'; ctx.fillRect(0, 610, 1280, 5);
  for (let x = 0; x < 1280; x += 64) line(x, 615, x - 72, 720, 1, 'rgba(52,78,65,.12)', 'butt');
}

function drawWeight(x, y, scale = 1, rotation = 0, airborne = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(29,36,34,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 8;
  roundedRect(-73, -53, 146, 106, 9, '#ef654d');
  ctx.shadowColor = 'transparent'; roundedRect(-59, -39, 118, 78, 5, '#f4775d', '#db5544');
  line(-43, -25, 43, -25, 3, 'rgba(255,224,194,.58)');
  line(-43, 25, 43, 25, 3, 'rgba(174,53,47,.26)');
  circle(0, 0, 22, '#f5c65d'); circle(0, 0, 14, '#ddaa42');
  ctx.fillStyle = '#553f32'; ctx.font = '700 15px Space Grotesk'; ctx.textAlign = 'center'; ctx.fillText('45', 0, 5);
  ctx.restore();
}

function drawCharacter(state) {
  const { hipX, hipY, lean, bend, armLift, airborne, weightY, toss } = state;
  const skin = '#f0b18f'; const dark = '#24302c'; const shirt = '#f3c55a';
  const shoulderX = hipX + lean * 0.3; const shoulderY = hipY - 137 + bend * 18;
  const headX = shoulderX + lean * .18; const headY = shoulderY - 57;
  const handY = hipY - 77 - armLift * 90;
  ctx.save();
  ctx.globalAlpha = airborne ? .12 : .25; ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(hipX, 611, 93, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  line(hipX - 17, hipY, hipX - 34 - lean * .2, 603 - bend * 8, 19, dark); line(hipX + 18, hipY, hipX + 42 + lean * .25, 603 + bend * 5, 19, dark);
  line(hipX - 43 - lean * .2, 603 - bend * 8, hipX - 61, 603 - bend * 8, 12, '#e9805f'); line(hipX + 42 + lean * .25, 603 + bend * 5, hipX + 70, 603 + bend * 5, 12, '#e9805f');
  ctx.save(); ctx.translate(hipX, hipY - 57); ctx.rotate(lean * .012); roundedRect(-44, -55 + bend * 6, 88, 112 - bend * 7, 24, shirt); ctx.restore();
  line(shoulderX - 34, shoulderY + 8, hipX - 57 - lean * .1, handY, 17, dark); line(shoulderX + 34, shoulderY + 8, hipX + 57 + lean * .1, handY + 5, 17, dark);
  line(hipX - 57 - lean * .1, handY, hipX - 70, handY + 3, 12, skin); line(hipX + 57 + lean * .1, handY + 5, hipX + 70, handY + 7, 12, skin);
  circle(headX, headY, 38, skin); ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(headX, headY - 5, 38, Math.PI, Math.PI * 2); ctx.fill();
  circle(headX - 12, headY + 4, 3.5, dark); circle(headX + 12, headY + 4, 3.5, dark);
  line(headX - 7, headY + 19, headX + 9, headY + 19, 3, dark);
  if (airborne) { line(headX - 52, headY - 15, headX - 81, headY - 30, 5, 'rgba(239,101,77,.65)'); line(headX + 52, headY - 15, headX + 81, headY - 30, 5, 'rgba(239,101,77,.65)'); }
  ctx.restore();
  if (airborne) drawWeight(hipX + toss, weightY, .9, toss * .002, true); else drawWeight(hipX, weightY, 1, 0, false);
}

function getState(t) {
  if (t < 1.5) { const p = ease(t / 1.5); return { name: 'Anticipation', hipX: 520, hipY: lerp(500, 540, p), lean: lerp(-20, -50, p), bend: lerp(0, 1, p), armLift: 0, weightY: 570, toss: 0, airborne: false }; }
  if (t < 4) { const p = ease((t - 1.5) / 2.5); return { name: 'Exertion', hipX: 520, hipY: lerp(540, 400, p), lean: lerp(-50, -8, p), bend: lerp(1, .2, p), armLift: lerp(0, 1, p), weightY: lerp(570, 250, p), toss: 0, airborne: false }; }
  if (t < 5) { const p = ease(t - 4); return { name: 'Release', hipX: lerp(520, 492, p), hipY: lerp(400, 450, p), lean: lerp(-8, 24, p), bend: lerp(.2, 0, p), armLift: 1, weightY: lerp(250, 92, p), toss: lerp(0, 125, p), airborne: true }; }
  const p = ease((t - 5) / 3); return { name: 'Recovery', hipX: lerp(492, 575, p), hipY: lerp(450, 495, p), lean: lerp(24, -3, p), bend: lerp(0, 0, p), armLift: lerp(1, .3, p), weightY: 92, toss: lerp(125, 300, p), airborne: true };
}

function render() {
  ctx.clearRect(0, 0, 1280, 720); drawBackground();
  const state = getState(time); drawCharacter(state);
  poseName.textContent = state.name; poseTime.textContent = fmt(time); frameReadout.textContent = `FRAME ${String(Math.round(time * 24)).padStart(3, '0')}`;
  timeline.value = time; beatButtons.forEach((button, index) => button.classList.toggle('active', state.name === ['Anticipation', 'Exertion', 'Release', 'Recovery'][index]));
}
function tick(stamp) { if (!lastStamp) lastStamp = stamp; if (playing) { time += (stamp - lastStamp) / 1000; if (time >= 8) { time = 0; stop(); } } lastStamp = stamp; render(); requestAnimationFrame(tick); }
function stop() { playing = false; playIcon.textContent = '▶'; statusText.textContent = 'Ready to animate'; }
playButton.addEventListener('click', () => { playing = !playing; playIcon.textContent = playing ? 'Ⅱ' : '▶'; statusText.textContent = playing ? 'Playing study' : 'Paused'; });
document.querySelector('#restartButton').addEventListener('click', () => { time = 0; lastStamp = 0; stop(); render(); });
timeline.addEventListener('input', (event) => { time = Number(event.target.value); lastStamp = 0; render(); });
beatButtons.forEach((button) => button.addEventListener('click', () => { time = Number(button.dataset.time); lastStamp = 0; stop(); render(); }));
document.querySelector('#pngButton').addEventListener('click', () => { const link = document.createElement('a'); link.download = `lift-toss-frame-${Math.round(time * 24)}.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
document.querySelector('#recordButton').addEventListener('click', () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  chunks = []; const stream = canvas.captureStream(24); recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => { const link = document.createElement('a'); link.download = 'weighted-character-lift-toss.webm'; link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); link.click(); statusText.textContent = 'Proof recording downloaded'; document.querySelector('#recordButton').innerHTML = '<span>●</span> Record proof'; };
  recorder.start(); document.querySelector('#recordButton').innerHTML = '<span>■</span> Stop recording'; statusText.textContent = 'Recording proof'; time = 0; playing = true; playIcon.textContent = 'Ⅱ';
});
requestAnimationFrame(tick);