#version 300 es
precision highp float;
uniform sampler2D image;
uniform vec3 lightdir;
uniform vec3 lightcolor;
in vec2 vTexCoord;
in vec3 vnormal; 
out vec4 color;

void main() {
    vec3 n = normalize(vnormal);
    vec4 texColor = texture(image, vTexCoord);
    float lambert = max(dot(n, lightdir), 0.0);
    vec3 diffuse = texColor.rgb * (lightcolor * lambert);
    color = vec4(diffuse, 1);
}
