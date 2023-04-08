document.getElementById('fetchPhotosBtn').addEventListener('click', fetchPhotos);

function fetchPhotos() {
    fetch('https://jsonplaceholder.typicode.com/albums/2/photos')
        .then(response => response.json())
        .then(photos => {
            displayPhotos(photos);
        });
}

function displayPhotos(photos) {
    const photoContainer = document.getElementById('photoContainer');
    photoContainer.innerHTML = '';
    photos.forEach(photo => {
        const photoCard = document.createElement('div');
        photoCard.classList.add('photo-card');
        photoCard.innerHTML = `
          <img src="${photo.url}" alt="${photo.title}">
          <p>${photo.title}</p>
        `;
        photoCard.addEventListener('click', () => {
            photoCard.style.opacity = '0';
            setTimeout(() => {
                photoCard.remove();
                updatePhotoCount();
            }, 500);
        });
        photoContainer.appendChild(photoCard);
    });
    updatePhotoCount();
}

function updatePhotoCount() {
    const photoCount = document.getElementById('photoCount');
    const currentCount = document.querySelectorAll('.photo-card').length;
    photoCount.innerText = `Number of Photos: ${currentCount}`;
}