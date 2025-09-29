attribute vec2 aPosition;
attribute vec2 aOffset;
attribute float aIntensity;

varying vec2 off, dim;
varying float vIntensity;

uniform mat4 projViewModelMatrix;
uniform float zoomScale;
void main() {
    off = aOffset;
    dim = abs(off);
    vec2 pos = aPosition.xy + zoomScale * off;
    vIntensity = aIntensity / 255.0;
    gl_Position = projViewModelMatrix * vec4(pos, 0.0, 1.0);
}
