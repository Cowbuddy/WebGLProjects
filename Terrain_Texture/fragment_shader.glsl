#version 300 es
precision highp float;
uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;
in vec4 vColor;
in vec3 vnormal;

void main() {
    vec3 n = normalize(vnormal);
    float lambert = (1.0 - vColor.a) * max(dot(n, lightdir), 0.0);
    float blinn = 3.0 * vColor.a * pow(max(dot(n, halfway), 0.0), 150.0);
    fragColor = vec4(vColor.rgb * (lightcolor * lambert) + vec3(1,1,1) * blinn * 2.0, 1);
}