(function () {
  var lainApiBase = "https://lainapi.naotacord.com";
  var fallbackFriends = [
    { id: "fran", username: "Fran", rank: 1, status: "CONNECTED" },
    { id: "mexicanganjalord", username: "mexicanganjalord", rank: 2, status: "SIGNAL LOCKED" },
    { id: "gtrmushroom", username: "gtrmushroom", rank: 3, status: "EARTH NODE ONLINE" },
    { id: "fixsatan6072", username: "fixsatan6072", rank: 4, status: "TRANSMISSION ACTIVE" },
    { id: "eclibes", username: "eclibes", rank: 5, status: "SIGNAL RECEIVED" }
  ];
  var fallbackHonorable = { id: "lovesilks", username: "lovesilks", rank: 6, status: "HONORABLE TRANSMISSION" };
  var radioTracks = [];
  var selectedRadioIndex = 0;
  var radioAudio = null;
  var radioPlaybackWanted = true;
  var radioUnlocked = false;
  var radioDefaultVolume = 0.3;
  var radioYouTubePlaying = false;
  var radioFrameTimer = null;
  var radioSyncTimer = null;
  var radioStationEpoch = Date.UTC(2026, 0, 1, 0, 0, 0);
  var radioFallbackDurationMs = 180000;
  var apiOffline = false;

  function randomPercent() {
    return Math.random() * 100;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function createStars() {
    var container = document.getElementById("stars-container");
    if (!container) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      container.replaceChildren();
      return;
    }

    var colors = ["red", "white", "green"];
    var stars = document.createDocumentFragment();

    for (var i = 0; i < 100; i += 1) {
      var star = document.createElement("span");
      star.className = "star";
      star.style.left = randomPercent() + "%";
      star.style.top = randomPercent() + "%";
      star.style.backgroundColor = randomItem(colors);
      star.style.animationDelay = Math.random() * 2 + "s";
      star.style.animationDuration = 0.8 + Math.random() * 1.4 + "s";
      stars.appendChild(star);
    }

    container.replaceChildren(stars);
  }

  function fetchJson(path) {
    return fetch(lainApiBase + path, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) {
        throw new Error("Lain API unavailable");
      }
      return response.json();
    });
  }

  function getInitials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("") || "?";
  }

  function hashString(value) {
    var hash = 0;
    var text = String(value || "naotacord");
    for (var i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function avatarMarkup(person, className) {
    var label = person.displayName || person.username || "UNKNOWN SIGNAL";
    if (person.avatarUrl) {
      return '<span class="' + className + '"><img loading="lazy" src="' + escapeHtml(person.avatarUrl) + '" alt="' + escapeHtml(label) + ' Discord avatar"></span>';
    }

    return '<span class="' + className + ' generated-avatar" style="--avatar-hue: ' + (hashString(person.id || label) % 360) + '" aria-label="' + escapeHtml(label) + ' generated profile picture"><span>' + escapeHtml(getInitials(label)) + '</span></span>';
  }

  function numberLabel(value) {
    if (typeof value !== "number") {
      return "";
    }

    return value.toLocaleString();
  }

  function renderFriends(data) {
    var grid = document.getElementById("friend-grid");
    var honorable = document.getElementById("honorable-transmission");
    if (!grid || !honorable) {
      return;
    }

    var friends = Array.isArray(data.friends) && data.friends.length ? data.friends : fallbackFriends;
    var honorablePerson = data.honorable || fallbackHonorable;

    grid.innerHTML = friends
      .slice()
      .sort(function (a, b) {
        return a.rank - b.rank;
      })
      .map(function (friend) {
        var score = typeof friend.score === "number" ? Math.max(0, Math.min(100, friend.score)) : null;
        var scoreMarkup = score === null ? "" : (
          '<div class="friend-meta">' +
            '<span class="detail-label">FRIENDSHIP SIGNAL</span>' +
            '<div class="signal-track" aria-label="Friendship signal ' + score + ' percent">' +
              '<div class="signal-fill" style="--signal-width: ' + score + '%"></div>' +
            '</div>' +
          '</div>'
        );
        var countMarkup = typeof friend.messageCount === "number" ? '<p class="stat-line">' + numberLabel(friend.messageCount) + ' transmissions</p>' : "";
        var interactionMarkup = typeof friend.interactionCount === "number" ? '<p class="stat-line">' + numberLabel(friend.interactionCount) + ' interactions</p>' : "";
        var name = friend.displayName || friend.username;
        var classes = "friend-card" + (friend.rank === 1 ? " primary" : "");

        return '<li class="' + classes + '">' +
          '<span class="rank-label">&#9733; #' + String(friend.rank).padStart(2, "0") + ' &#9733;</span>' +
          avatarMarkup(friend, "friend-avatar") +
          '<h2 class="friend-name">' + escapeHtml(name) + '</h2>' +
          '<span class="status-badge">' + escapeHtml(friend.status || "UNKNOWN SIGNAL") + '</span>' +
          scoreMarkup +
          countMarkup +
          interactionMarkup +
        '</li>';
      })
      .join("");

    honorable.innerHTML = '<h2>HONORABLE TRANSMISSION</h2><p>' + escapeHtml(honorablePerson.username) + '</p>';
  }

  function renderCounter(data) {
    var rows = document.getElementById("word-counter-rows");
    var empty = document.getElementById("word-counter-empty");
    var counter = document.getElementById("detected-counter");
    if (!rows || !empty || !counter) {
      return;
    }

    var entries = Array.isArray(data.entries) ? data.entries : [];
    var total = typeof data.total === "number" ? data.total : entries.reduce(function (sum, entry) {
      return sum + (typeof entry.count === "number" ? entry.count : 0);
    }, 0);

    renderDigitCounter(counter, entries.length ? total : null);
    empty.hidden = entries.length > 0;
    empty.textContent = apiOffline
      ? "Lain API tunnel is not connected yet. Fallback display is active."
      : "Lainbot counter feed is not connected yet. No live statistics are being shown.";
    rows.innerHTML = entries.map(function (entry, index) {
      var rank = entry.rank || index + 1;
      var details = buildCounterDetails(entry);

      return '<tr class="counter-row">' +
        '<td>' + String(rank).padStart(2, "0") + '</td>' +
        '<td><button class="row-toggle" type="button" aria-expanded="false">' +
          '<span class="leader-user">' +
            avatarMarkup(entry, "leader-avatar") +
            '<span>' + escapeHtml(entry.displayName || entry.username || "UNKNOWN SIGNAL") + '</span>' +
          '</span>' +
          details +
        '</button></td>' +
        '<td data-count="' + (entry.count || 0) + '">' + numberLabel(entry.count) + '</td>' +
      '</tr>';
    }).join("");
  }

  function buildCounterDetails(entry) {
    var details = [];
    if (typeof entry.percentage === "number") {
      details.push("Share of Total: " + entry.percentage.toFixed(2) + "%");
    }
    if (typeof entry.count === "number") {
      details.push("N-Word Count: " + numberLabel(entry.count));
    }

    return details.length ? '<span class="leader-details">' + details.map(escapeHtml).join(" | ") + '</span>' : "";
  }

  function renderDigitCounter(container, value) {
    var text = value === null ? "WAITING" : String(value).padStart(6, "0");
    container.innerHTML = text.split("").map(function (digit) {
      return '<span class="digit">' + escapeHtml(digit) + '</span>';
    }).join("");
  }

  function renderRadio(data) {
    var player = document.querySelector(".radio-player");
    var note = document.getElementById("radio-station-note");
    if (!player) {
      return;
    }

    radioTracks = normalizeRadioTracks(data.tracks);
    var position = getSyncedRadioPosition();
    selectedRadioIndex = position.index;
    player.classList.add("is-active");

    if (!radioTracks.length) {
      if (note) note.textContent = apiOffline
        ? "Lain API tunnel is offline. The player is ready and waiting for lainapi.naotacord.com."
        : "Lainbot radio has not received any single-song requests under 10 minutes yet.";
      stopRadioAudio();
      updateRadioDisplay();
      return;
    }

    if (note) note.textContent = "Live station locked to the last " + radioTracks.length + " Lainbot single-song request" + (radioTracks.length === 1 ? "." : "s.");
    updateRadioDisplay();
    scheduleRadioSync();
    autoplayRadioWhenReady();
  }

  function normalizeRadioTracks(tracks) {
    return (Array.isArray(tracks) ? tracks : [])
      .filter(function (track) {
        return track && (!track.durationMs || track.durationMs <= 10 * 60 * 1000);
      })
      .slice(0, 20)
      .map(function (track) {
        var duration = typeof track.durationMs === "number" && track.durationMs > 0
          ? Math.min(track.durationMs, 10 * 60 * 1000)
          : radioFallbackDurationMs;
        return Object.assign({}, track, { durationMs: duration });
      });
  }

  function getSyncedRadioPosition() {
    if (!radioTracks.length) {
      return { index: 0, offsetMs: 0, cycleMs: 0 };
    }

    var cycleMs = radioTracks.reduce(function (sum, track) {
      return sum + track.durationMs;
    }, 0);
    var elapsed = ((Date.now() - radioStationEpoch) % cycleMs + cycleMs) % cycleMs;

    for (var index = 0; index < radioTracks.length; index += 1) {
      var duration = radioTracks[index].durationMs;
      if (elapsed < duration) {
        return { index: index, offsetMs: elapsed, cycleMs: cycleMs };
      }
      elapsed -= duration;
    }

    return { index: 0, offsetMs: 0, cycleMs: cycleMs };
  }

  function syncRadioToStationClock() {
    if (!radioTracks.length) {
      updateRadioDisplay();
      return { indexChanged: false, offsetMs: 0 };
    }

    var previousIndex = selectedRadioIndex;
    var position = getSyncedRadioPosition();
    selectedRadioIndex = position.index;
    updateRadioDisplay(position.offsetMs);
    return { indexChanged: previousIndex !== selectedRadioIndex, offsetMs: position.offsetMs };
  }

  function scheduleRadioSync() {
    if (radioSyncTimer) {
      window.clearInterval(radioSyncTimer);
    }

    radioSyncTimer = window.setInterval(function () {
      var sync = syncRadioToStationClock();
      if ((radioPlaybackWanted || radioUnlocked) && sync.indexChanged) {
        playSelectedRadioTrack(sync.offsetMs);
      }
    }, 1000);
  }

  function updateRadioDisplay() {
    var title = document.getElementById("radio-title");
    var artist = document.getElementById("radio-artist");
    var duration = document.getElementById("radio-duration");
    var source = document.getElementById("radio-source");
    var open = document.getElementById("radio-open");
    var play = document.getElementById("radio-play-toggle");
    var live = document.getElementById("radio-live");
    var selected = radioTracks[selectedRadioIndex];
    var playableUrl = selected ? getPlayableRadioUrl(selected) : "";
    var youtubeId = selected ? getYouTubeVideoId(selected.uri) : "";
    var offsetMs = typeof arguments[0] === "number" ? arguments[0] : getSyncedRadioPosition().offsetMs;

    if (!selected) {
      if (title) title.textContent = "Awaiting signal";
      if (artist) artist.textContent = "Lainbot radio feed offline";
      if (duration) duration.textContent = "00:00";
      if (source) source.textContent = "SHARED STATION";
      if (open) {
        open.setAttribute("aria-disabled", "true");
        open.removeAttribute("href");
      }
      if (play) {
        play.textContent = "WAIT";
        play.setAttribute("disabled", "");
      }
      if (live) live.setAttribute("disabled", "");
      return;
    }

    if (title) title.textContent = selected.title || "Untitled Signal";
    if (artist) artist.textContent = selected.artist || "Unknown Artist";
    if (duration) duration.textContent = formatDuration(offsetMs) + " / " + formatDuration(selected.durationMs);
    if (source) source.textContent = "LIVE · " + (selected.sourceName || "LAINBOT").toUpperCase();
    if (play) {
      play.removeAttribute("disabled");
      play.textContent = (radioAudio && !radioAudio.paused) || radioYouTubePlaying ? "PAUSE" : (playableUrl || youtubeId ? "PLAY" : "OPEN");
    }
    if (open) {
      if (selected.uri) {
        open.href = selected.uri;
        open.setAttribute("aria-disabled", "false");
      } else {
        open.setAttribute("aria-disabled", "true");
        open.removeAttribute("href");
      }
    }
    if (live) live.removeAttribute("disabled");
  }

  function getPlayableRadioUrl(track) {
    var candidates = [
      track && track.audioUrl,
      track && track.streamUrl,
      track && track.previewUrl,
      track && track.uri
    ].filter(Boolean);

    for (var i = 0; i < candidates.length; i += 1) {
      if (/\.(mp3|m4a|ogg|opus|wav)(\?|#|$)/i.test(candidates[i]) || /^blob:|^data:audio\//i.test(candidates[i])) {
        return candidates[i];
      }
    }

    return "";
  }

  function getYouTubeVideoId(uri) {
    if (!uri) {
      return "";
    }

    try {
      var url = new URL(uri);
      if (url.hostname === "youtu.be") {
        return url.pathname.slice(1);
      }
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") {
          return url.searchParams.get("v") || "";
        }
        if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
          return url.pathname.split("/")[2] || "";
        }
      }
    } catch (err) {
      return "";
    }

    return "";
  }

  function ensureRadioAudio() {
    if (radioAudio) {
      return radioAudio;
    }

    radioAudio = document.getElementById("radio-audio") || document.createElement("audio");
    radioAudio.volume = radioDefaultVolume;
    radioAudio.loop = false;
    radioAudio.addEventListener("play", function () {
      radioUnlocked = true;
      updateRadioDisplay();
    });
    radioAudio.addEventListener("pause", updateRadioDisplay);
    radioAudio.addEventListener("ended", function () {
      if (radioPlaybackWanted) playSelectedRadioTrack();
    });
    radioAudio.addEventListener("error", function () {
      setRadioStatus("Signal source cannot stream in-browser. OPEN still works.");
      updateRadioDisplay();
    });
    return radioAudio;
  }

  function setRadioStatus(message) {
    var artist = document.getElementById("radio-artist");
    if (artist && message) {
      artist.textContent = message;
    }
  }

  function stopRadioAudio() {
    if (!radioAudio) {
      return;
    }
    radioAudio.pause();
    radioAudio.removeAttribute("src");
    radioAudio.load();
  }

  function stopYouTubeFrame() {
    if (radioFrameTimer) {
      window.clearTimeout(radioFrameTimer);
      radioFrameTimer = null;
    }

    var frame = document.getElementById("radio-youtube-frame");
    if (frame) {
      frame.removeAttribute("src");
    }
    radioYouTubePlaying = false;
  }

  function playYouTubeTrack(track, offsetMs) {
    var videoId = getYouTubeVideoId(track && track.uri);
    var frame = document.getElementById("radio-youtube-frame");
    if (!videoId || !frame) {
      return false;
    }

    stopRadioAudio();
    if (radioFrameTimer) {
      window.clearTimeout(radioFrameTimer);
    }

    var startSeconds = Math.max(0, Math.floor((offsetMs || 0) / 1000));
    frame.src = "https://www.youtube.com/embed/" + encodeURIComponent(videoId) +
      "?autoplay=1&start=" + encodeURIComponent(startSeconds) +
      "&controls=0&playsinline=1&rel=0&enablejsapi=1&origin=" + encodeURIComponent(window.location.origin);
    radioYouTubePlaying = true;
    radioUnlocked = true;
    setRadioStatus((track.artist || "YouTube") + " — streaming through radio shell");

    window.setTimeout(function () {
      sendYouTubeCommand("setVolume", [Math.round(radioDefaultVolume * 100)]);
      sendYouTubeCommand("playVideo", []);
    }, 900);

    if (typeof track.durationMs === "number" && track.durationMs > 0) {
      radioFrameTimer = window.setTimeout(function () {
        if (radioPlaybackWanted) playSelectedRadioTrack();
      }, Math.max(1200, track.durationMs - (offsetMs || 0) + 900));
    }

    updateRadioDisplay();
    return true;
  }

  function sendYouTubeCommand(func, args) {
    var frame = document.getElementById("radio-youtube-frame");
    if (!frame || !frame.contentWindow) {
      return;
    }

    frame.contentWindow.postMessage(JSON.stringify({
      event: "command",
      func: func,
      args: args
    }), "https://www.youtube.com");
  }

  function playSelectedRadioTrack(offsetMs) {
    var sync = syncRadioToStationClock();
    var selected = radioTracks[selectedRadioIndex];
    var liveOffsetMs = typeof offsetMs === "number" ? offsetMs : sync.offsetMs;
    var playableUrl = getPlayableRadioUrl(selected);
    var audio = ensureRadioAudio();

    radioPlaybackWanted = true;

    if (!selected) {
      updateRadioDisplay();
      return;
    }

    if (!playableUrl) {
      if (playYouTubeTrack(selected, liveOffsetMs)) {
        return;
      }
      setRadioStatus("This source cannot stream in-browser. OPEN still works.");
      updateRadioDisplay();
      return;
    }

    stopYouTubeFrame();
    if (audio.src !== playableUrl) {
      audio.src = playableUrl;
    }
    audio.volume = radioDefaultVolume;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(audio.duration - 0.35, Math.max(0, liveOffsetMs / 1000));
    } else {
      audio.addEventListener("loadedmetadata", function seekLive() {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = Math.min(audio.duration - 0.35, Math.max(0, liveOffsetMs / 1000));
        }
      }, { once: true });
    }

    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(function () {
          radioUnlocked = true;
          updateRadioDisplay();
        })
        .catch(function () {
          setRadioStatus("Tap PLAY once to unlock radio autoplay.");
          updateRadioDisplay();
        });
    }
  }

  function pauseRadio() {
    radioPlaybackWanted = false;
    if (radioAudio) {
      radioAudio.pause();
    }
    stopYouTubeFrame();
    updateRadioDisplay();
  }

  function autoplayRadioWhenReady() {
    window.setTimeout(function () {
      if (radioPlaybackWanted && radioTracks.length) {
        playSelectedRadioTrack();
      }
    }, 350);
  }

  function formatDuration(durationMs) {
    if (typeof durationMs !== "number" || durationMs <= 0) {
      return "00:00";
    }

    var totalSeconds = Math.round(durationMs / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function setupRevealEffects() {
    var targets = Array.prototype.slice.call(document.querySelectorAll(".reveal, .friend-card"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (target) {
        target.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  function setupCounterRows() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest(".row-toggle");
      if (!button) {
        return;
      }

      var row = button.closest(".counter-row");
      var isOpen = row.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function setupRadioControls() {
    var live = document.getElementById("radio-live");
    var play = document.getElementById("radio-play-toggle");
    var volume = document.getElementById("radio-volume");
    var volumeLabel = document.getElementById("radio-volume-label");

    ensureRadioAudio();

    if (play) {
      play.addEventListener("click", function () {
        var selected = radioTracks[selectedRadioIndex];
        var playableUrl = getPlayableRadioUrl(selected);
        var youtubeId = getYouTubeVideoId(selected && selected.uri);
        if (!playableUrl && !youtubeId && selected && selected.uri) {
          window.open(selected.uri, "_blank", "noopener,noreferrer");
          return;
        }

        if ((radioAudio && !radioAudio.paused) || radioYouTubePlaying) {
          pauseRadio();
        } else {
          playSelectedRadioTrack();
        }
      });
    }

    if (volume) {
      volume.value = String(Math.round(radioDefaultVolume * 100));
      volume.addEventListener("input", function () {
        radioDefaultVolume = Math.max(0, Math.min(1, Number(volume.value) / 100));
        if (radioAudio) {
          radioAudio.volume = radioDefaultVolume;
        }
        sendYouTubeCommand("setVolume", [Math.round(radioDefaultVolume * 100)]);
        if (volumeLabel) {
          volumeLabel.textContent = "VOL " + Math.round(radioDefaultVolume * 100) + "%";
        }
      });
    }

    if (live) {
      live.addEventListener("click", function () {
        if (!radioTracks.length) return;
        playSelectedRadioTrack();
      });
    }
  }

  function startRadioVisualizer() {
    var canvas = document.getElementById("radio-visualizer");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    var context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    function draw(time) {
      var width = canvas.width;
      var height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.strokeStyle = "rgba(51, 255, 204, 0.72)";
      context.shadowColor = "rgba(51, 255, 204, 0.65)";
      context.shadowBlur = 8;

      var centerY = height * 0.48;
      var points = 18;
      for (var row = 0; row < 6; row += 1) {
        context.beginPath();
        for (var i = 0; i <= points; i += 1) {
          var x = (i / points) * width;
          var wave = Math.sin(i * 0.9 + time * 0.003 + row * 0.72);
          var depth = Math.cos(i * 0.42 + time * 0.0016);
          var y = centerY + wave * (10 + row * 4) + (row - 2.5) * 13 + depth * 8;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255, 204, 102, 0.44)";
      for (var col = 0; col <= 8; col += 1) {
        var xLine = (col / 8) * width;
        context.beginPath();
        context.moveTo(xLine, 12);
        context.lineTo(width / 2 + (xLine - width / 2) * 0.2, height - 12);
        context.stroke();
      }

      window.requestAnimationFrame(draw);
    }

    window.requestAnimationFrame(draw);
  }

  function loadSocialStats() {
    fetchJson("/api/social/friends")
      .then(renderFriends)
      .catch(function () {
        apiOffline = true;
        renderFriends({ friends: fallbackFriends, honorable: fallbackHonorable });
      })
      .finally(setupRevealEffects);

    fetchJson("/api/social/word-counter")
      .then(renderCounter)
      .catch(function () {
        apiOffline = true;
        renderCounter({ total: null, entries: [] });
      });

    fetchJson("/api/social/radio")
      .then(renderRadio)
      .catch(function () {
        apiOffline = true;
        renderRadio({ tracks: [] });
      });
  }

  function init() {
    createStars();
    setupCounterRows();
    setupRadioControls();
    startRadioVisualizer();
    loadSocialStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
