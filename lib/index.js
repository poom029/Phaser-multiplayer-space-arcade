var express = require('express');  
var app = express();
var path = require('path')

var Player = require('./Player')
var players = []

//Static resources server

app.use(express.static(path.resolve(__dirname, '../public')));

var server = app.listen(3000, function () {  
    var port = server.address().port;
    console.log('Server running at port %s', port);
    
});

var io = require('socket.io')(server);  

/* Connection events */
io.on('connection', (client) => {  
    console.log('User connected '+client.id)

    client.on('new player',onNewPlayer)

    client.on('move player', onMovePlayer)

    client.on('disconnect', onClientDisconnect)

    client.on('fireBullet' ,playerShoot)

    // io.emit()
})

// New player has joined
function onNewPlayer (data) {
    // Create a new player
    var newPlayer = new Player(data.x, data.y, data.angle)
    newPlayer.id = this.id
  
    // Broadcast new player to connected socket clients
    console.log('broadcasting new player')
    this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), angle: newPlayer.getAngle()})
  
    // Send existing players to the new player
    var i, existingPlayer
    for (i = 0; i < players.length; i++) {
      existingPlayer = players[i]
      this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), angle: existingPlayer.getAngle()})
    }
  
    // Add new player to the players array
    players.push(newPlayer)
  }

  // Player has moved
function onMovePlayer (data) {
    // Find player in array
    var movePlayer = playerById(this.id)
  
    // Player not found
    if (!movePlayer) {
      console.log('Player not found: ' + this.id)
      return
    }
  
    // Update player position
    movePlayer.setX(data.x)
    movePlayer.setY(data.y)
    movePlayer.setAngle(data.angle)
  
    // Broadcast updated position to connected socket clients
    this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), angle: movePlayer.getAngle()})
  }

  function playerShoot () {
   
    this.broadcast.emit('enemyFired', this.id)
  }

  function onClientDisconnect () {
    console.log('Player has disconnected: ' + this.id)
  
    var removePlayer = playerById(this.id)
  
    // Player not found
    if (!removePlayer) {
      console.log('Player not found: ' + this.id)
      return
    }
  
    // Remove player from players array
    players.splice(players.indexOf(removePlayer), 1)
  
    // Broadcast removed player to connected socket clients
    this.broadcast.emit('remove player', {id: this.id})
  }



  function playerById (id) {
    var i
    for (i = 0; i < players.length; i++) {
      if (players[i].id === id) {
        return players[i]
      }
    }
  
    return false
  }