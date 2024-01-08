#version 300 es
precision highp float;

uniform float time;

layout(location=0) in vec4 position; // Position attribute

void main() {
    // Calculate the circular motion
    float radius = 0.03; // Adjust the radius as needed
    float angle = time * 20.5; // Use time for rotation

    // Calculate new position in a circle
    float x = radius * cos(angle + float(gl_VertexID + 1));
    float y = radius * sin(angle + float(gl_VertexID + 1));

    // Apply the circular motion to the vertex position
    vec4 newPosition = vec4(x, y, 0.0 , 1) + position;

    gl_Position = newPosition;
}
