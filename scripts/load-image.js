const urlParams = new URLSearchParams(window.location.search);
const imageUrl = urlParams.get("url");

// set image src
const img = document.querySelector("img");
img.src = imageUrl;
