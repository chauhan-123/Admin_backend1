const express = require('express')
const app = express()
require('./db/mongoose');
const path = require('path');
var cors = require('cors');
const userrouter = require('./router/userRoutes');
const bodyParser = require('body-parser')
const morgan = require('morgan');
const port = process.env.PORT || 3000;


// Socket function
let http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
io.origins(['*:*']);


// server.listen(port,() => {
//     console.log(`started on port: ${port}`);
// });

io.on('connection', (socket) => {
    socket.on('new-message', (message , res) => {
        res.set('Access-Control-Allow-Origin', '*')
        io.sockets.emit('new-message', message);
    });
});


// Middlewares
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../Images/')))

// Routes
app.use(userrouter)

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        error: {
            msg: err.message
        }
    })
});





// Server
app.listen(port, () => {
    console.log('srever is listening on port: ' + port)
})