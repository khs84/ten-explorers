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

  // 밝은 배경음악: 장조 화음을 뮤직박스처럼 통통 튀는 아르페지오로 잔잔하게 반복합니다.
  function playMusicNote(freq, time, dur, peak) {
    var c = ctx;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(musicGain);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  function startMusic() {
    var c = getCtx();
    if (!c || musicNodes) return;

    musicGain = c.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(c.destination);

    // C - F - G - C 밝은 장조 진행, 각 화음을 위아래로 아르페지오
    var chords = [
      [261.63, 329.63, 392.00, 523.25],
      [349.23, 440.00, 523.25, 698.46],
      [392.00, 493.88, 587.33, 783.99],
      [261.63, 329.63, 392.00, 523.25]
    ];
    var pattern = [0, 1, 2, 3, 2, 1];
    var seq = [];
    chords.forEach(function (chord) {
      pattern.forEach(function (i) { seq.push(chord[i]); });
    });

    var noteInterval = 0.4;
    var step = 0;
    function scheduleNext() {
      playMusicNote(seq[step % seq.length], c.currentTime, 0.5, 0.08);
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

  // 미션 성공 효과음(짧은 아르페지오)과 전체 완주 효과음(더 화려한 팡파르)
  function playChime(kind) {
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    var notes = kind === "final"
      ? [523.25, 659.25, 783.99, 1046.50]
      : [523.25, 659.25, 783.99];
    notes.forEach(function (freq, i) {
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      var start = now + i * 0.12;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.25, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      o.connect(g);
      g.connect(c.destination);
      o.start(start);
      o.stop(start + 0.6);
    });
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
