struct FragmentInput {
    @location($i) off: vec2f,
    @location($i) dim: vec2f,
    @location($i) vIntensity: f32,
};

@fragment
fn main(fragmentInput: FragmentInput) -> @location(0) vec4f {
    let falloff = 1.0 - smoothstep(0.0, 1.0, length(fragmentInput.off / fragmentInput.dim));
    let intensity = falloff * fragmentInput.vIntensity;
    return vec4f(intensity, intensity, intensity, intensity);
}
