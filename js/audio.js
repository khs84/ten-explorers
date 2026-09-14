/* 웹 오디오 API로 생성하는 배경음악/효과음. 외부 음원 파일 없이 동작합니다. */
(function () {
  "use strict";

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var STORAGE_KEY = "ten-explorers-music";
  var ctx = null;
  var musicGain = null;
  var musicNodes = null;
  var musicOn = false;

  function getCtx() {
    if (!AudioCtx) return null;
    if (!ctx) {
      try { ctx = new AudioCtx(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function loadPref() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { return false; }
  }
  function savePref(on) {
    try { localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); } catch (e) {}
  }

  // 밝은 배경음악: 한 옥타브 높은 장조 화음을 글로켄슈필처럼 반짝이는 아르페지오로 잔잔하게 반복합니다.
  function playMusicNote(freq, time, dur, peak) {
    var c = ctx;

    var o = c.createOscillator();
    var g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(musicGain);
    o.start(time);
    o.stop(time + dur + 0.05);

    // 한 옥타브 위 배음을 살짝 얹어 반짝이는 벨 느낌을 더합니다.
    var o2 = c.createOscillator();
    var g2 = c.createGain();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0.0001, time);
    g2.gain.linearRampToValueAtTime(peak * 0.4, time + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.55);
    o2.connect(g2);
    g2.connect(musicGain);
    o2.start(time);
    o2.stop(time + dur * 0.55 + 0.05);
  }

  function startMusic() {
    var c = getCtx();
    if (!c || musicNodes) return;

    musicGain = c.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(c.destination);

    // C5 - F5 - G5 - C5 밝고 높은 장조 진행, 각 화음을 위아래로 아르페지오
    var chords = [
      [523.25, 659.25, 783.99, 1046.50],
      [698.46, 880.00, 1046.50, 1396.91],
      [783.99, 987.77, 1174.66, 1567.98],
      [523.25, 659.25, 783.99, 1046.50]
    ];
    var pattern = [0, 1, 2, 3, 2, 1];
    var seq = [];
    chords.forEach(function (chord) {
      pattern.forEach(function (i) { seq.push(chord[i]); });
    });

    var noteInterval = 0.32;
    var step = 0;
    function scheduleNext() {
      playMusicNote(seq[step % seq.length], c.currentTime, 0.42, 0.06);
      step++;
    }
    scheduleNext();
    var timer = setInterval(scheduleNext, noteInterval * 1000);

    musicNodes = { timer: timer };
  }

  function stopMusic() {
    if (!musicNodes) return;
    clearInterval(musicNodes.timer);
    musicNodes = null;
  }

  function setMusicOn(on) {
    musicOn = !!on;
    savePref(musicOn);
    if (musicOn) startMusic(); else stopMusic();
  }

  // 손뼉 소리 하나: 백색소음을 짧게 감싸 "짝" 소리를 만듭니다.
  function playClap(time) {
    var c = ctx;
    var len = Math.max(1, Math.floor(c.sampleRate * 0.09));
    var buffer = c.createBuffer(1, len, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var decay = Math.pow(1 - i / len, 3);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    var noise = c.createBufferSource();
    noise.buffer = buffer;

    var band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500 + Math.random() * 900;
    band.Q.value = 1.1;

    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.55, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    noise.connect(band);
    band.connect(g);
    g.connect(c.destination);
    noise.start(time);
    noise.stop(time + 0.13);
  }

  function playClaps(count, now) {
    for (var i = 0; i < count; i++) {
      playClap(now + i * 0.15 + Math.random() * 0.03);
    }
  }

  // 짧은 반짝이는 음(전체 완주 축하용 추가 팡파르)
  function playSparkleNote(freq, time) {
    var c = ctx;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.22, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    o.connect(g);
    g.connect(c.destination);
    o.start(time);
    o.stop(time + 0.55);
  }

  // 미션 성공 시 손뼉 소리(짝짝짝), 전체 완주 시 더 많은 박수 + 반짝이는 팡파르
  function playChime(kind) {
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    if (kind === "final") {
      playClaps(6, now);
      [523.25, 659.25, 783.99, 1046.50].forEach(function (freq, i) {
        playSparkleNote(freq, now + 0.85 + i * 0.12);
      });
    } else {
      playClaps(3, now);
    }
  }

  // 자동재생 정책 대응: 첫 사용자 상호작용 시, 음악을 켜둔 적이 있다면 재생을 재개합니다.
  function armFirstInteraction() {
    var resumed = false;
    function tryResume() {
      if (resumed) return;
      resumed = true;
      if (loadPref()) {
        musicOn = true;
        startMusic();
      }
    }
    ["pointerdown", "keydown"].forEach(function (type) {
      document.addEventListener(type, tryResume, { once: true, passive: true });
    });
  }
  armFirstInteraction();

  window.TEN_EXPLORERS_AUDIO = {
    setMusicOn: setMusicOn,
    isMusicOn: function () { return musicOn; },
    loadPref: loadPref,
    playChime: playChime
  };
})();
