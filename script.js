(function () {
  function randomPercent() {
    return Math.random() * 100;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createStars, { once: true });
  } else {
    createStars();
  }
}());
