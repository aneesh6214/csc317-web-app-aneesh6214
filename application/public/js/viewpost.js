const commentInput = document.getElementById('comment-input');
const commentForm = document.querySelector('.comment-form');
const postId = commentForm.getAttribute('action').split('/').pop(); // Extract the post ID from the form action URL

// Function to handle the form submission
function submitComment() {
    const commentText = commentInput.value.trim();

    // Validate the comment text
    if (!commentText) {
        alert('Please enter a comment.');
        return;
    }

    // Create a new XMLHttpRequest object
    const xhr = new XMLHttpRequest();

    // Set up the request
    xhr.open('POST', `/comment/${postId}`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Set up the onload and onerror event handlers
    xhr.onload = function () {
        if (xhr.status === 200) {
            // Comment posted successfully, handle the response if needed
            console.log('Comment posted successfully');
            location.reload();
        } else {
            // Handle the error if the comment couldn't be posted
            console.error('Error posting comment:', xhr.responseText);
        }
    };

    xhr.onerror = function () {
        // Handle the request error
        console.error('Error sending request');
    };

    // Send the request with the comment text in the request body
    xhr.send(JSON.stringify({ comment: commentText }));
}

// Attach the submitComment function to the form submit event
document.querySelector('.comment-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent the default form submission
    submitComment(); // Call the submitComment function
});


