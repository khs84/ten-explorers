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

  // 잔잔한 배경음악: 저음량 사인파 3화음이 천천히 코드를 바꿔가며 루프됩니다.
  function startMusic() {
    var c = getCtx();
    if (!c || musicNodes) return;

    musicGain = c.createGain();
    musicGain.gain.setValueAtTime(0, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.05, c.currentTime + 2);
    musicGain.connect(c.destination);

    var chords = [
      [261.63, 329.63, 392.00],
      [293.66, 349.23, 440.00],
      [246.94, 293.66, 392.00],
      [261.63, 329.63, 392.00]
    ];

    var oscs = chords[0].map(function (freq) {
      var o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      var g = c.createGain();
      g.gain.value = 0.3;
      o.connect(g);
      g.connect(musicGain);
      o.start();
      return { osc: o, gain: g };
    });

    var chordIndex = 0;
    var timer = setInterval(function () {
      chordIndex = (chordIndex + 1) % chords.length;
      var freqs = chords[chordIndex];
      oscs.forEach(function (pair, i) {
        pair.osc.frequency.linearRampToValueAtTime(freqs[i], c.currentTime + 3.5);
      });
    }, 7000);

    musicNodes = { oscs: oscs, timer: timer };
  }

  function stopMusic() {
    if (!musicNodes) return;
    var c = ctx;
    if (musicGain && c) {
      musicGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    }
    var nodes = musicNodes;
    musicNodes = null;
    clearInterval(nodes.timer);
    setTimeout(function () {
      nodes.oscs.forEach(function (pair) {
        try { pair.osc.stop(); } catch (e) {}
      });
    }, 700);
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
