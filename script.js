function createStars() {
  const container = document.getElementById("stars-container");
  const numStars = 50; // Number of stars to create

  for (let i = 0; i < numStars; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = `${getRandomPosition()}px`;
    star.style.top = `${getRandomPosition()}px`;
    star.style.animationDelay = `${getRandomDelay()}s`;
    container.appendChild(star);
  }

  setTimeout(() => {
    container.innerHTML = ""; // Clear the stars after 3 seconds
  }, 3000);
}

function getRandomPosition() {
  const min = 0;
  const max = 500; // Adjust the maximum value based on your container size
  return Math.random() * (max - min) + min;
}

function getRandomDelay() {
  const min = 0;
  const max = 2; // Adjust the maximum delay value as needed
  return Math.random() * (max - min) + min;
}

createStars();
