const socket = io()

const container = document.getElementById('messageContainer')
const chatList = document.querySelector('.chat-list')

let selectedId = ""
let currentUserId = null

function getCurrentUserIdFromCookie() {
  const token = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='))
  if (!token) return null
  const value = token.split('=')[1]
  if (!value) return null
  const parts = value.split('.')
  if (parts.length < 2) return null
  return Number(parts[0])
}

function renderMessage(msg) {
  const msgElem = document.createElement('div')
  msgElem.textContent = msg.content || ''
  const isMine = currentUserId && msg.author_id && Number(msg.author_id) === currentUserId
  msgElem.setAttribute('class', `message ${isMine ? 'user2' : 'user1'}`)
  container.appendChild(msgElem)
}

function loadDialogMessages(dialogId) {
  container.innerHTML = ''
  const currentChatMessages = db_messages
    .filter(msg => String(msg.dialog_id) === String(dialogId))
    .sort((a, b) => a.id - b.id)

  currentChatMessages.forEach(renderMessage)
  container.scrollTo(0, container.scrollHeight)
}

chatList.addEventListener('click', (e) => {
  const clickedItem = e.target.closest('.chat-item')
  if (!clickedItem) return

  selectedId = clickedItem.dataset.dialogId

  const chatHeaderTitle = document.querySelector('.chat-header h3')
  const chatName = clickedItem.dataset.dialogName || clickedItem.querySelector('h4')?.textContent
  if (chatHeaderTitle && chatName) chatHeaderTitle.textContent = chatName

  const customEvent = new CustomEvent('dialogChange', { detail: { id: selectedId } })
  window.dispatchEvent(customEvent)

  document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'))
  clickedItem.classList.add('active')

  const welcomeScreen = document.getElementById('welcomeScreen')
  welcomeScreen.classList.add('hidden')

  const chatWindow = document.getElementById('chatWindow')
  chatWindow.classList.remove('hidden')

  loadDialogMessages(selectedId)
})

let db_messages = []

async function getData() {
  currentUserId = getCurrentUserIdFromCookie()

  try {
    const [messageResponse, dialogResponse] = await Promise.all([
      fetch('messages'),
      fetch('dialogs'),
    ])

    if (!messageResponse.ok || !dialogResponse.ok) {
      throw new Error('Response status error')
    }

    db_messages = await messageResponse.json()
    const db_dialogs = await dialogResponse.json()

    db_dialogs.forEach(dialog => dialogsLoad(dialog))
  } catch (error) {
    console.error(error.message)
  }
}
getData()

socket.on('sendMsg', message => {
  db_messages.push(message)

  const previewItem = document.querySelector(`.chat-item[data-dialog-id="${message.dialogId}"]`)
  if (previewItem) {
    const preview = previewItem.querySelector('.chat-info p')
    if (preview) preview.textContent = message.content
  }

  if (String(message.dialogId) === String(selectedId)) {
    renderMessage(message)
    container.scrollTo(0, container.scrollHeight)
  }
})

function dialogsLoad(dialogData) {
  const dialogElem = document.createElement('div')
  dialogElem.className = 'chat-item'
  dialogElem.dataset.dialogId = dialogData.id
  dialogElem.dataset.dialogName = dialogData.name

  dialogElem.innerHTML = `
    <div class="avatar"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYCi9I9mpeMzm-iQFEMahQsCdtwLxKLn2keg&s"></div>
    <div class="chat-info">
      <h4>${dialogData.name}</h4>
      <p>${dialogData.lastMessage || ''}</p>
    </div>
  `

  chatList.appendChild(dialogElem)
}

const form = document.getElementById('form')
const input = document.getElementById('msgInput')

form.addEventListener('submit', function (e) {
  e.preventDefault()
  if (!selectedId || !input.value.trim()) return

  socket.emit('new_message', { dialogId: selectedId, content: input.value.trim() })
  input.value = ''
})
