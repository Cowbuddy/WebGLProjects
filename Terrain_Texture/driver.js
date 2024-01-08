window.addEventListener('load', setup)

const White = new Float32Array([1, 1, 1, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
const textureCoordinates = [
    0.0, 0.0, // Bottom left
    1.0, 0.0, // Bottom right
    0.0, 1.0, // Top left
    1.0, 1.0  // Top right
];

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

    const vs_i = await fetch('vertex_shader_texture.glsl').then(res => res.text())
    const fs_i = await fetch('fragment_shader_texture.glsl').then(res => res.text())

    window.program_default = compile(vs,fs)
    window.program_image = compile(vs_i, fs_i)

    window.useShader = false;

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    fillScreen()
    window.addEventListener('resize', fillScreen)
    terrain = makeGeom()
    addNormals(terrain)
    window.grid = setupGeometry(terrain)

    document.querySelector('#material').addEventListener('change', event => {
        console.log(event.target.value)
        handleMaterialChange(event.target.value);
        addTextureCoords(terrain)
        window.grid = setupGeometry(terrain)
    });

    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2
        const faults = Number(document.querySelector('#faults').value) || 0
        const material = handleMaterialChange(document.querySelector('#material').value) || [1,1,1,0.3]
        terrain = makeGeom(gridsize, faults, material)
        addNormals(terrain)
        addTextureCoords(terrain)
        window.grid = setupGeometry(terrain)
    })

    requestAnimationFrame(tick)
    //tick(0) // <- ensure this function is called only once, at the end of setup
}

function handleMaterialChange(materialType) {
    var c_regex = /^#[0-9a-f]{8}$/i;
    var t_regex = /[.](jpg|png)$/;
    if (c_regex.test(materialType)) {
        window.useShader = false;

        var r = parseInt(materialType.substr(1, 2), 16) / 255;
        var g = parseInt(materialType.substr(3, 2), 16) / 255;
        var b = parseInt(materialType.substr(5, 2), 16) / 255;
        var a = parseInt(materialType.substr(7, 2), 16) / 255;

        modifyColor(terrain, [r, g, b, a]);

        return [r, g, b, a];
    } else if (t_regex.test(materialType)) {
        window.useShader = true;
        gl.useProgram(program_image)

        loadTexture(materialType);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program_image.uniforms.image, 0);
    } else {
        window.useShader = false;

        return [1,1,1,0.3]
    }
}

function makeGeom(gridsize = 50, faults = 50, color = [1, 1, 1, 0.3]) {
    if (gridsize < 2)
        gridsize = 2;

    if (faults < 0)
        faults = 0;

    let total = 0;
    let square = 0;

    const g = {
        "triangles": [],
        "attributes": [
            [], // position
            [],  // color
        ]
    };

    const step = 2 / (gridsize - 1); // Calculate step size to span from -1 to 1

    // Create a grid with vertices in the x-z plane
    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            const x = -1 + i * step; // Calculate x within [-1, 1]
            const z = -1 + j * step; // Calculate z within [-1, 1]

            g.attributes[0].push([x, 0, z]);
            g.attributes[1].push(color);

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
                    vertexPosition.y += smallIncrement;
                } else {
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

        for (let i = 0; i < g.attributes[0].length; i++) {
            const y = g.attributes[0][i][1];
            const normalizedY = ((y - 0.5 * (maxHeight + minHeight)) / (maxHeight - minHeight));
            g.attributes[0][i][1] = normalizedY;
        }

    }

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
    if (typeof grid !== 'undefined' && grid !== null && useShader == false) {
        gl.clearColor(...White) // f(...[1,2,3]) means f(1,2,3)
        //console.log("WHY")
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.useProgram(program_default)

        let v = m4mul(m4view([0,1,2], [0,0,0], [0,1,0]), m4rotY(seconds/2))
        gl.uniformMatrix4fv(program_default.uniforms.p, false, p)

        let ld = normalize([1,1,1])
        let h = normalize(add(ld, [0,0,1]))
        gl.uniform3fv(program_default.uniforms.lightdir, ld)
        gl.uniform3fv(program_default.uniforms.lightcolor, [1, 1, 1])
        gl.uniform3fv(program_default.uniforms.halfway, h)
    
    
        gl.bindVertexArray(grid.vao);
        gl.uniformMatrix4fv(program_default.uniforms.mv, false, v);
        gl.drawElements(grid.mode, grid.count, grid.type, 0);
    }

    if (typeof grid !== 'undefined' && grid !== null && useShader == true) {
        gl.clearColor(...White) // f(...[1,2,3]) means f(1,2,3)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        let v = m4mul(m4view([0,1,2], [0,0,0], [0,1,0]), m4rotY(seconds/2))
        gl.uniformMatrix4fv(program_image.uniforms.p, false, p)

        let ld = normalize([1,1,1])
        gl.uniform3fv(program_image.uniforms.lightdir, ld)
        gl.uniform3fv(program_image.uniforms.lightcolor, [1, 1, 1])

        gl.bindVertexArray(grid.vao);
        gl.uniformMatrix4fv(program_image.uniforms.mv, false, v);
        gl.drawElements(grid.mode, grid.count, grid.type, 0);
    }
    
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

function addTextureCoords(geom) {
    // Texture Coordinates Index
    let ti = geom.attributes.length;
    geom.attributes.push([]); // Add a new array for texture coordinates

    // Calculate texture coordinates
    // This example assumes a grid or plane mapped from -1 to 1 on the x and z axes
    for (let i = 0; i < geom.attributes[0].length; i++) {
        let vertex = geom.attributes[0][i];
        // Normalize vertex positions to [0, 1] for texture coordinates
        let u = (vertex[0] + 1) / 2; // Assuming x position is between -1 and 1
        let v = (vertex[2] + 1) / 2; // Assuming z position is between -1 and 1
        geom.attributes[ti].push([u, v]);
    }
}


function loadTexture(filename){
	// Create a texture.
	texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
 
	// Fill the texture with a 1x1 blue pixel.
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([1, 0, 1, 0]));
 
	// Asynchronously load an image
	// If image load unsuccessful, it will be a blue surface
	var image = new Image();
	image.src = filename;
	image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.onerror = function() {
        console.error("Error loading texture image: " + filename);
    }
}

function modifyColor(geom, newColor) {
    const colorAttributeIndex = 1; // Assuming the second attribute is for color
    geom.attributes[colorAttributeIndex] = geom.attributes[colorAttributeIndex].map(() => newColor);
}

