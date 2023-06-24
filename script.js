// Function to generate random colors
function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Function to create twinkling stars
function createStar() {
  var star = document.createElement('div');
  star.className = 'star';
  star.style.top = Math.random() * window.innerHeight + 'px';
  star.style.left = Math.random() * window.innerWidth + 'px';
  star.style.backgroundColor = getRandomColor();
  document.body.appendChild(star);
}

// Create stars at random intervals
setInterval(createStar, 2000);
