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

  function avatarMarkup(person, className) {
    var label = person.displayName || person.username || "UNKNOWN SIGNAL";
    if (person.avatarUrl) {
      return '<span class="' + className + '"><img loading="lazy" src="' + escapeHtml(person.avatarUrl) + '" alt="' + escapeHtml(label) + ' Discord avatar"></span>';
    }

    return '<span class="' + className + '" aria-label="Unknown signal avatar">' + escapeHtml(getInitials(label)) + '</span>';
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
    var list = document.getElementById("radio-list");
    if (!player || !list) {
      return;
    }

    radioTracks = Array.isArray(data.tracks) ? data.tracks.slice(0, 20) : [];
    selectedRadioIndex = 0;
    player.classList.toggle("is-active", radioTracks.length > 0);

    if (!radioTracks.length) {
      list.innerHTML = '<li class="radio-empty">Lainbot radio has not received any single-song requests under 10 minutes yet.</li>';
      updateRadioDisplay();
      return;
    }

    list.innerHTML = radioTracks.map(function (track, index) {
      return '<li>' +
        '<button class="radio-track' + (index === 0 ? " is-selected" : "") + '" type="button" data-radio-index="' + index + '">' +
          '<span class="radio-track-index">' + String(index + 1).padStart(2, "0") + '</span>' +
          '<span>' +
            '<span class="radio-track-title">' + escapeHtml(track.title || "Untitled Signal") + '</span>' +
            '<span class="radio-track-artist">' + escapeHtml(track.artist || "Unknown Artist") + '</span>' +
          '</span>' +
          '<span class="radio-track-duration">' + formatDuration(track.durationMs) + '</span>' +
        '</button>' +
      '</li>';
    }).join("");
    updateRadioDisplay();
  }

  function updateRadioDisplay() {
    var title = document.getElementById("radio-title");
    var artist = document.getElementById("radio-artist");
    var duration = document.getElementById("radio-duration");
    var source = document.getElementById("radio-source");
    var open = document.getElementById("radio-open");
    var prev = document.getElementById("radio-prev");
    var next = document.getElementById("radio-next");
    var selected = radioTracks[selectedRadioIndex];

    document.querySelectorAll(".radio-track").forEach(function (button) {
      button.classList.toggle("is-selected", Number(button.getAttribute("data-radio-index")) === selectedRadioIndex);
    });

    if (!selected) {
      if (title) title.textContent = "Awaiting signal";
      if (artist) artist.textContent = "Lainbot radio feed offline";
      if (duration) duration.textContent = "00:00";
      if (source) source.textContent = "EARTH NODE";
      if (open) {
        open.setAttribute("aria-disabled", "true");
        open.removeAttribute("href");
      }
      if (prev) prev.setAttribute("disabled", "");
      if (next) next.setAttribute("disabled", "");
      return;
    }

    if (title) title.textContent = selected.title || "Untitled Signal";
    if (artist) artist.textContent = selected.artist || "Unknown Artist";
    if (duration) duration.textContent = formatDuration(selected.durationMs);
    if (source) source.textContent = (selected.sourceName || "Lainbot").toUpperCase();
    if (open) {
      if (selected.uri) {
        open.href = selected.uri;
        open.setAttribute("aria-disabled", "false");
      } else {
        open.setAttribute("aria-disabled", "true");
        open.removeAttribute("href");
      }
    }
    if (prev) prev.toggleAttribute("disabled", radioTracks.length < 2);
    if (next) next.toggleAttribute("disabled", radioTracks.length < 2);
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
    var list = document.getElementById("radio-list");
    var prev = document.getElementById("radio-prev");
    var next = document.getElementById("radio-next");

    if (list) {
      list.addEventListener("click", function (event) {
        var button = event.target.closest(".radio-track");
        if (!button) {
          return;
        }

        selectedRadioIndex = Number(button.getAttribute("data-radio-index")) || 0;
        updateRadioDisplay();
      });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        if (!radioTracks.length) return;
        selectedRadioIndex = (selectedRadioIndex - 1 + radioTracks.length) % radioTracks.length;
        updateRadioDisplay();
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        if (!radioTracks.length) return;
        selectedRadioIndex = (selectedRadioIndex + 1) % radioTracks.length;
        updateRadioDisplay();
      });
    }
  }

  function loadSocialStats() {
    fetchJson("/api/social/friends")
      .then(renderFriends)
      .catch(function () {
        renderFriends({ friends: fallbackFriends, honorable: fallbackHonorable });
      })
      .finally(setupRevealEffects);

    fetchJson("/api/social/word-counter")
      .then(renderCounter)
      .catch(function () {
        renderCounter({ total: null, entries: [] });
      });

    fetchJson("/api/social/radio")
      .then(renderRadio)
      .catch(function () {
        renderRadio({ tracks: [] });
      });
  }

  function init() {
    createStars();
    setupCounterRows();
    setupRadioControls();
    loadSocialStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
