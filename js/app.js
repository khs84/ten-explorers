(function () {
  "use strict";

  var DATA = window.TEN_EXPLORERS_DATA;
  var STATIONS = DATA.stations;
  var STORAGE_KEY = "ten-explorers-v2";
  var AUDIO = window.TEN_EXPLORERS_AUDIO;
  function playChime(kind) { if (AUDIO) AUDIO.playChime(kind); }

  var liveRegion = document.getElementById("liveRegion");
  function announce(msg) {
    if (!liveRegion) return;
    liveRegion.textContent = "";
    window.requestAnimationFrame(function () {
      liveRegion.textContent = msg;
    });
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function defaultState() {
    return { unlocked: 0, stamps: STATIONS.map(function () { return false; }), finished: false };
  }
  var state = defaultState();
  var stats = { attempts: 0, correct: 0, checkpoints: [] };

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function recordAttempt(ok) {
    stats.attempts++;
    if (ok) stats.correct++;
  }
  function recordCheckpoint(label, firstTry) {
    stats.checkpoints.push({ label: label, firstTry: !!firstTry });
  }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function koreanTeen(n) {
    var ones = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
    if (n === 10) return "열";
    if (n === 20) return "스물";
    if (n > 10 && n < 20) return "열" + ones[n - 10];
    return String(n);
  }
  function makeChoices(correct, min, max) {
    var pool = [];
    for (var d = 1; d <= 4; d++) {
      if (correct - d >= min) pool.push(correct - d);
      if (correct + d <= max) pool.push(correct + d);
    }
    shuffle(pool);
    return shuffle([correct, pool[0], pool[1]]);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function fireConfetti(count) {
    var colors = ["#E0A83B", "#5F9F63", "#8B5FBF", "#C0483C", "#2F7A5E"];
    for (var i = 0; i < count; i++) {
      (function () {
        var p = document.createElement("div");
        p.className = "confetti-piece";
        p.style.left = (Math.random() * window.innerWidth) + "px";
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        var rot = Math.floor(Math.random() * 360);
        p.style.transform = "rotate(" + rot + "deg)";
        document.body.appendChild(p);
        var duration = 1200 + Math.random() * 900;
        var drift = (Math.random() - 0.5) * 160;
        var anim = p.animate([
          { transform: "translateY(0) rotate(" + rot + "deg)", opacity: 1 },
          { transform: "translate(" + drift + "px," + (window.innerHeight * 0.8) + "px) rotate(" + (rot + 720) + "deg)", opacity: 0.9 }
        ], { duration: duration, easing: "ease-out" });
        anim.onfinish = function () { p.remove(); };
      })();
    }
  }

  function speakButton(text) {
    var btn = el("button", { type: "button", class: "speak-btn", "aria-label": "안내 읽어주기" }, []);
    btn.textContent = "🔊";
    btn.addEventListener("click", function () { speak(text); });
    return btn;
  }

  // ---------------- Station renderers ----------------

  function renderEgg(container, cfg, onComplete) {
    var loose = randInt(1, 9);
    var total = 10 + loose;

    var carton = el("div", { class: "carton", role: "img", "aria-label": "달걀판에 달걀 10개가 담겨 있어요." });
    carton.appendChild(el("div", { class: "carton-label", "aria-hidden": "true", text: "달걀판 (10개)" }));
    for (var i = 0; i < 10; i++) carton.appendChild(el("div", { class: "egg", "aria-hidden": "true" }));

    var looseTray = el("div", { class: "loose-tray", role: "img", "aria-label": "낱개 달걀 " + loose + "개" });
    for (var j = 0; j < loose; j++) {
      var e = el("div", { class: "egg", "aria-hidden": "true" });
      e.style.setProperty("--r", randInt(-15, 15) + "deg");
      looseTray.appendChild(e);
    }

    container.appendChild(el("div", { class: "egg-scene" }, [carton, looseTray]));
    container.appendChild(
      el("div", { class: "instruction-row" }, [
        el("p", { class: "instruction", text: cfg.instruction }),
        speakButton(cfg.instruction + " 달걀판 10개, 낱개 " + loose + "개.")
      ])
    );

    var choices = makeChoices(total, cfg.min, cfg.max);
    var choiceRow = el("ul", { class: "choices" });
    var feedback = el("div", { class: "feedback", role: "status" });
    var clicks = 0;

    choices.forEach(function (n) {
      var li = el("li", {});
      var btn = el("button", { class: "choice", type: "button", text: n + "개" });
      btn.addEventListener("click", function () {
        clicks++;
        var ok = n === total;
        recordAttempt(ok);
        if (ok) {
          btn.classList.add("correct");
          Array.prototype.forEach.call(choiceRow.querySelectorAll(".choice"), function (c) { c.disabled = true; });
          feedback.className = "feedback ok";
          var msg = "정답이에요! 열 개랑 " + loose + "개니까 " + koreanTeen(total) + "(" + total + ")이에요!";
          feedback.textContent = msg;
          announce(msg);
          recordCheckpoint("달걀판 세기", clicks === 1);
          onComplete();
        } else {
          btn.classList.add("wrong");
          btn.disabled = true;
          feedback.className = "feedback bad";
          var m2 = "다시 세어볼까요? 달걀판 10개에 남은 달걀 수를 더해봐요.";
          feedback.textContent = m2;
          announce(m2);
        }
      });
      li.appendChild(btn);
      choiceRow.appendChild(li);
    });

    container.appendChild(choiceRow);
    container.appendChild(feedback);
  }

  function renderLeaf(container, cfg, onComplete) {
    var total = randInt(cfg.min, cfg.max);
    var canopy = el("div", { class: "canopy", role: "group", "aria-label": "나뭇잎 " + total + "개" });
    var coloredCount = 0;
    var counterLine = el("div", { class: "leaf-counter", "aria-live": "polite", text: "색칠한 나뭇잎: 0개" });

    for (var i = 0; i < total; i++) {
      (function (index) {
        var leaf = el("button", {
          type: "button", class: "leaf", "aria-pressed": "false"
        }, [el("span", { class: "sr-only", text: "나뭇잎 " + (index + 1) })]);
        leaf.style.setProperty("--r", randInt(-20, 20) + "deg");
        leaf.addEventListener("click", function () {
          if (leaf.getAttribute("aria-pressed") === "true") return;
          leaf.setAttribute("aria-pressed", "true");
          coloredCount++;
          counterLine.textContent = "색칠한 나뭇잎: " + coloredCount + "개";
          if (coloredCount === total) {
            doneBtn.disabled = false;
            feedback.className = "feedback ok";
            var m = "나뭇잎을 모두 색칠했어요! '다 세었어요' 버튼을 눌러 확인해요.";
            feedback.textContent = m;
            announce(m);
          }
        });
        canopy.appendChild(leaf);
      })(i);
    }

    container.appendChild(el("div", { class: "tree-wrap" }, [
      el("div", { class: "tree" }, [canopy, el("div", { class: "trunk", "aria-hidden": "true" })])
    ]));
    container.appendChild(
      el("div", { class: "instruction-row" }, [
        el("p", { class: "instruction", text: cfg.instruction }),
        speakButton(cfg.instruction)
      ])
    );
    container.appendChild(counterLine);

    var feedback = el("div", { class: "feedback", role: "status" });
    var doneBtn = el("button", { class: "stage-btn primary", type: "button", text: "다 세었어요!", disabled: "true" });
    doneBtn.addEventListener("click", function () {
      var msg = "나무에는 나뭇잎이 모두 " + koreanTeen(total) + "(" + total + ")개 있어요!";
      feedback.className = "feedback ok";
      feedback.textContent = msg;
      announce(msg);
      doneBtn.disabled = true;
      recordAttempt(true);
      recordCheckpoint("나뭇잎 나무", true);
      onComplete();
    });
    container.appendChild(doneBtn);
    container.appendChild(feedback);
  }

  function renderCookie(container, cfg, onComplete) {
    var target = cfg.bundleSize || 10;
    var count = 0;
    var tray = el("div", { class: "tray", role: "group", "aria-label": "과자 쟁반, 10칸" });
    var slots = [];
    for (var i = 0; i < target; i++) {
      var slot = el("div", { class: "slot", "aria-hidden": "true" });
      slots.push(slot);
      tray.appendChild(slot);
    }
    var counter = el("span", { class: "tray-counter num", "aria-live": "polite", text: "담은 과자: 0 / " + target });
    var addBtn = el("button", { class: "stage-btn primary", type: "button", text: "쿠키 담기" });
    var removeBtn = el("button", { class: "stage-btn ghost", type: "button", text: "하나 빼기", disabled: "true" });
    var feedback = el("div", { class: "feedback", role: "status" });

    function refresh() {
      counter.textContent = "담은 과자: " + count + " / " + target;
      addBtn.disabled = count >= target;
      removeBtn.disabled = count <= 0;
    }
    addBtn.addEventListener("click", function () {
      if (count >= target) return;
      slots[count].appendChild(el("div", { class: "cookie", "aria-hidden": "true" }));
      count++;
      refresh();
      if (count === target) {
        var msg = "쟁반에 과자 " + target + "개를 정확히 담았어요!";
        feedback.className = "feedback ok";
        feedback.textContent = msg;
        announce(msg);
        recordAttempt(true);
        recordCheckpoint("과자 쟁반", true);
        onComplete();
      }
    });
    removeBtn.addEventListener("click", function () {
      if (count <= 0) return;
      count--;
      slots[count].innerHTML = "";
      refresh();
      feedback.textContent = "";
    });

    container.appendChild(
      el("div", { class: "instruction-row" }, [
        el("p", { class: "instruction", text: cfg.instruction }),
        speakButton(cfg.instruction)
      ])
    );
    container.appendChild(tray);
    container.appendChild(el("div", { class: "tray-controls" }, [addBtn, removeBtn, counter]));
    container.appendChild(feedback);
  }

  function renderStarRound(container, range, checkpointLabel, onSolved) {
    var total = randInt(range.min, range.max);
    var night = el("div", { class: "night", role: "group", "aria-label": "밤하늘, 별 " + total + "개" });
    var stars = [];
    for (var i = 0; i < total; i++) {
      (function (index) {
        var star = el("button", { type: "button", class: "star", "aria-pressed": "false" }, [
          el("span", { class: "sr-only", text: "별 " + (index + 1) })
        ]);
        stars.push(star);
        night.appendChild(star);
      })(i);
    }

    var selected = 0;
    var counter = el("span", { class: "night-counter num", "aria-live": "polite", text: "고른 별: 0 / 10" });
    var bundleBtn = el("button", { class: "stage-btn primary", type: "button", text: "10개씩 묶기", disabled: "true" });
    var feedback = el("div", { class: "feedback", role: "status" });
    var choiceRow = el("ul", { class: "choices" });
    var bundled = false;
    var clicks = 0;

    function toggle(star) {
      if (bundled) return;
      var pressed = star.getAttribute("aria-pressed") === "true";
      if (pressed) {
        star.setAttribute("aria-pressed", "false"); selected--;
      } else {
        if (selected >= 10) return;
        star.setAttribute("aria-pressed", "true"); selected++;
      }
      counter.textContent = "고른 별: " + selected + " / 10";
      bundleBtn.disabled = selected !== 10;
    }
    stars.forEach(function (star) {
      star.addEventListener("click", function () { toggle(star); });
    });

    bundleBtn.addEventListener("click", function () {
      bundled = true;
      bundleBtn.disabled = true;
      stars.forEach(function (s) {
        if (s.getAttribute("aria-pressed") === "true") s.classList.add("bundled");
        s.disabled = true;
      });
      var leftover = total - 10;
      var msg = "별 10개를 한 묶음으로 만들었어요! 남은 별은 " + leftover + "개예요.";
      feedback.className = "feedback ok";
      feedback.textContent = msg;
      announce(msg);

      var choices = makeChoices(total, 11, 20);
      choices.forEach(function (n) {
        var li = el("li", {});
        var btn = el("button", { class: "choice", type: "button", text: n + "개" });
        btn.addEventListener("click", function () {
          clicks++;
          var ok = n === total;
          recordAttempt(ok);
          if (ok) {
            btn.classList.add("correct");
            Array.prototype.forEach.call(choiceRow.querySelectorAll(".choice"), function (c) { c.disabled = true; });
            var m = "맞았어요! 별은 모두 " + koreanTeen(total) + "(" + total + ")개예요!";
            feedback.textContent = m;
            announce(m);
            recordCheckpoint(checkpointLabel, clicks === 1);
            onSolved();
          } else {
            btn.classList.add("wrong"); btn.disabled = true;
            feedback.className = "feedback bad";
            var m2 = "다시 생각해봐요. 열 개 묶음 더하기 남은 " + leftover + "개!";
            feedback.textContent = m2;
            announce(m2);
          }
        });
        li.appendChild(btn);
        choiceRow.appendChild(li);
      });
      var q = el("p", { class: "instruction", text: "별은 모두 몇 개일까요?" });
      container.appendChild(q);
      container.appendChild(choiceRow);
    });

    container.appendChild(night);
    container.appendChild(el("div", { class: "night-controls" }, [bundleBtn, counter]));
    container.appendChild(feedback);
  }

  function renderStar(container, cfg, onComplete) {
    container.appendChild(
      el("div", { class: "instruction-row" }, [
        el("p", { class: "instruction", text: cfg.instruction }),
        speakButton(cfg.instruction)
      ])
    );
    renderStarRound(container, { min: cfg.min, max: cfg.max }, "별 10개 묶기", onComplete);
  }

  function renderBoss(container, cfg, onComplete) {
    var wins = 0;
    var total = cfg.rounds.length;
    var monsterWrap = el("div", { class: "monster" }, [
      el("div", { class: "monster-body", "aria-hidden": "true" }),
      el("div", { class: "eye l", "aria-hidden": "true" }), el("div", { class: "eye r", "aria-hidden": "true" }),
      el("div", { class: "mouth", "aria-hidden": "true" })
    ]);
    var health = el("div", { class: "healthbar", "aria-hidden": "true" });
    for (var h = 0; h < total; h++) health.appendChild(el("div", { class: "health-seg full" }));

    container.appendChild(
      el("div", { class: "instruction-row" }, [
        el("p", { class: "instruction", text: cfg.instruction }),
        speakButton(cfg.instruction)
      ])
    );
    container.appendChild(el("div", { class: "boss-scene" }, [monsterWrap, health]));

    var roundHost = el("div", {});
    container.appendChild(roundHost);

    function playRound(roundIndex) {
      roundHost.innerHTML = "";
      var label = "점 몬스터 " + (roundIndex + 1) + "라운드";
      renderStarRound(roundHost, cfg.rounds[roundIndex], label, function () {
        monsterWrap.classList.add("hit");
        announce("몬스터에게 한 방 먹였어요!");
        setTimeout(function () { monsterWrap.classList.remove("hit"); }, 400);
        health.children[wins].classList.remove("full");
        wins++;
        fireConfetti(14);
        if (wins >= total) {
          monsterWrap.classList.add("defeated");
          setTimeout(function () {
            var msg = "몬스터를 물리쳤어요! 탐험 성공!";
            roundHost.appendChild(el("p", { class: "feedback ok", role: "status", text: msg }));
            announce(msg);
            onComplete();
          }, 300);
        } else {
          setTimeout(function () { playRound(roundIndex + 1); }, 600);
        }
      });
    }
    playRound(0);
  }

  var RENDERERS = { egg: renderEgg, leaf: renderLeaf, cookie: renderCookie, star: renderStar, boss: renderBoss };

  // ---------------- Layout / progress ----------------

  function renderStamps() {
    var host = document.getElementById("stamps");
    host.innerHTML = "";
    STATIONS.forEach(function (st, i) {
      var earned = state.stamps[i];
      var li = el("li", {
        class: "stampslot" + (earned ? " earned" : ""),
        "aria-label": st.title + (earned ? " 도장 획득함" : " 아직 획득하지 않음")
      });
      li.textContent = earned ? st.icon : "";
      li.setAttribute("aria-hidden", "false");
      host.appendChild(li);
    });
  }

  function statusFor(index) {
    if (state.stamps[index]) return "done";
    if (index <= state.unlocked) return "ready";
    return "locked";
  }

  function renderTrail() {
    var host = document.getElementById("trail");
    host.innerHTML = "";
    STATIONS.forEach(function (st, index) {
      var status = statusFor(index);
      var li = el("li", { class: "station" + (status === "locked" ? " locked" : "") + (status === "done" ? " done" : "") });
      li.appendChild(el("div", { class: "station-badge", "aria-hidden": "true", text: st.icon }));

      var statusText = status === "locked" ? "잠김" : (status === "done" ? "완료!" : "도전!");
      var pill = el("span", { class: "status-pill " + status, text: statusText });
      var headId = "head-" + st.id;
      var bodyId = "body-" + st.id;

      var head = el("button", {
        class: "card-head", type: "button", id: headId,
        "aria-expanded": "false", "aria-controls": bodyId,
        "aria-disabled": status === "locked" ? "true" : "false"
      }, [
        el("span", {}, [
          el("span", { class: "station-title", text: st.title }),
          el("span", { class: "sub", text: st.sub + (status === "locked" ? " (이전 미션을 먼저 완료해요)" : "") })
        ]),
        pill
      ]);
      var heading = el("h2", { class: "station-heading" }, [head]);
      var body = el("div", { class: "card-body", id: bodyId, role: "region", "aria-labelledby": headId, tabindex: "-1" });
      var card = el("div", { class: "card" }, [heading, body]);

      head.addEventListener("click", function () {
        if (status === "locked") {
          announce(st.title + "은(는) 아직 잠겨 있어요. 이전 미션을 먼저 완료해 주세요.");
          return;
        }
        var isOpen = body.classList.contains("open");
        Array.prototype.forEach.call(host.querySelectorAll(".card-body"), function (b) { b.classList.remove("open"); });
        Array.prototype.forEach.call(host.querySelectorAll(".card-head"), function (h) { h.setAttribute("aria-expanded", "false"); });
        if (!isOpen) {
          body.classList.add("open");
          head.setAttribute("aria-expanded", "true");
          body.innerHTML = "";
          RENDERERS[st.id](body, st, function () {
            if (!state.stamps[index]) {
              state.stamps[index] = true;
              if (state.unlocked < index + 1) state.unlocked = index + 1;
              saveLocal();
              renderStamps();
              fireConfetti(20);
              playChime("stage");
              setTimeout(function () {
                renderTrail();
                checkFinished();
                var next = STATIONS[index + 1];
                var nextHead = next ? document.getElementById("head-" + next.id) : null;
                if (nextHead) {
                  nextHead.focus();
                } else {
                  var copyBtn = document.querySelector("#celebrateSlot .stage-btn.primary");
                  if (copyBtn) copyBtn.focus();
                }
              }, 600);
            }
          });
          var speakBtn = body.querySelector(".speak-btn");
          if (speakBtn) speakBtn.click();
          body.focus();
        }
      });

      li.appendChild(card);
      host.appendChild(li);
    });
  }

  function checkFinished() {
    if (state.stamps.every(Boolean) && !state.finished) {
      state.finished = true;
      saveLocal();
      renderCelebrate();
      playChime("final");
      announce("탐험 성공! 결과를 확인해 보세요.");
    }
  }

  function buildSummaryText() {
    var firstTryCount = stats.checkpoints.filter(function (c) { return c.firstTry; }).length;
    var accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 100;
    var lines = [
      DATA.meta.title + " 결과 (" + DATA.meta.unitLabel + ")",
      "정답률: " + accuracy + "% (총 시도 " + stats.attempts + "회 중 정답 " + stats.correct + "회)",
      "첫 시도 정답: " + firstTryCount + " / " + stats.checkpoints.length + " 단계",
      "완료 스테이지: " + STATIONS.length + " / " + STATIONS.length
    ];
    return lines.join("\n");
  }

  function renderCelebrate() {
    var host = document.getElementById("celebrateSlot");
    host.innerHTML = "";
    if (!state.finished) return;

    var stampsWrap = el("ul", { class: "stamps" });
    STATIONS.forEach(function (st) {
      stampsWrap.appendChild(el("li", { class: "stampslot earned", "aria-hidden": "true", text: st.icon }));
    });

    var firstTryCount = stats.checkpoints.filter(function (c) { return c.firstTry; }).length;
    var accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 100;

    var scoreBox = el("div", { class: "score-box" }, [
      el("dl", {}, [
        el("dt", { text: "정답률" }), el("dd", { class: "num", text: accuracy + "%" }),
        el("dt", { text: "총 시도 / 정답" }), el("dd", { class: "num", text: stats.attempts + "회 / " + stats.correct + "회" }),
        el("dt", { text: "첫 시도 정답" }), el("dd", { class: "num", text: firstTryCount + " / " + stats.checkpoints.length + " 단계" })
      ])
    ]);

    var resultText = el("textarea", {
      class: "result-text", readonly: "true", "aria-label": "복사할 결과 텍스트"
    });
    resultText.value = buildSummaryText();

    var copyBtn = el("button", { class: "stage-btn primary", type: "button", text: "결과 복사하기" });
    var copyStatus = el("span", { class: "feedback", role: "status" });
    copyBtn.addEventListener("click", function () {
      var text = resultText.value;
      var done = function () {
        announce("결과를 클립보드에 복사했어요.");
        copyStatus.className = "feedback ok";
        copyStatus.textContent = "복사 완료!";
        setTimeout(function () { copyStatus.textContent = ""; }, 2500);
      };
      var fail = function () {
        announce("자동 복사에 실패했어요. 아래 결과 상자를 직접 선택해서 복사해 주세요.");
        copyStatus.className = "feedback bad";
        copyStatus.textContent = "자동 복사 실패 - 아래 상자를 직접 복사해 주세요.";
        resultText.focus();
        resultText.select();
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        try {
          resultText.focus();
          resultText.select();
          var ok = document.execCommand("copy");
          ok ? done() : fail();
        } catch (e) { fail(); }
      }
    });

    host.appendChild(el("div", { class: "celebrate" }, [
      el("h2", { text: "탐험 성공! 🎉" }),
      el("p", { text: DATA.meta.unitLabel + "을(를) 10개씩 묶어서 모두 세었어요. 정말 대단해요!" }),
      stampsWrap,
      scoreBox,
      resultText,
      el("div", { class: "copy-row" }, [copyBtn, copyStatus])
    ]));
  }

  function resetAll() {
    state = defaultState();
    stats = { attempts: 0, correct: 0, checkpoints: [] };
    saveLocal();
    document.getElementById("celebrateSlot").innerHTML = "";
    renderStamps();
    renderTrail();
    announce("탐험을 처음부터 다시 시작해요.");
  }

  document.getElementById("resetBtn").addEventListener("click", resetAll);

  function introText() {
    return DATA.meta.title + "에 오신 것을 환영해요. " +
      "달걀, 나뭇잎, 과자, 별을 열 개씩 묶으며 " + DATA.meta.unitLabel + "를 배우는 탐험이에요. " +
      "아래 미션 카드를 하나씩 눌러서 펼치고, 안내를 들은 다음 문제를 풀어 보세요. " +
      "미션을 완료할 때마다 도장을 모을 수 있어요.";
  }

  function setupHeroControls() {
    var introBtn = document.getElementById("introSpeakBtn");
    if (introBtn) {
      introBtn.addEventListener("click", function () { speak(introText()); });
    }
    var musicBtn = document.getElementById("musicToggleBtn");
    if (musicBtn && AUDIO) {
      var on = AUDIO.loadPref();
      musicBtn.setAttribute("aria-pressed", on ? "true" : "false");
      musicBtn.textContent = on ? "🎵 배경음악 끄기" : "🎵 배경음악";
      musicBtn.addEventListener("click", function () {
        var next = !AUDIO.isMusicOn();
        AUDIO.setMusicOn(next);
        musicBtn.setAttribute("aria-pressed", next ? "true" : "false");
        musicBtn.textContent = next ? "🎵 배경음악 끄기" : "🎵 배경음악";
      });
    }
  }

  function boot() {
    document.title = DATA.meta.title;
    document.getElementById("heroTitle").textContent = DATA.meta.title;
    document.getElementById("heroTagline").textContent = DATA.meta.tagline;
    document.getElementById("heroDesc").textContent =
      "달걀·나뭇잎·과자·별을 10개씩 묶으며 " + DATA.meta.unitLabel + "를 정복하는 탐험을 떠나요.";

    setupHeroControls();
    state = loadLocal() || defaultState();
    renderStamps();
    renderTrail();
    renderCelebrate();
  }

  boot();
})();
