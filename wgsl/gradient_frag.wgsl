struct FragmentInput {
    @location($i) texcoord: vec2f,
};


@group(0) @binding($b) var source: texture_2d<f32>;
@group(0) @binding($b) var sourceSampler: sampler;

fn linstep(low: f32, high: f32, value: f32) -> f32 {
    return clamp((value - low) / (high - low), 0.0, 1.0);
}

fn fade(low: f32, high: f32, value: f32) -> f32 {
    let mid = (low + high) * 0.5;
    let range = (high - low) * 0.5;
    let x = 1.0 - clamp(abs(mid - value) / range, 0.0, 1.0);
    return smoothstep(0.0, 1.0, x);
}

fn getColor(intensity: f32) -> vec3f {
    let blue = vec3f(0.0, 0.0, 1.0);
    let cyan = vec3f(0.0, 1.0, 1.0);
    let green = vec3f(0.0, 1.0, 0.0);
    let yellow = vec3f(1.0, 1.0, 0.0);
    let red = vec3f(1.0, 0.0, 0.0);

    let color = (
        fade(-0.25, 0.25, intensity) * blue +
        fade(0.0, 0.5, intensity) * cyan +
        fade(0.25, 0.75, intensity) * green +
        fade(0.5, 1.0, intensity) * yellow +
        smoothstep(0.75, 1.0, intensity) * red
    );
    return color;
}

fn alphaFun(color: vec3f, intensity: f32) -> vec4f {
    let alpha = smoothstep(0.00000000, 1.00000000, intensity);
    return vec4f(color * alpha, alpha);
}

@fragment
fn main(fragmentInput: FragmentInput) -> @location(0) vec4f {
    let value = textureSample(source, sourceSampler, fragmentInput.texcoord);
    let intensity = smoothstep(0.0, 1.0, value.r);
    let color = getColor(intensity);
    let fragColor = alphaFun(color, intensity);
    return fragColor;
}
