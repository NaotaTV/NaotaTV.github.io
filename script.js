// Function to generate random colors
function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Function to generate random blinking durations
function getRandomDuration() {
  return Math.random() * 3 + 1; // Random duration between 1 and 4 seconds
}

// Function to create twinkling stars
function createStar() {
  var star = document.createElement('div');
  star.className = 'star';
  star.style.top = Math.random() * window.innerHeight + 'px';
  star.style.left = Math.random() * window.innerWidth + 'px';
  star.style.backgroundColor = getRandomColor();
  star.style.animationDuration = getRandomDuration() + 's';
  document.body.appendChild(star);

  // Remove star after 5 seconds
  setTimeout(function() {
    star.remove();
  }, 5000);
}

// Create stars at random intervals
setInterval(createStar, 2000);
