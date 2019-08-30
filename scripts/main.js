var UNITWIDTH = 90
var UNITHEIGHT = 45
var CATCHOFFSET = 120
var PLAYERSPEED = 800.0
var EGGSCALE = 3
var PLAYERCOLLISIONDISTANCE = 38

var camera
var scene
var renderer
var gameOver = false
var controls
var controlsEnabled = false
var moveForward = false
var moveBackward = false
var moveLeft = false
var moveRight = false
var playerVelocity = new THREE.Vector3()
var clock
var totalCubesWide
var collidableObjects = []
var mapSize
var egg, eggs = []
let score = 0
var loader = new THREE.JSONLoader()
var instructions = document.getElementById('instructions')
var blocker = document.getElementById("blocker")

getPointerLock()
init()

function init() {
    clock = new THREE.Clock()
    listenForPlayerMovement()

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xcccccc, 0.0015)


    renderer = new THREE.WebGLRenderer()
    renderer.setClearColor(scene.fog.color)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    var container = document.getElementById("container")
    container.appendChild(renderer.domElement)

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000)
    camera.position.y = 20
    camera.position.x = 0
    camera.position.z = 0
    scene.add(camera)

    controls = new THREE.PointerLockControls(camera)
    scene.add(controls.getObject())

    createMazeCubes()
    createGround()
    createPerimWalls()

    var textureLoader = new THREE.TextureLoader()
    var map = textureLoader.load('models/car/texture.jpg');
    var handMaterial = new THREE.MeshPhongMaterial({map: map});

    var objLoader = new THREE.OBJLoader()

    objLoader.load(
        'models/car/Shelby.obj', object => {
            console.log(object)

            object.traverse(node => {
                
                node.material = handMaterial
            })
            object.name = "car"

            object.rotation.y = degreesToRadians(-90)

            camera.add(object);
            object.position.set(0, -5, -15);
            
            animate()
        }, xhr => {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' )
        }, error => {
            console.log(error)
        }
    )

    addLights()
    

    window.addEventListener('resize', onWindowResize, false)
}

function postprocessing() {


}

function addLights() {
    var lightOne = new THREE.DirectionalLight(0xffffff)
    lightOne.position.set(1, 1, 1)
    scene.add(lightOne)

    var lightTwo = new THREE.DirectionalLight(0xffffff, .5)
    lightTwo.position.set(1, -1, -1)
    scene.add(lightTwo)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

function caught() {
    blocker.style.display = ''
    instructions.innerHTML = "GAME OVER </br></br></br> Press ESC to restart"
    gameOver = true
    instructions.style.display = ''
    dinoAlert.style.display = 'none'
}

function animate() {
    render()
    requestAnimationFrame(animate)
    
    var delta = clock.getDelta()
    
    animatePlayer(delta)
}

function animatePlayer(delta) {

    const direction = new THREE.Vector3;
    let speed = 2.0

    if(detectPlayerCollision() == false) {
        if (moveForward) {
            camera.getWorldDirection(direction);

            camera.position.addScaledVector(direction, speed);
        } 
        if (moveBackward) {
            
            camera.getWorldDirection(direction);

            camera.position.addScaledVector(direction, -speed);
        } 
        if (moveLeft) {
            camera.rotation.y += degreesToRadians(1)
            camera.children[0].rotation.y += degreesToRadians(1)
        }
        
        if (moveRight) {
            camera.rotation.y -= degreesToRadians(1)
            camera.children[0].rotation.y -= degreesToRadians(1)
        }
        
        if (!moveRight && !moveLeft) {
            camera.children[0].rotation.y = degreesToRadians(-90)
        }


        controls.getObject().translateX(playerVelocity.x * delta)
        controls.getObject().translateZ(playerVelocity.z * delta)
    } else {
        playerVelocity.x = 0
        playerVelocity.z = 0
    }
}

function render() {
    renderer.render(scene, camera)
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI
}

function detectPlayerCollision() {
    var rotationMatrix
    var cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, 0)).clone()

    if(moveBackward) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(180))
    } else if (moveLeft) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(90))
    } else if (moveRight) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(270))
    }

    if(rotationMatrix !== undefined) {
        cameraDirection.applyMatrix4(rotationMatrix)
    }

    detectEggCollision()

    var rayCaster = new THREE.Raycaster(controls.getObject().position, cameraDirection)

    if(rayIntersect(rayCaster, PLAYERCOLLISIONDISTANCE)) {
        return true
    } else {
        return false
    }
}

function detectEggCollision() {
        eggs.forEach(egg => {
            if(Math.floor(controls.getObject().position.x) > (egg.position.x - 10) &&
               Math.floor(controls.getObject().position.x) < (egg.position.x + 10)){
                console.log('aqui')
    
                if(Math.floor(controls.getObject().position.z) > (egg.position.z - 10) &&
                   Math.floor(controls.getObject().position.z) < (egg.position.z + 10)) {
                    console.log('remove')
                    scene.remove( egg );
                    collidableObjects.splice(eggs.indexOf(egg), 1)

                    eggs.splice(eggs.indexOf(egg), 1)

                    let scoreHTML = document.getElementById("score")
                    score++
                    scoreHTML.innerHTML = "Score: " + score
                }
    
            }
        })
}

function rayIntersect(ray, distance) {
    var intersects = ray.intersectObjects(collidableObjects)
    for (var i = 0; i < intersects.length; i++) {
        if(intersects[i].distance < distance) {
            return true
        }
    }
    return false
}

function lockChange() {
    if(document.pointerLockElement === container) {
        blocker.style.display = "none"
        controls.enabled = true
    } else {
        if (gameOver) {
            location.reload()
        }
        blocker.style.display = ""
        controls.enabled = false
    }
}


function createMazeCubes() {
    var map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, ],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, ],
        [1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, ],
        [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, ],
        [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, ],
        [1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, ],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, ],
        [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, ],
    ]

    var cubeGeo = new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT, UNITWIDTH)
    var cubeMat = new THREE.MeshPhongMaterial({
        color: 0x81cfe0
    })

    for (var i = 0; i < totalCubesWide; i++) {
        for(var j = 0; j < map[i].length; j++) {
            let xPos = Math.floor(Math.random * map[0].length)
            let yPos = Math.floor(Math.random * map[0].length)

            if(map[xPos][yPos] === 0) { map = 2 } else { i-- }
        }
    }

    var widthOffset = UNITWIDTH / 2
    var heightOffset = UNITHEIGHT / 2

    totalCubesWide = map[0].length

    for (var i = 0; i < totalCubesWide; i++) {
        for(var j = 0; j < map[i].length; j++) {
            if(map[i][j]) {
                if(map[i][j] == 1) {

                    let sideRoad = new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT / 8, UNITWIDTH)
                    var material = new THREE.MeshBasicMaterial( { 
                        map: THREE.ImageUtils.loadTexture( "textures/wall.jpg" ),
                        side: THREE.DoubleSide
                    } );
                    material.map.minFilter = THREE.LinearFilter;

                    var cube = new THREE.Mesh(sideRoad, material)

                    cube.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    cube.position.y = heightOffset
                    cube.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset

                    scene.add(cube)

                    collidableObjects.push(cube)
                } else if (map[i][j] == 2) {

                    var geometry = new THREE.SphereGeometry( 5, 32, 32 );
                    var material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
                    egg = new THREE.Mesh( geometry, material );
                    egg.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    egg.position.y = heightOffset
                    egg.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    scene.add( egg );
                    collidableObjects.push(egg)

                    eggs.push(egg)
                    
                    //scene.add(cube)

                    //collidableObjects.push(cube)
                }
            }
        }
    }

    mapSize = totalCubesWide * UNITWIDTH
}

function createGround() {
    var groundGeo = new THREE.PlaneGeometry(mapSize, mapSize)
    var groundMat = new THREE.MeshPhongMaterial({ color: 0xA0522D, side: THREE.DoubleSide, shading: THREE.FlatShading })

    var ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, 1, 0)
    ground.rotation.x = degreesToRadians(90)
    scene.add(ground)
}

function createPerimWalls() {
    var halfMap = mapSize/2
    var sign = 1    

    for (var i = 0; i < 2; i++) {
        var perimGeo = new THREE.PlaneGeometry(mapSize, UNITHEIGHT)
        var perimMat = new THREE.MeshPhongMaterial({ color: 0x464646, side: THREE.DoubleSide})
        var perimWallLR = new THREE.Mesh(perimGeo, perimMat)
        var perimWallFB = new THREE.Mesh(perimGeo, perimMat)

        perimWallLR.position.set(halfMap * sign, UNITHEIGHT / 2, 0)
        perimWallLR.rotation.y = degreesToRadians(90)
        scene.add(perimWallLR)

        collidableObjects.push(perimWallLR)

        perimWallFB.position.set(0, UNITHEIGHT / 2, halfMap * sign)
        scene.add(perimWallFB)

        collidableObjects.push(perimWallFB)

        sign = -1
    }
}

function getPointerLock() {
    document.onclick = function() {
        container.requestPointerLock()
    }
    document.addEventListener('pointerlockchange', lockChange, false)
}

function lockChange() {
    if(document.pointerLockElement === container) {
        blocker.style.display = "none"
        controls.enabled = true
    } else {
        blocker.style.display = ""
        controls.enabled = false
    }
}

function listenForPlayerMovement() {
    var onKeyDown = function(event) {
        switch(event.keyCode) {
            case 38: //up
            case 87: // W
                moveForward = true
                break
            case 37: //left
            case 65: // A
                moveLeft = true
                break
            case 40: //down
            case 83: // S
                moveBackward = true
                break
            case 39: //right
            case 68: // D
                moveRight = true
                break
        }
    }

    var onKeyUp = function(event) {
        switch(event.keyCode) {
            case 38: //up
            case 87: // W
                moveForward = false
                break
            case 37: //left
            case 65: // A
                moveLeft = false
                break
            case 40: //down
            case 83: // S
                moveBackward = false
                break
            case 39: //right
            case 68: // D
                moveRight = false
                break
        }
    }

    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)
}