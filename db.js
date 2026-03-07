const mysql = require('mysql2')
const crypto = require('crypto')

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1111',
  database: 'chat'
})

module.exports = {
    getMessages: async () => {
        try {
            const [rowsSimple] = await db.promise().query('SELECT * FROM message')
            return rowsSimple
        }
        catch(dbErr) {
            console.error("Error: " + dbErr)
        }
    },

    getDialogs: async () => {
        try {
            const [dialogsList] = await db.promise().query('SELECT * FROM dialog WHERE first_user_id = 1 OR second_user_id = 1;')
            return dialogsList
        }
        catch(dbErr) {
            console.error("Error: " + dbErr)
        }
    },

    addMessage: async (msg, authorId, dialogId) => {
        await db.promise().query('INSERT INTO message(content, author_id, dialog_id) VALUES (?, ?, ?)', [msg, authorId, dialogId])
    },

    loginExistanceCheck: async login => {
        const [rows] = await db.promise().query('SELECT 1 FROM user WHERE login = ? LIMIT 1', [login])
        return rows.length > 0
    },

    addUser: async (login, email, password, star_balance, salt) => {
        try
        {
            await db.promise().query('INSERT INTO user(login, email, password, star_balance, salt) VALUES (?, ?, ?, ?, ?)', [login, email, password, star_balance, salt])
            console.log('Account has been added successfully')
        }
        catch(e)
        {
            console.error(`User with login "${login}" already exists`)
        }
    },

    getAuthToken: async user => {
        const candidate = await db.promise().query('SELECT * FROM user WHERE login = ?', [user.username])
        if(!candidate.length) {
            throw 'Wrong login'
        }
        if(candidate[0][0].password !== user.password) {
            throw 'Wrong password'
        }
        else {
            return `${candidate[0][0].id}.${user.username}.${crypto.randomBytes(20).toString('hex')}`
        }
    },

    hashThePassword: async password => {
        const salt = crypto.randomBytes(16).toString('hex')
        const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString('hex')
        return {hashedPassword: hashedPassword, salt: salt}
    }
}