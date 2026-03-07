const form = document.getElementById('form')
const createAccountButton = document.getElementById('formBtn')

async function sendData() {
    const response = await fetch('http://localhost:3000/sign_up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username: form["username"].value, email: form["email"].value, password: form["password"].value, star_balance: 0})
    })

    if(form["password"].value === form["passwordCheck"].value) {
        form["passwordCheck"].removeAttribute('class')
        const data = await response.text()
        console.log(data)
    }
    else {
        form["passwordCheck"].setAttribute('class', 'invalidPassword')
    }
}

createAccountButton.addEventListener('click', async function() {
    sendData()
})