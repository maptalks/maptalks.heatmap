precision highp int;
precision highp float;
varying vec2 off, dim;
varying float vIntensity;
void main() {
    float falloff = (1.0 - smoothstep(0.0, 1.0, length(off / dim)));
    float intensity = falloff * vIntensity;
    gl_FragColor = vec4(intensity);
}
