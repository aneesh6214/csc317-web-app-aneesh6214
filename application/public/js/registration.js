//var { displayFlashMessage } = require('./routes/users');
//initial load
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (validateForm()) {
            form.submit();
        }
    });
});

function validateForm() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!validateUsername(username)) {
        //alert("Invalid Username");
        displayFlashMessage('error', 'Invalid Username: ');
        return false;
    }

    if (!validateEmail(email)) {
        //alert("Invalid Email");
        displayFlashMessage('error', 'Invalid Email: ');
        return false;
    }

    if (!validatePassword(password)) {
        //alert("Password Not Complex Enough");
        displayFlashMessage('error', 'Invalid Password: ');
        return false;
    }

    if (password !== confirmPassword) {
        //alert("Passwords do not match");
        displayFlashMessage('error', 'Passwords Do Not Match');
        return false;
    }

    return true;
}

//HELPER FUNCTIONS
function validateUsername(username) {
    const usernamePattern = /^[a-zA-Z][a-zA-Z0-9]{2,}$/;
    return usernamePattern.test(username);
}

function validateEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
}

function validatePassword(password) {
    //regex checks: (uppercase)(on or more digits)(one special character)(at least 8 valid characters)
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[-+/*!@#$^&~\[\]])[a-zA-Z0-9-+/*!@#$^&~\[\]]{8,}$/;
    return passwordPattern.test(password);
}
