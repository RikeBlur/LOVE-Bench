// Scores follow the dimension order below.
const dimensions = [
  "Long-Horizon Stability", "Video Fidelity", "Instruction Compliance", "Video Quality"
];
const results = [
  {name: "InsV2V", scores: [0.68, 0.73, 0.48, 0.71]},
  {name: "VACE", scores: [0.73, 0.89, 0.56, 0.80]},
  {name: "Lucy-Edit-Dev", scores: [0.73, 0.88, 0.58, 0.82]},
  {name: "AnyV2V", scores: [0.53, 0.68, 0.47, 0.50]},
  {name: "RAVE", scores: [0.72, 0.86, 0.56, 0.70]},
  {name: "LiveEdit", scores: [0.65, 0.81, 0.57, 0.68]},
  {name: "StreamV2V", scores: [0.64, 0.72, 0.41, 0.50]},
  {name: "StreamEdit-LL", scores: [0.70, 0.86, 0.56, 0.83]},
  {name: "StreamEdit-SF", scores: [0.69, 0.88, 0.53, 0.81]},
  {name: "LOVE-Stream", scores: [0.75, 0.92, 0.51, 0.83]},
];
function renderScores() {
  const head = document.querySelector("#score-head");
  const body = document.querySelector("#score-body");
  head.replaceChildren();
  body.replaceChildren();
  const header = head.insertRow();
  for (const name of ["Rank", "Model", "Overall", ...dimensions]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = name;
    if (name === "Overall") {
      th.setAttribute("aria-sort", "descending");
      th.className = "active-score";
    }
    header.append(th);
  }
  // The published scores have two decimals. Integer sums preserve exact ties.
  const sorted = results.map(({name, scores}) => ({
    name, scores,
    sumHundredths: scores.reduce((sum, score) => sum + Math.round(score * 100), 0)
  })).sort((a, b) =>
    b.sumHundredths - a.sumHundredths ||
    // Show LOVE-Stream first among models with the same Overall score.
    Number(b.name === "LOVE-Stream") - Number(a.name === "LOVE-Stream")
  );
  let rank = 0, previousSum;
  sorted.forEach(({name, scores, sumHundredths}, i) => {
    if (sumHundredths !== previousSum) rank = i + 1;
    previousSum = sumHundredths;
    const row = body.insertRow();
    if (name === "LOVE-Stream") row.className = "ours";
    row.insertCell().textContent = rank;
    const title = document.createElement("th");
    title.scope = "row";
    title.textContent = name;
    row.append(title);
    const overall = row.insertCell();
    overall.className = "active-score";
    // Four decimals show the exact mean of four two-decimal dimension scores.
    overall.textContent = (sumHundredths / (100 * dimensions.length)).toFixed(4);
    scores.forEach(score => { row.insertCell().textContent = score.toFixed(2); });
  });
}
renderScores();

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}
const demoPlayers = [];
document.querySelectorAll('.demo-example').forEach(figure => {
  const source = figure.querySelector('.comparison-source');
  const edited = figure.querySelector('.comparison-edited');
  const clips = [source, edited];
  const play = figure.querySelector('.comparison-play');
  const timeline = figure.querySelector('.comparison-timeline');
  const clock = figure.querySelector('.comparison-clock');
  const wipe = figure.querySelector('.comparison-wipe');
  const status = figure.querySelector('.comparison-status');
  let duration = 0;
  wipe.addEventListener('input', () => figure.querySelector('.compare').style.setProperty('--split', wipe.value + '%'));
  function refreshTime() {
    const current = Math.min(source.currentTime, duration);
    timeline.value = current;
    const pct = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    timeline.style.setProperty('--progress', pct.toFixed(2) + '%');
    clock.textContent = formatTime(source.currentTime) + ' / ' + formatTime(duration);
  }
  function prepare() {
    if (clips.every(v => Number.isFinite(v.duration) && !v.error)) {
      duration = Math.min(source.duration, edited.duration);
      timeline.max = duration;
      timeline.disabled = play.disabled = false;
      refreshTime();
    }
  }
  function pause() {
    clips.forEach(v => v.pause());
    play.textContent = 'Play';
  }
  demoPlayers.push({pause});
  clips.forEach(v => {
    v.addEventListener('loadedmetadata', prepare);
    v.addEventListener('ended', pause);
    v.addEventListener('error', () => {
      pause();
      play.disabled = timeline.disabled = true;
      status.textContent = 'The comparison could not load. Please reload the page.';
    });
  });
  play.addEventListener('click', async () => {
    if (!source.paused) return pause();
    demoPlayers.forEach(player => player.pause());
    if (clips.some(v => v.ended) || source.currentTime >= duration - .04) source.currentTime = 0;
    edited.currentTime = source.currentTime;
    try {
      await Promise.all(clips.map(v => v.play()));
      play.textContent = 'Pause';
    } catch (error) {
      pause();
      if (error.name !== 'AbortError') status.textContent = 'Playback could not start. Please try again.';
    }
  });
  timeline.addEventListener('input', () => {
    const seconds = Number(timeline.value);
    pause();
    clips.forEach(v => { v.currentTime = seconds; });
    refreshTime();
  });
  source.addEventListener('seeked', refreshTime);
  source.addEventListener('timeupdate', () => {
    if (!duration || source.seeking) return;
    if (!source.paused && source.currentTime >= duration - .02) pause();
    if (!source.paused && !edited.seeking && Math.abs(source.currentTime - edited.currentTime) > .09) edited.currentTime = source.currentTime;
    refreshTime();
  });
  prepare();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) demoPlayers.forEach(player => player.pause());
});

// Subtle pointer spotlight on cards and active-section nav highlight.
if (window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.contribution, .demo-example').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (event.clientX - rect.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (event.clientY - rect.top).toFixed(1) + 'px');
    });
  });
}

const navLinks = [...document.querySelectorAll('.topbar nav a[href^="#"]')];
if ('IntersectionObserver' in window && navLinks.length) {
  const sections = navLinks
    .map(link => ({link, target: document.querySelector(link.getAttribute('href'))}))
    .filter(({target}) => target);
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
    let best = null, bestRatio = 0;
    sections.forEach(item => {
      const ratio = visible.get(item.target) || 0;
      if (ratio > bestRatio) { bestRatio = ratio; best = item; }
    });
    if (best) {
      navLinks.forEach(link => link.classList.toggle('is-active', link === best.link));
    }
  }, {rootMargin: '-18% 0px -55% 0px', threshold: [0, 0.15, 0.35, 0.6]});
  sections.forEach(({target}) => observer.observe(target));
}
