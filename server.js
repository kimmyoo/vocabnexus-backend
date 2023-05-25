require('dotenv').config()

const cors = require('cors')
const express = require('express')

const bodyParser = require('body-parser')

// for database connection 
const connectDB = require('./config/dbConn')
// for the bottom two functions to connect and monitor errors
const mongoose = require('mongoose')

const PORT = process.env.PORT || 3500
const path = require('path')
const cookieParser = require('cookie-parser')
const corsOptions = require('./config/corsOptions')
const app = express()

console.log(process.env.NODE_ENV)

// call the function to connect to database
connectDB()

app.use(bodyParser.urlencoded({ extended: true }))

app.use(cors(corsOptions))
app.use(bodyParser.json())
// this will set up public directory for css
app.use(express.static(__dirname + '/public'))
app.use(cookieParser())

// routes
app.get('^/$|/index(.html)?', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'))
    // another way of doing this
    // res.sendFile('./views/index.html', { root: __dirname });
})

app.use('/auth', require('./routes/authRoutes'))
app.use('/users', require('./routes/userRoutes'))
app.use('/user', require('./routes/profileRoutes'))
app.use('/nodes', require('./routes/nodeRoutes'))
app.use('/nexus', require('./routes/nexusRoutes'))

app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'))
})

// mongoose.connection
mongoose.connection.once('open', () => {
    console.log("connected to database")
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})

mongoose.connection.on('error', (err) => {
    console.log(err)
})
