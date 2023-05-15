function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();

    window.location.href = `/search?term=${encodeURIComponent(searchTerm)}`;
}

const searchForm = document.getElementById('search-form');
searchForm.addEventListener('submit', handleSearch());
