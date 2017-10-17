var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {

  game.load.image('space', 'assets/deep-space.jpg');
  game.load.image('bullet', 'assets/bullets.png');
  game.load.image('ship', 'assets/ship.png');
  game.load.image('enemyShip', 'assets/enemyShip.png');

}

var sprite;
var cursors;

var bullet;
var bullets;
var bulletTime = 0;

var enemies
var player

var socket;

function create() {
  socket = io.connect()

  enemies = []

  game.stage.disableVisibilityChange = true;
  

  //  This will run in Canvas mode, so let's gain a little speed and display
  game.renderer.clearBeforeRender = false;
  game.renderer.roundPixels = true;

  //  We need arcade physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  //  A spacey background
  game.add.tileSprite(0, 0, game.width, game.height, 'space');

  //  Our ships bullets
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;

  //  All 60 of them
  bullets.createMultiple(60, 'bullet');
  bullets.setAll('anchor.x', 0.5);
  bullets.setAll('anchor.y', 0.5);

  //  Our player ship
  player = game.add.sprite(300, 300, 'ship');
  player.anchor.set(0.5);
  player.health = 3
  player.name = socket.id


  //  and its physics settings
  game.physics.enable(player, Phaser.Physics.ARCADE);

  player.body.drag.set(100);
  player.body.maxVelocity.set(200);
  player.body.collideWorldBounds = true;

  //  Game input
  cursors = game.input.keyboard.createCursorKeys();
  game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

  setEventHandlers()

}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected)

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect)

  // New player message received
  socket.on('new player', onNewPlayer)

  // Player move message received
  socket.on('move player', onMovePlayer)

  // Player removed message received
  socket.on('remove player', onRemovePlayer)

  // Enemies Fired
  socket.on('enemyFired', enemyFireBullet)
}

function update() {

  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) {
      enemies[i].update()
      game.physics.arcade.collide(player, enemies[i].player)
      game.physics.arcade.overlap(enemies[i].player, bullet, collisionEnemy, null, this);
    }
  }

  bullets.forEachExists(function (bullet) {
      game.physics.arcade.overlap(player, bullet, collisionPlayer, null, this);
      // game.physics.arcade.collide(,)
    });

  if (cursors.up.isDown) {
    game.physics.arcade.accelerationFromRotation(player.rotation, 200, player.body.acceleration);
  }
  else {
    player.body.acceleration.set(0);
  }

  if (cursors.left.isDown) {
    player.body.angularVelocity = -300;
  }
  else if (cursors.right.isDown) {
    player.body.angularVelocity = 300;
  }
  else {
    player.body.angularVelocity = 0;
  }

  if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
    fireBullet();
  }

  // screenWrap(player);

  // bullets.forEachExists(screenWrap, this);
  socket.emit('move player', { x: player.x, y: player.y, angle: player.angle })

}

function fireBullet() {

  if (game.time.now > bulletTime) {
    bullet = bullets.getFirstExists(false);

    if (bullet) {
      bullet.reset(player.body.x + 16, player.body.y + 16);
      bullet.lifespan = 2000;
      bullet.rotation = player.rotation;
      bullet.ownerId = socket.id;
      game.physics.arcade.velocityFromRotation(player.rotation, 400, bullet.body.velocity);
      
      socket.emit('fireBullet', null)
      
      bulletTime = game.time.now + 800;
      
    }
  }

  
}

function enemyFireBullet(playerId) {
  let bulletOwner = playerById(playerId).player

  bullet = bullets.getFirstExists(false);

  if (bullet) {
    bullet.reset(bulletOwner.body.x + 16, bulletOwner.body.y + 16);
    bullet.lifespan = 2000;
    bullet.rotation = bulletOwner.rotation;
    bullet.ownerId = playerId;
    game.physics.arcade.velocityFromRotation(bulletOwner.rotation, 400, bullet.body.velocity);
    bulletTime = game.time.now + 800;
  }
  
  

}

function collisionPlayer(tPlayer,bullet){
  if(bullet.ownerId!=socket.id){
    if(bullet)
      bullet.kill()
    if(tPlayer){
      tPlayer.health -= 1
      if(tPlayer.health <= 0){
        tPlayer.kill();
      }
    }
  }

  // if(player.name!=tPlayer.name){
  //   if(bullet)
  //     bullet.kill()
  //   if(bullet.ownerId!=socket.id){
  //     if(tPlayer){
  //       tPlayer.health -= 1
  //       if(tPlayer.health <= 0){
  //         tPlayer.kill();
  //       }
  //     }
  //   }
  // }
}
function collisionEnemy(tPlayer,bullet){
  if(bullet.ownerId!=tPlayer.name) 
    bullet.kill()
}


// function screenWrap(player) {

//   if (player.x < 0) {
//     player.x = game.width;
//   }
//   else if (player.x > game.width) {
//     player.x = 0;
//   }

//   if (player.y < 0) {
//     player.y = game.height;
//   }
//   else if (player.y > game.height) {
//     player.y = 0;
//   }

// }

function onSocketConnected() {
  console.log('Connected to socket server')

  // Reset enemies on reconnect
  enemies.forEach(function (enemy) {
    enemy.player.kill()
  })
  enemies = []

  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y, angle: player.angle })
}

// Socket disconnected
function onSocketDisconnect() {
  console.log('Disconnected from socket server')
}

// New player
function onNewPlayer(data) {
  console.log('New player connected:', data.id)

  // Avoid possible duplicate players
  var duplicate = playerById(data.id)
  if (duplicate) {
    console.log('Duplicate player!')
    return
  }

  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.angle))
}

// Move player
function onMovePlayer(data) {
  var movePlayer = playerById(data.id)

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  // Update player position
  movePlayer.player.x = data.x
  movePlayer.player.y = data.y
  movePlayer.player.angle = data.angle
}

// Remove player
function onRemovePlayer(data) {
  var removePlayer = playerById(data.id)

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  removePlayer.player.kill()

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1)
}

// function onBulletFired() {
  
    
//     bullet = bullets.getFirstExists(false);
    
//     if (bullet) {
//       bullet.reset(player.body.x + 16, player.body.y + 16);
//       bullet.lifespan = 2000;
//       bullet.rotation = player.rotation;
//       game.physics.arcade.velocityFromRotation(player.rotation, 400, bullet.body.velocity);
//       bulletTime = game.time.now + 800;
//     }
    
  
//   }

function playerById(id) {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].player.name === id) {
      return enemies[i]
    }
  }

  return false
}
