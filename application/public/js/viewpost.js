const commentInput = document.getElementById('comment-input');
const commentForm = document.querySelector('.comment-form');
const postId = commentForm.getAttribute('action').split('/').pop();

function submitComment() {
    const commentText = commentInput.value.trim();

    //validate comment text
    if (!commentText) {
        alert('Please enter a comment.');
        return;
    }

    const xhr = new XMLHttpRequest();

    //set up post request
    xhr.open('POST', `/comment/${postId}`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    //set up onload & event handlers
    xhr.onload = function () {
        if (xhr.status === 200) {
            //COMMENT POSTED SUCCESSFULLY
            location.reload();
        } else {
            console.error('Error posting comment:', xhr.responseText);
        }
    };

    xhr.onerror = function () {
        console.error('Error sending request');
    };

    //s the request with the comment text in req.body
    xhr.send(JSON.stringify({ comment: commentText }));
}

//attach submitComment function to the form submit event
document.querySelector('.comment-form').addEventListener('submit', function (e) {
    e.preventDefault();
    submitComment();
});


