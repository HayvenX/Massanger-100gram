const form = document.getElementById('form')
const signInAccountButton = document.getElementById('formBtn')

async function sendData() {
    const response = await fetch('http://localhost:3000/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username: form["username"].value, password: form["password"].value})
    })

    const data = await response.text()
    console.log(data)
    document.cookie = `token=${data}`
    window.location.assign('/')
}

signInAccountButton.addEventListener('click', async function() {
    sendData()
})