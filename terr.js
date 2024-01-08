window.addEventListener('load', setup)

const IlliniBlue = new Float32Array([1, 1, 1, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

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

    fillScreen()
    window.addEventListener('resize', fillScreen)
    window.grid = setupGeometry(makeGeom())

    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2
        const faults = Number(document.querySelector('#faults').value) || 0
        console.log(gridsize)
        window.grid = setupGeometry(makeGeom(gridsize))
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
    })

    requestAnimationFrame(tick)
    //tick(0) // <- ensure this function is called only once, at the end of setup
}


/*
function makeGeom(gridsize, faults) {
    g = {"triangles":
        []
    ,"attributes":
        [ // position
            []
        , // color
            []
        ]
    }
    for(let i=0; i<gridsize; i+=1) {
        g.triangles.push(i*3, i*3+1, i*3+2)
        let cx = Math.random()*9-5
        let cy = Math.random()*9-5
        let up = Math.random()*0.0001
        g.attributes[0].push(
            [Math.random()+cx,up,Math.random()+cy],
            [Math.random()+cx,up,Math.random()+cy],
            [Math.random()+cx,up,Math.random()+cy]
        )
        g.attributes[1].push(
            [Math.random(),Math.random(),Math.random()],
            [Math.random(),Math.random(),Math.random()],
            [Math.random(),Math.random(),Math.random()]
        )
    }

    return g
}
*/

function makeGeom(gridsize = 2) {
    if (gridsize < 2)
        gridsize = 2
    total = 0
    let square = 0
    console.log("Attempt to make gridsize: " + gridsize)
    g = {"triangles":
        []
    ,"attributes":
        [ // position
            []
        , // color
            []
        ]
    }

    let stepsize = (2/(gridsize - 1))

    // Create a square grid with gridsize vertices per side.
    for (let i = -1; i <= 1; i+= stepsize) {
        for (let j = -1; j <= 1; j+= stepsize) {

            let i1 = -1
            let i2 = -1
            let i3 = -1
            let i4 = -1
            for (let idx = 0; idx < g.attributes[0].length; idx++) {
                if (g.attributes[0][idx][0] === i && g.attributes[0][idx][2] === j) {
                    i1 = idx;
                    console.log(`i1 Found: [${i}, ${j}]`);
                }
                if (g.attributes[0][idx][0] === i + stepsize && g.attributes[0][idx][2] === j) {
                    i2 = idx;
                    console.log(`i2 Found: [${i + stepsize}, ${j}]`);
                }
                if (g.attributes[0][idx][0] === i + stepsize && g.attributes[0][idx][2] === j + stepsize) {
                    i3 = idx;
                    console.log(`i3 Found: [${i + stepsize}, ${j + stepsize}]`);
                }
                if (g.attributes[0][idx][0] === i && g.attributes[0][idx][2] === j + stepsize) {
                    i4 = idx;
                    console.log(`i4 Found: [${i}, ${j + stepsize}]`);
                }
            }
            
            if (i1 == -1) {
                i1 = g.attributes[0].length
                g.attributes[0].push([i, 0, j]);
                console.log(`No [${i}, ${j}]`)
            }
            if (i2 == -1) {
                i2 = g.attributes[0].length
                g.attributes[0].push([i + stepsize, 0, j]);
                console.log(`No [${i + stepsize}, ${j}]`)
            }
            if (i3 == -1) {
                i3 = g.attributes[0].length
                g.attributes[0].push([i + stepsize, 0, j + stepsize]);
                console.log(`No [${i + stepsize}, ${j + stepsize}]`)
            }
            if (i4 == -1) {
                i4 = g.attributes[0].length
                g.attributes[0].push([i, 0, j + stepsize]);
                console.log(`No [${i}, ${j + stepsize}]`)
            }

            g.attributes[1].push(
                [0,1,0]
            )
            g.attributes[1].push(
                [0,0,0]
            )
            g.attributes[1].push(
                [0,1,0]
            )
            g.attributes[1].push(
                [0,0,0]
            )

            g.triangles.push([i1, i2, i3]);
            g.triangles.push([i1, i4, i3]);
            total += 2
            square +=1
            console.log("Next cycle")
        }
    }

    console.log("perfect gridsize*gridsize: " + gridsize*gridsize)
    console.log("perfect (gridsize-1)*(gridsize-1)*2: " + (gridsize-1)*(gridsize-1)*2)
    
    console.log("Current # Vertices: " + g.attributes[0].length)
    console.log("Current (gridsize-1)*(gridsize-1)*2: " + total)
    console.log(g.attributes[0])
    console.log(g.triangles)
  
    // Create the geometry object.

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
    gl.clearColor(...IlliniBlue) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    gl.uniform4fv(program.uniforms.color, IlliniOrange)
    let m = m4rotX(seconds)
    let v = m4view([Math.cos(2),2,3], [0,0,0], [0,1,0])
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    
    gl.bindVertexArray(grid.vao)
    gl.uniformMatrix4fv(program.uniforms.mv, false, v)
    gl.drawElements(grid.mode, grid.count, grid.type, 0)
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