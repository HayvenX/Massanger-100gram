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

    getDialogs: async (currentUserId) => {
        try {
            const [dialogsList] = await db.promise().query(
                `SELECT
                    d.id,
                    CASE
                      WHEN d.first_user_id = ? THEN u2.login
                      ELSE u1.login
                    END AS name,
                    (SELECT content FROM message m WHERE m.dialog_id = d.id ORDER BY m.id DESC LIMIT 1) AS lastMessage
                FROM dialog d
                JOIN user u1 ON u1.id = d.first_user_id
                JOIN user u2 ON u2.id = d.second_user_id
                WHERE d.first_user_id = ? OR d.second_user_id = ?`,
                [currentUserId, currentUserId, currentUserId]
            )
            return dialogsList
        }
        catch(dbErr) {
            console.error("Error: " + dbErr)
        }
    },

    addMessage: async (msg, authorId, dialogId) => {
        const [result] = await db.promise().query(
            'INSERT INTO message(content, author_id, dialog_id) VALUES (?, ?, ?)',
            [msg, authorId, dialogId]
        )
        return result.insertId
    },

    loginExistanceCheck: async login => {
        const [rows] = await db.promise().query('SELECT 1 FROM user WHERE login = ? LIMIT 1', [login])
        return rows.length > 0
    },

    addUser: async (login, email, password, star_balance, salt) => {
        try {
            const [result] = await db.promise().query(
                'INSERT INTO user(login, email, password, star_balance, salt) VALUES (?, ?, ?, ?, ?)',
                [login, email, password, star_balance, salt]
            )
            console.log('Account has been added successfully')
            return result.insertId
        }
        catch(e) {
            console.error(`User with login "${login}" already exists`)
            return null
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