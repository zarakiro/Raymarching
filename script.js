// Asynchronously reads a shader source from a given HTML element ID.
async function readShader(id) {
  const req = await fetch(document.getElementById(id).src);
  return await req.text(); // Returns the shader source code as text
}

// Creates and compiles a WebGL shader
function createShader(gl, type, src) {
  let shader = gl.createShader(type); // Create a shader object based on the specified type
  gl.shaderSource(shader, src); // Attach the shader source code
  gl.compileShader(shader); // Compile the shader

  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader; // Return shader if compilation is successful

  console.error("Could not compile WebGL Shader", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader); // Clean up on failure
}

// Links two shaders into a program (vertex and fragment shaders)
function createProgram(gl, vertShader, fragShader) {
  let program = gl.createProgram();
  gl.attachShader(program, vertShader); // Attach vertex shader
  gl.attachShader(program, fragShader); // Attach fragment shader
  gl.linkProgram(program); // Link shaders into a complete program

  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program; // Return program if linking is successful

  console.error("Could not Link WebGL Program", gl.getProgramInfoLog(program));
  gl.deleteProgram(program); // Clean up on failure
}

// Loads a texture from a specified URL, sets a default pixel until the image loads
function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Placeholder image (1x1 white pixel) used until the real image loads
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([255, 255, 255, 255]); // Default to white pixel
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

  // Load the actual image
  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

    // Generate mips for better down-scaling quality
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  image.src = url;

  return texture;
}

// Main function to initialize and start the WebGL application
async function main() {
  const fps = document.getElementById("fps"); // Element to display FPS

  const time = {
    current_t: Date.now(),
    dts: [1 / 60], // Array to store frame deltas
    t: 0,

    dt: () => time.dts[0],
    update: () => {
      const new_t = Date.now();
      time.dts = [(new_t - time.current_t) / 1_000, ...time.dts].slice(0, 10); // Keep last 10 frame times
      time.t += time.dt();
      time.current_t = new_t;

      // Calculate average delta for FPS
      const dt = time.dts.reduce((a, dt) => a + dt, 0) / time.dts.length;
      fps.innerHTML = `${Math.round(1 / dt, 2)}`;
    },
  };

  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl2"); // Initialize WebGL 2.0 context
  if (!gl) alert("Could not initialize WebGL Context.");

  // Load textures for each celestial body
  const earthTexture = loadTexture(gl, "textures/earth_texture.jpg");
  const marsTexture = loadTexture(gl, "textures/mars_texture.jpg");
  const mercureTexture = loadTexture(gl, "textures/mercury_texture.jpg");
  const jupiterTexture = loadTexture(gl, "textures/jupiter_texture.jpg");
  const neptuneTexture = loadTexture(gl, "textures/neptune_texture.jpg");
  const uranusTexture = loadTexture(gl, "textures/uranus_texture.jpg");
  const venusTexture = loadTexture(gl, "textures/venus_texture.jpg");
  const saturnTexture = loadTexture(gl, "textures/saturn_texture.jpg");
  const sunTexture = loadTexture(gl, "textures/sun_texture.jpg");
  const starsTexture = loadTexture(gl, "textures/stars_texture.jpg");

  // Mouse object to track cursor position
  const mouse = { x: 0, y: 0 };
  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) / canvas.width;
    mouse.y = (event.clientY - rect.top) / canvas.height;
  });

  // Zoom functionality
  let zoomLevel = 1.0;
  canvas.addEventListener("wheel", (event) => {
    const delta = event.deltaY * -0.001; // Adjust zoom sensitivity
    zoomLevel = Math.min(Math.max(0.1, zoomLevel + delta), 5.0); // Limit zoom between 0.1x and 5x
  });

  // Background modes for stars
  let starMode = 0;
  document.getElementById('simpleBackground').addEventListener('click', () => {
    starMode = 0;
    gl.uniform1i(gl.getUniformLocation(program, 'u_starMode'), starMode);
  });
  document.getElementById('realisticBackground').addEventListener('click', () => {
    starMode = 1;
    gl.uniform1i(gl.getUniformLocation(program, 'u_starMode'), starMode);
  });

  // Orbit mode toggle
  let orbitMode = false;
  document.getElementById('OrbitButton').addEventListener('click', () => {
    orbitMode = !orbitMode;
    gl.uniform1i(gl.getUniformLocation(program, 'u_orbit'), orbitMode);
  });

  // Reset view and zoom to initial state
  const initialMouseX = 0.0;
  const initialMouseY = 0.0;
  const initialZoom = 1.0;
  function resetView() {
    mouse.x = initialMouseX;
    mouse.y = initialMouseY;
    zoomLevel = initialZoom;
  }
  document.getElementById("resetViewButton").addEventListener("click", resetView);

  // Load shaders
  const vertShader = createShader(gl, gl.VERTEX_SHADER, await readShader("vert"));
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, await readShader("frag"));
  const program = createProgram(gl, vertShader, fragShader);

  // Set up attribute and uniform locations
  const a_position = gl.getAttribLocation(program, "a_position");
  const a_uv = gl.getAttribLocation(program, "a_uv");

  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_dt = gl.getUniformLocation(program, "u_dt");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");
  const u_zoom = gl.getUniformLocation(program, "u_zoom");
  const u_starModeLocation = gl.getUniformLocation(program, 'u_starMode');

  const u_texture_earth = gl.getUniformLocation(program, "u_texture_earth");
  const u_texture_mars = gl.getUniformLocation(program, "u_texture_mars");
  const u_texture_jupiter = gl.getUniformLocation(program, "u_texture_jupiter");
  const u_texture_mercury = gl.getUniformLocation(program, "u_texture_mercury");
  const u_texture_neptune = gl.getUniformLocation(program, "u_texture_neptune");
  const u_texture_saturn = gl.getUniformLocation(program, "u_texture_saturn");
  const u_texture_uranus = gl.getUniformLocation(program, "u_texture_uranus");
  const u_texture_venus = gl.getUniformLocation(program, "u_texture_venus");
  const u_texture_sun = gl.getUniformLocation(program, "u_texture_sun");
  const u_texture_stars = gl.getUniformLocation(program, "u_texture_stars");

  // Vertex data for a quad
  const data = new Float32Array([
    -1.0, -1.0, 0.0, 0.0,
    1.0, -1.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 1.0,
    -1.0, 1.0, 0.0, 1.0,
  ]);

  // Index data to draw two triangles forming a quad
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  // Set up vertex array and buffers
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 4 * 4, 0);
  gl.enableVertexAttribArray(a_uv);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // Main render loop
  function loop() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.useProgram(program);

    // Update uniforms
    gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(u_time, time.t);
    gl.uniform1f(u_dt, time.dt());
    gl.uniform2f(u_mouse, mouse.x, mouse.y);
    gl.uniform1f(u_zoom, zoomLevel);
    gl.uniform1i(u_starModeLocation, starMode);

    // Bind textures for each celestial object
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    gl.uniform1i(u_texture_earth, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, marsTexture);
    gl.uniform1i(u_texture_mars, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, jupiterTexture);
    gl.uniform1i(u_texture_jupiter, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mercureTexture);
    gl.uniform1i(u_texture_mercury, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, neptuneTexture);
    gl.uniform1i(u_texture_neptune, 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, saturnTexture);
    gl.uniform1i(u_texture_saturn, 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, uranusTexture);
    gl.uniform1i(u_texture_uranus, 6);

    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, venusTexture);
    gl.uniform1i(u_texture_venus, 7);

    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, sunTexture);
    gl.uniform1i(u_texture_sun, 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, starsTexture);
    gl.uniform1i(u_texture_stars, 9);

    // Draw the scene
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    time.update();
    requestAnimationFrame(loop); // Repeat the loop
  }
  requestAnimationFrame(loop); // Start the render loop
}

main(); // Run the main function
