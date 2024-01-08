window.addEventListener('load', setup)

const White = new Float32Array([1, 1, 1, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
let ArrowUp = IdentityMatrix
let ArrowRight = IdentityMatrix
let fb = 0
let lr = 0
let ud_motion = 0
let lr_motion = 0

/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    const vs = await fetch('vertex_shader.glsl').then(res => res.text())
    const fs = await fetch('fragment_shader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    terrain = makeGeom(50, 50)
    addNormals(terrain)
    window.grid = setupGeometry(terrain)
    
    fillScreen()
    window.addEventListener('resize', fillScreen)

    window.keysBeingPressed = {}
    window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
    window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)

    requestAnimationFrame(tick)
    //tick(0) // <- ensure this function is called only once, at the end of setup
}

function makeGeom(gridsize = 3, faults = 0, c = 1) {
    if (gridsize < 2)
        gridsize = 2;

    if (faults < 0)
        faults = 0;

    let total = 0;
    let square = 0;
    console.log("Attempt to make gridsize: " + gridsize);

    const g = {
        "triangles": [],
        "attributes": [
            [], // position
            []  // color
        ]
    };

    const step = 2 / (gridsize - 1); // Calculate step size to span from -1 to 1

    // Create a grid with vertices in the x-z plane
    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            const x = -1 + i * step; // Calculate x within [-1, 1]
            const z = -1 + j * step; // Calculate z within [-1, 1]

            g.attributes[0].push([x, 0, z]);
            g.attributes[1].push([0.9, 0.85, 0]);

            if (i < gridsize - 1 && j < gridsize - 1) {
                const idx = i * gridsize + j;

                g.triangles.push([idx, idx + 1, idx + gridsize]);
                g.triangles.push([idx + 1, idx + gridsize + 1, idx + gridsize]);
                total += 2;
                square += 1;
            }
        }
    }

    // Generate multiple random fault planes
    if (faults > 0) {

        for (let f = 0; f < faults; f++) {
            const p = {
                x: Math.random() * 2 - 1,  // Random x within [-1, 1]
                z: Math.random() * 2 - 1   // Random z within [-1, 1]
            };
    
            const theta = Math.random() * 2 * Math.PI;
            const n = {
                x: Math.cos(theta),
                y: 0,
                z: Math.sin(theta)
            };
    
            const smallIncrement = 0.05;
    
            for (let i = 0; i < g.attributes[0].length; i++) {
                const vertex = g.attributes[0][i];
                const vertexPosition = {
                    x: vertex[0],
                    y: vertex[1],
                    z: vertex[2]
                };
               
                const dotProduct = (vertexPosition.x - p.x) * n.x + (vertexPosition.z - p.z) * n.z;
               
                if (dotProduct >= 0) {
                    // Vertex is on the positive side of the fault plane, raise its y coordinate
                    vertexPosition.y += smallIncrement;
                } else {
                    // Vertex is on the negative side, lower its y coordinate
                    vertexPosition.y -= smallIncrement;
                }
               
                g.attributes[0][i] = [vertexPosition.x, vertexPosition.y, vertexPosition.z];
            }
        }

        let maxHeight = -Infinity;
        let minHeight = Infinity;
        for (let i = 0; i < g.attributes[0].length; i++) {
            const y = g.attributes[0][i][1];
            maxHeight = Math.max(maxHeight, y);
            minHeight = Math.min(minHeight, y);
        }

        console.log(maxHeight,minHeight)

        for (let i = 0; i < g.attributes[0].length; i++) {
            const y = g.attributes[0][i][1];
            const normalizedY = c * ((y - 0.5 * (maxHeight + minHeight)) / (maxHeight - minHeight));
            g.attributes[0][i][1] = normalizedY;
        }

    }

    

    console.log("perfect gridsize*gridsize: " + gridsize*gridsize)
    console.log("perfect (gridsize-1)*(gridsize-1)*2: " + (gridsize-1)*(gridsize-1)*2)
    
    console.log("Current # Vertices: " + g.attributes[0].length)
    console.log("Current (gridsize-1)*(gridsize-1)*2: " + total)
    console.log(g.attributes[0])
    console.log(g.triangles)

    return g;
}
  

/**
 * Compiles two shaders, links them together, looks up their uniform locations,
 * and returns the result. Reports any shader errors to the console.
 *
 * @param {string} vs_source - the source code of the vertex shader
 * @param {string} fs_source - the source code of the fragment shader
 * @return {WebGLProgram} the compiled and linked program
 */
function compile(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Runs the animation using requestAnimationFrame. This is like a loop that
 * runs once per screen refresh, but a loop won't work because we need to let
 * the browser do other things between ticks. Instead, we have a function that
 * requests itself be queued to be run again as its last step.
 * 
 * @param {Number} milliseconds - milliseconds since web page loaded; 
 *        automatically provided by the browser when invoked with
 *        requestAnimationFrame
 */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clearColor(...White) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    let ld = normalize([1,1,1])
    let h = normalize(add(ld, [0,0,1]))
    gl.uniform3fv(program.uniforms.lightdir, ld)
    gl.uniform3fv(program.uniforms.lightcolor, [0.7, 0.5, 0.3])
    gl.uniform3fv(program.uniforms.halfway, h)

    let m = IdentityMatrix

    let rotSpeed = 0.02
    let moveSpeed = 0.02

    if (keysBeingPressed['ArrowUp']) {
        const rotationMatrix = m4rotX(-rotSpeed);
        ArrowUp = m4mul(rotationMatrix, ArrowUp);
    }

    if (keysBeingPressed['ArrowDown']) {
        const rotationMatrix = m4rotX(rotSpeed); 
        ArrowUp = m4mul(rotationMatrix, ArrowUp);
    }

    if (keysBeingPressed['ArrowRight']) {
        const rotationMatrix = m4rotY(rotSpeed); 
        ArrowRight = m4mul(rotationMatrix, ArrowRight);
    }

    if (keysBeingPressed['ArrowLeft']) {
        const rotationMatrix = m4rotY(-rotSpeed);
        ArrowRight = m4mul(rotationMatrix, ArrowRight);
    }

    if (keysBeingPressed['w']) {
        const forward = normalize(cross(ArrowUp, ArrowRight));
        const translationMatrix = m4trans(0, 0, moveSpeed);
        ArrowUp = m4mul(translationMatrix, ArrowUp);
        ArrowRight = m4mul(translationMatrix, ArrowRight);
    }

    if (keysBeingPressed['a']) {
        const left = normalize(cross(ArrowUp, ArrowRight));
        const translationMatrix = m4trans(moveSpeed, 0, 0);
        ArrowUp = m4mul(translationMatrix, ArrowUp);
        ArrowRight = m4mul(translationMatrix, ArrowRight);
    }

    if (keysBeingPressed['s']) {
        const forward = normalize(cross(ArrowUp, ArrowRight));
        const translationMatrix = m4trans(0, 0, -moveSpeed);
        ArrowUp = m4mul(translationMatrix, ArrowUp);
        ArrowRight = m4mul(translationMatrix, ArrowRight);
    }

    if (keysBeingPressed['d']) {
        const left = normalize(cross(ArrowUp, ArrowRight));
        const translationMatrix = m4trans(-moveSpeed, 0, 0);
        ArrowUp = m4mul(translationMatrix, ArrowUp);
        ArrowRight = m4mul(translationMatrix, ArrowRight);
    }

    if (keysBeingPressed['Enter']) {
        ArrowUp = IdentityMatrix;
        ArrowRight = IdentityMatrix;
        fb = 0;
        lr = 0;
    }

    const eye = [0 - lr, 1, 2 + fb];
    const v = m4mul(ArrowUp, ArrowRight, m4view(eye, [0, 0, 0], [0, 1, 0]));

    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)


    gl.bindVertexArray(grid.vao);
    gl.uniformMatrix4fv(program.uniforms.mv, false, v);
    gl.drawElements(grid.mode, grid.count, grid.type, 0);
}


/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 * 
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 * 
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 * 
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 * 
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

function addNormals(geom) {
    console.log(geom.attributes)
    let ni = geom.attributes.length
    geom.attributes.push([])
    for(let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni].push([0,0,0])
    }
    for(let i = 0; i < geom.triangles.length; i+=1) {
        let p0 = geom.attributes[0][geom.triangles[i][0]]
        let p1 = geom.attributes[0][geom.triangles[i][1]]
        let p2 = geom.attributes[0][geom.triangles[i][2]]
        let e1 = sub(p1,p0)
        let e2 = sub(p2,p0)
        let n = cross(e1,e2)
        geom.attributes[ni][geom.triangles[i][0]] = add(geom.attributes[ni][geom.triangles[i][0]], n)
        geom.attributes[ni][geom.triangles[i][1]] = add(geom.attributes[ni][geom.triangles[i][1]], n)
        geom.attributes[ni][geom.triangles[i][2]] = add(geom.attributes[ni][geom.triangles[i][2]], n)
    }
    for(let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni][i] = normalize(geom.attributes[ni][i])
    }
}