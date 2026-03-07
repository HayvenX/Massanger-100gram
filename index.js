const http = require('http')
const path = require('path')
const fs = require('fs')
const { Server } = require('socket.io')
const { json } = require('stream/consumers')
const db = require('./db')
const cookie = require('cookie')

const server = http.createServer(async function(req, res) {
  if(req.url == '/sign_in' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/html'})
    return res.end(fs.readFileSync(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_in.html'), 'utf-8'))
  }
  else if(req.url == '/sign_in' && req.method == 'POST') {
    return signIn(req, res)
  }

  else if(req.url == '/sign_up' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/html'})
    return res.end(fs.readFileSync(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_up.html'), 'utf-8'))
  }
  else if(req.url == '/sign_up' && req.method == 'POST') {
    return signUp(req, res)
  }

  else if(req.url == '/styles.css' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/css'})
    return res.end(fs.readFileSync(path.join(__dirname, 'static', 'sign_in sign_up', 'styles.css'), 'utf-8'))
  }

  else if(req.url == '/sign_in.js' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/js'})
    return res.end(fs.readFileSync(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_in.js'), 'utf-8'))
  }
  else if(req.url == '/sign_up.js' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/js'})
    return res.end(fs.readFileSync(path.join(__dirname, 'static', 'sign_in sign_up', 'sign_up.js'), 'utf-8'))
  }

  return guarded(req, res)
})


async function signUp(req, res)
{
  let data = ''

  req.on('data', function(chunk) {
    data += chunk
  })
  req.on('end', async function() {
    let parsedUserData = JSON.parse(data)
    const hashedPassword = JSON.stringify((await db.hashThePassword(parsedUserData["password"])).hashedPassword)
    const salt = JSON.stringify((await db.hashThePassword(parsedUserData["password"])).salt)

    if(db.loginExistanceCheck(parsedUserData["username"])) {
      db.addUser(parsedUserData["username"], parsedUserData["email"], hashedPassword, 0, salt)
    }
    
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(data)
  })
}

let validAuthTokens = []

async function signIn(req, res) {
  let data = ''

  req.on('data', chunk => {
    data += chunk
  })
  req.on('end', async () => {
    try {
      const user = JSON.parse(data)

      const token = await db.getAuthToken(user)
      validAuthTokens.push(token)

      const hashedPassword = await db.hashThePassword(user.password)

      res.writeHead(200)
      res.end(token)
    }
    catch(e) {
      console.log(e)
      res.writeHead(500)
      return res.end(`Error: ${e}`)
    }
  })
}

function getCredentionals(c = '') {
    const cookies = cookie.parse(c)
    const token = cookies?.token
    if(!token || !validAuthTokens.includes(token)) return null
    const [user_id, login] = token.split('.')
    if(!user_id || !login) return null
    return {user_id, login}
}

async function guarded(req, res) {
  const credentionals = getCredentionals(req.headers?.cookie)

  if(!credentionals) {
    res.writeHead(302, {'Location': '/sign_up'})
    return res.end("Error 404")
  }
  if(req.method === 'GET') {
    switch(req.url) {
      case '/': return res.end(fs.readFileSync(path.join(__dirname, 'static', 'home', 'home.html'), 'utf-8'))
      case '/home.css': return res.end(fs.readFileSync(path.join(__dirname, 'static', 'home', 'home.css'), 'utf-8'))
      case '/home.js': return res.end(fs.readFileSync(path.join(__dirname, 'static', 'home', 'home.js'), 'utf-8'))
      case '/messages': return res.end(JSON.stringify(await db.getMessages()))
      case '/dialogs': return res.end(JSON.stringify(await db.getDialogs()))
    }
  }
  else {
    res.writeHead(404)
    return res.end("Error 404")
  }
}

const io = new Server(server)

io.on('connection', socket => {
  let author_id = 1
  let dialog_id = 3

  // socket.on('set_username', name => {
  //   username = name
  // })

  socket.on('new_message', message => {
    db.addMessage(message, author_id, dialog_id)
    io.emit('sendMsg', message)
  })
})

server.listen(3000)