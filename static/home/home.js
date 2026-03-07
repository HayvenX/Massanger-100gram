const socket = io()

const container = document.getElementById('messageContainer')
const chatList = document.querySelector('.chat-list')

let selectedId = ""

chatList.addEventListener("click", (e) => {
    const clickedItem = e.target.closest('.chat-item')
    
    if (!clickedItem) return

    selectedId = clickedItem.dataset.dialogId

    console.log("Dialog Selected ID:", selectedId)

    const customEvent = new CustomEvent('dialogChange', { detail: { id: selectedId } })
    window.dispatchEvent(customEvent)

    dialogsLoad(selectedId)

    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active')
    })

    clickedItem.classList.add('active')

    const welcomeScreen = document.getElementById("welcomeScreen")
    welcomeScreen.classList.add("hidden")

    const chatWindow = document.getElementById("chatWindow")
    chatWindow.classList.remove("hidden")

    container.scrollTo(0, container.scrollHeight)
})

async function getData() {
  try {
    const messageResponse = await fetch('messages')
    const dialogResponse = await fetch('dialogs')

    if (!messageResponse.ok) {
      throw new Error(`Response status: ${messageResponse.status}`)
    }

    const db_messages = await messageResponse.json()
    db_messages.map(msg => messagesLoad(msg.content))

    if (!dialogResponse.ok) {
      throw new Error(`Response status: ${dialogResponse.status}`)
    }

    const db_dialogs = await dialogResponse.json()
    db_dialogs.map(dialog => dialogsLoad(db_dialogs))
    console.log(db_dialogs)

    container.scrollTo(0, container.scrollHeight)
  } 
  catch (error) {
    console.error(error.message)
  }
}
getData()

socket.on('sendMsg', message => {
  messagesLoad(message)
  container.scrollTo(0, container.scrollHeight)
})

function messagesLoad(msg) {
  const msgElem = document.createElement('div')
  msgElem.textContent = msg
  msgElem.setAttribute('class', 'message user2')
  container.appendChild(msgElem)
}

function dialogsLoad(dialogData) {
  const chatList = document.querySelector('.chat-list')

  const dialogElem = document.createElement('div')
  dialogElem.setAttribute('class', 'chat-item')
  dialogElem.dataset.dialogId = dialogData.id

  dialogElem.innerHTML = `
    <div class="avatar"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYCi9I9mpeMzm-iQFEMahQsCdtwLxKLn2keg&s"></div>
    <div class="chat-info">
      <h4>${dialogData.name}</h4>
      <p>${dialogData.lastMessage}</p>
    </div>`

  chatList.appendChild(dialogElem)
}

const form = document.getElementById('form')
const input = document.getElementById('msgInput')

form.addEventListener('submit', async function(e) {
  e.preventDefault()
  if(input.value.trim() !== "") {
      socket.emit('new_message', input.value)
      input.value = ""
  }
})

// const username = ""
// socket.emit('set_username', username)