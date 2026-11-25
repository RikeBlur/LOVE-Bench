/* Contribution visuals use the supplied metadata and frame annotations. */
(() => {
  'use strict';
  const data = window.LOVE_BENCH_DATA;
  const chart = document.querySelector('#dataset-chart');
  const insight = document.querySelector('#dataset-insight');
  const labels = {animal:'Animals', clothing:'Clothing', handheld_object:'Handheld objects', food:'Food', furniture:'Furniture', others:'Others', vehicle:'Vehicles', toy:'Toys', human:'Humans', tool:'Tools'};
  function renderChart(kind) {
    const items = kind === 'durations' ? data.durations.map(d => [d.label, d.count]) : Object.entries(data[kind]);
    const total = kind === 'tasks' ? data.instructions : data.videos;
    const max = Math.max(...items.map(([,n]) => n));
    chart.replaceChildren();
    const caption = document.createElement('p');
    caption.className = 'chart-title';
    caption.textContent = kind === 'tasks' ? 'Editing instructions · 1,020 total' : 'Unique source videos · 650 total';
    chart.append(caption);
    const bars = document.createElement('div');
    if (kind === 'categories') bars.className = 'category-bars';
    items.forEach(([label, n]) => {
      const row = document.createElement('div'); row.className = 'bar-row';
      const name = labels[label] || label;
      row.title = `${name}: ${n} (${(100*n/total).toFixed(1)}%)`;
      const caption = document.createElement('div'); caption.className = 'bar-caption';
      const title = document.createElement('span'); title.textContent = name;
      const count = document.createElement('b'); count.textContent = n;
      caption.append(title,count);
      const track = document.createElement('div'); track.className = 'bar-track'; track.setAttribute('aria-hidden','true');
      const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = (100*n/max) + '%';
      track.append(fill); row.append(caption,track); bars.append(row);
    });
    chart.append(bars);
    const insights = {
      durations:'<strong>30–127.08 seconds.</strong> Every source video is at least 30 seconds long, with a 37.47-second median.',
      tasks:'<strong>Four editing tasks.</strong> Substitution, attribute change, removal and addition; 220 instructions include a reference image.',
      categories:'<strong>10 object categories.</strong> From animals and people to handheld objects, across real-world source footage.'
    };
    insight.innerHTML = insights[kind];
    document.querySelectorAll('[data-chart]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.chart === kind)));
  }
  document.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', () => renderChart(b.dataset.chart)));
  renderChart('durations');

  const sample = data.sample;
  const video = document.querySelector('#annotation-video');
  const play = document.querySelector('#annotation-play');
  const seek = document.querySelector('#annotation-seek');
  const state = document.querySelector('#annotation-state');
  const status = document.querySelector('#annotation-status');
  const times = document.querySelector('#annotation-time');
  seek.max = sample.frames - 1;
  const timeString = n => `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  const visibilityNames = {full:'Fully visible', partial:'Partially visible', invisible:'Not visible'};
  for (const range of sample.visibility) {
    const segment = document.createElement('span');
    segment.className = 'visibility-segment';
    segment.dataset.label = range.label;
    segment.style.width = `${100*(range.end-range.start+1)/sample.frames}%`;
    segment.title = `${visibilityNames[range.label]} · frames ${range.start}–${range.end}`;
    document.querySelector('#visibility-segments').append(segment);
  }
  // The video already contains the original frame's mask and bbox.
  // Only the playhead and visibility label are updated in the browser.
  function refresh(seconds = video.currentTime) {
    const frame = Math.min(sample.frames-1, Math.max(0, Math.floor(seconds*sample.fps + 1e-4)));
    seek.value = frame;
    seek.setAttribute('aria-valuetext', `Frame ${frame} of ${sample.frames-1}, ${seconds.toFixed(2)} seconds`);
    times.textContent = `${timeString(seconds)} / ${timeString(sample.duration)}`;
    document.querySelector('#annotation-frame').textContent = `Frame ${frame}`;
    const range = sample.visibility.find(r => frame >= r.start && frame <= r.end);
    state.textContent = range ? visibilityNames[range.label] : 'Unlabeled';
    state.dataset.visibility = range?.label || 'unlabeled';
  }
  function ready() {
    if (!video.error && Number.isFinite(video.duration)) {
      play.disabled = seek.disabled = false;
      refresh();
    }
  }
  video.addEventListener('loadedmetadata', ready);
  video.addEventListener('seeked', () => refresh());
  video.addEventListener('timeupdate', () => { if (!video.seeking) refresh(); });
  video.addEventListener('play', () => { play.textContent = 'Pause'; });
  video.addEventListener('pause', () => { play.textContent = 'Play'; });
  video.addEventListener('ended', () => { play.textContent = 'Play'; refresh(); });
  video.addEventListener('error', () => {
    play.disabled = seek.disabled = true;
    status.textContent = 'The annotation video could not load. Please reload the page.';
  });
  play.addEventListener('click', async () => {
    if (!video.paused) return video.pause();
    if (video.ended || video.currentTime >= sample.duration - 1/sample.fps) video.currentTime = 0;
    try { await video.play(); }
    catch(error) {
      if (error.name !== 'AbortError') status.textContent = 'Playback could not start. Please try again.';
    }
  });
  seek.addEventListener('input', () => {
    const seconds = Number(seek.value)/sample.fps;
    video.pause();
    video.currentTime = seconds;
    refresh(seconds);
  });
  if ('requestVideoFrameCallback' in video) {
    const onFrame = (_now, metadata) => {
      if (!video.seeking) refresh(metadata.mediaTime);
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  ready();
})();
