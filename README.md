# WebGL Projects

These projects include the cumulative experience of all the shader programming I've done with WebGL.
This includes creating and modifying fragment and vertex glsl files, and creating a simple webpage to display.

The following projects are:

Cliffs - A modification of Terrain that gives different colors and reflection levels dependent on whether the slope is steep or shallow.

Flight - A modification of Terrain that allows the indiviudal to move the camera around using the WASD and arrow keys. (Still WIP, rotating with arrow keys is a bit off)

Lineograph - Allows user to move an octahedron around in a 3D space using the WASD keys to move up,left,down,right, and E and Q to move forward and backward.

Orbits - A simple display of objects moving about each other at fixed and uniform speeds.

Rasterizer - Emulates some WebGL features using Python and the Pillow Library, and simple commands in a text file. Example files and images produced are in the test folder in Rasterizer.

SimpleTexture - Simply adds an image as a texture using vertex and fragment shaders instead

Terrain - Allows the User to generate as many different types of terrains given the number of faults and the number of squares in gridsize.

Terrain_texture - A modification of Terrain that also allows the ability to change the color of the terrain or replace with a texture. To use either put hex color value and alpha (Ex: #FF308000), or add an image to folder and put filename (Ex: testgrid.png). Should regenerate the Terrain with that color/texture.

UIUC Logo CPU - Render a UIUC Logo that very slowly self destructs with transformations movements to traingle verticies using only the CPU.

UIUC Logo GPU (WIP) - Render a UIUC Logo that very slowly self destructs with transformations movements to traingle verticies using only the GPU. (Does not use GPU right now)

UIUC Logo Transformations - Showcases a UIUC Logo that moves up left and bottom right while also increasing and decreasing in size.


## Table of Contents

- [Installation](#installation)

## Installation

1. Clone to your project directory
```bash
git clone https://github.com/Cowbuddy/WebGLProjects.git
```
2. Ideally, have VSCode with a simple extension such as Live Server to easily view the projects in action. Usually clicking the index.html leads to a CORS error (Working on fix to resolve this)

3. For Rasterizer, all required libraries can be found within the `requirements.txt`. Install the required libraries by running the following command from the project's root directory:

Linux/MacOS:
```bash
python3 -m venv env
source env/bin/activate
```

Windows:
```bash
python3 -m venv env
env\Scripts\activate
```

```bash
pip install -r requirements.txt
```

To deactivate environment:
Linux/MacOS:
```bash
deactivate
```

By following these installation steps, you will have the project set up with the required dependencies and be ready to work with all the WebGL Projects!
