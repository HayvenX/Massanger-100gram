const path = require('path')
const crypto = require('crypto')
const { Server } = require('socket.io')
const { json } = require('stream/consumers')
const db = require('./mysql-db')
const cookie = require('cookie')
const http = require('http')
const express = require('express')

const app = express()
const server = http.createServer(app)

app.use(express.json())

app.use('/styles.css', express.static(path.join(__dirname, 'static', 'sign_in sign_up', 'styles.css')))
app.use('/sign_in.js', express.static(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_in.js')))
app.use('/sign_up.js', express.static(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_up.js')))

app.get('/sign_in', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_in.html'))
})
app.get('/sign_up', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_up.html'))
})

app.post('/sign_in', async (req, res) => {
  try {
    const user = req.body
    const token = await db.getAuthToken(user)
    validAuthTokens.push(token)
    res.send(token)
  }
  catch(e) {
    console.error(e)
    res.status(500).send(`Error: ${e}`)
  }
})

app.post('/sign_up', async (req, res) => {
  try {
    const parsedUserData = req.body
    const { hashedPassword, salt } = await db.hashThePassword(parsedUserData.password)
    const doesUserExist = await db.loginExistanceCheck(parsedUserData.username)
    if (doesUserExist) {
      return res.status(400).send('User already exists')
    }
    const newUserId = await db.addUser(parsedUserData.username, parsedUserData.email, hashedPassword, 0, salt)
    const token = `${newUserId}.${parsedUserData.username}.${crypto.randomBytes(20).toString('hex')}`
    validAuthTokens.push(token)
    res.cookie('token', token, { httpOnly: true, path: '/' })
    res.redirect('/')
  }
  catch(e) {
    console.error(e)
    res.status(500).send(`Error: ${e}`)
  }
})

let validAuthTokens = []

function getCredentionals(c = '') {
    const cookies = cookie.parse(c)
    const token = cookies?.token
    if(!token || !validAuthTokens.includes(token)) return null
    const [user_id, login] = token.split('.')
    if(!user_id || !login) return null
    return {user_id, login}
}

async function guarded(req, res, next) {
  const credentionals = getCredentionals(req.headers?.cookie)

  if(!credentionals) {
    return res.redirect('/sign_up')
  }

  req.credentionals = credentionals
  next()
}

  app.get('/', guarded, (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'home', 'home.html'))
  })
  app.get('/home.css', guarded, (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'home', 'home.css'))
  })
  app.get('/home.js', guarded, (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'home', 'home.js'))
  })

  app.get('/messages', guarded, async (req, res) => {
    res.json(await db.getMessages())
  })
  app.get('/dialogs', guarded, async (req, res) => {
    res.json(await db.getDialogs(Number(req.credentionals.user_id)))
  })

const io = new Server(server)

io.on('connection', socket => {
  const creds = getCredentionals(socket.request.headers?.cookie || '')
  const author_id = creds ? Number(creds.user_id) : 1

  socket.on('new_message', async message => {
    if (!message || !message.dialogId || !message.content) return

    const dialogId = Number(message.dialogId)
    const insertedId = await db.addMessage(message.content, author_id, dialogId)

    const outMsg = {
      id: insertedId,
      content: message.content,
      author_id: author_id,
      dialog_id: dialogId,
      dialogId: dialogId
    }

    io.emit('sendMsg', outMsg)
  })
})

server.listen(3000)