#version 300 es
precision highp float;

#define EPS         0.001
#define N_MAX_STEPS 80
#define MAX_DIST    100.0
#define PI 3.141592
#define DEG2RAD 0.01745329251

#define iterations 15   
#define formuparam 0.53
#define volsteps 10
#define stepsize 0.1
#define tile   0.850
#define speed  0.010 
#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dt;
uniform vec2 u_mouse;
uniform float u_zoom;
uniform int u_starMode;
uniform bool u_orbit;


uniform sampler2D u_texture_earth;   // Texture de la Terre
uniform sampler2D u_texture_mars;    // Texture de Mars
uniform sampler2D u_texture_jupiter; // Texture de Jupiter
uniform sampler2D u_texture_mercury; // Texture de Mercure
uniform sampler2D u_texture_neptune; // Texture de Neptune
uniform sampler2D u_texture_saturn;  // Texture de Saturn
uniform sampler2D u_texture_uranus;  // Texture de Uranus
uniform sampler2D u_texture_venus;   // Texture de Venus
uniform sampler2D u_texture_sun;     // Texture du Soleil
uniform sampler2D u_texture_stars;   // Texture des Etoiles

in vec2 f_uv;
out vec4 outColor;


vec3 starNest(vec3 ro, vec3 rd) {
    float time = u_time * speed + 0.25;
    vec3 v = vec3(0.0);
    float s = 0.1, fade = 1.0;

    for (int r = 0; r < volsteps; r++) {
        vec3 p = ro + s * rd * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.))); // tiling fold
        float pa, a = pa = 0.0;

        for (int i = 0; i < iterations; i++) {
            p = abs(p) / dot(p, p) - formuparam; // the magic formula
            a += abs(length(p) - pa);
            pa = length(p);
        }

        float dm = max(0.0, darkmatter - a * a * 0.001);
        a *= a * a;
        if (r > 6) fade *= 1.0 - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade; // coloring based on distance
        fade *= distfading;
        s += stepsize;
    }

    return mix(vec3(length(v)), v, saturation) * 0.01; // color adjust
}
vec3 color(float i,vec2 uv){

    vec3 col =vec3(0.);
    if (i == 0.) {
        col = texture(u_texture_sun, uv).rgb; // Soleil
    } else if (i == 1.) {
        col = texture(u_texture_mercury, uv).rgb; // Mercure
    } else if (i == 2.) {
        col = texture(u_texture_venus, uv).rgb; // Venus
    } else if (i == 3.){
        col = texture(u_texture_earth, uv).rgb; // Terre 
    } else if (i == 4.) {
        col = texture(u_texture_mars, uv).rgb;  // Mars
    } else if (i == 5.){
        col = texture(u_texture_jupiter, uv).rgb; // Jupiter
    } else if (i == 6.) {
        col = texture(u_texture_saturn, uv).rgb; // Saturne
    } else if (i == 7.){
        col = texture(u_texture_uranus, uv).rgb; // Uranus
    } else if (i == 8.){
        col = texture(u_texture_neptune, uv).rgb;  // Neptune
    }
    return col;
}
mat2 rot2D(float a) {
    return mat2(cos(a), sin(a),-sin(a), cos(a));
}
vec2 sdf_tore(vec3 p, float rMajor, float rMinor,float i) {
    vec2 q = vec2(length(p.xz) - rMajor, p.y);
    return vec2(i,length(q) - rMinor);
}
vec2 sdf_sphere(vec3 p, float r,float i) {
    return vec2(i,length(p) - r);
}
vec2 minvec2(vec2 a,vec2  b){
    return a.y<b.y ? a:b;
}
mat3 rot3D(float ax, float ay, float az) {
    float cx = cos(ax), sx = sin(ax);
    float cy = cos(ay), sy = sin(ay);
    float cz = cos(az), sz = sin(az);

    return mat3(
        cy * cz, cy * sz, -sy,
        sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy,
        cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy
    );
}
mat3 rot3DX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}
vec2 sdf_scene(vec3 p) {
    vec3 sunpos = vec3( 0.0, 0.0, 0.0);
    vec2 sun = sdf_sphere(p - sunpos, 1.5*.1,0.); 

    float inclination_mercury = u_orbit == false ? 7.0 * DEG2RAD : 90.0 * DEG2RAD; 
    float inclination_venus = u_orbit == false ? 6.4 * DEG2RAD : 82.0 * DEG2RAD;
    float inclination_earth  = u_orbit == false ? 0.0 : 0.0 * DEG2RAD; 
    float inclination_mars  = u_orbit == false ? 2.85 * DEG2RAD : 36.0 * DEG2RAD;
    float inclination_jupiter  = u_orbit == false ? 2.3 * DEG2RAD : 29.0 * DEG2RAD;
    float inclination_saturn  = u_orbit == false ? 4.5 * DEG2RAD : 57.0 * DEG2RAD;
    float inclination_uranus  = u_orbit == false ? 0.8 * DEG2RAD : 10.0 * DEG2RAD;
    float inclination_neptune  = u_orbit == false ? 2.8 * DEG2RAD : 36.0 * DEG2RAD;

    // Mercure
    float a_mercury = .75; // Demi-grand axe (distance moyenne au Soleil)
    float e_mercury = 0.2056; // Excentricité de l'orbite de Mercure
    float b_mercury = a_mercury * sqrt(1.0 - e_mercury * e_mercury); // Demi-petit axe
    float M_mercury = mod(u_time * 1.607, 6.283185); // Anomalie moyenne (u_time*1.607 ajuste la vitesse pour Mercure)
    float E_mercury = M_mercury + e_mercury * sin(M_mercury) * (1.0 + e_mercury * cos(M_mercury)); // Anomalie excentrique (approximation)
    float x_mercury = a_mercury * (cos(E_mercury) - e_mercury); // Coordonnée x de l'orbite elliptique
    float y_mercury = b_mercury * sin(E_mercury); // Coordonnée y de l'orbite elliptique
    vec3 mercurepos = vec3(x_mercury, 0.0, y_mercury);
    mercurepos = rot3D(inclination_mercury, 0.0, 0.0) * mercurepos;
    vec2 mercure = sdf_sphere(p - mercurepos, .4*.1,1.);

    //Vénus
    float a_venus = 1.; // Demi-grand axe (distance moyenne au Soleil)
    float e_venus = 0.0067; // Excentricité de l'orbite de Vénus (très proche d'un cercle)
    float b_venus = a_venus * sqrt(1.0 - e_venus * e_venus); // Demi-petit axe
    float M_venus = mod(u_time * 0.615, 6.283185); // Anomalie moyenne (u_time*0.615 ajuste la vitesse de Vénus)
    float E_venus = M_venus + e_venus * sin(M_venus) * (1.0 + e_venus * cos(M_venus)); // Anomalie excentrique (approximation)
    float x_venus = a_venus * (cos(E_venus) - e_venus); // Coordonnée x de l'orbite elliptique
    float y_venus = b_venus * sin(E_venus); // Coordonnée y de l'orbite elliptique
    vec3 venuspos = vec3(x_venus, 0.0, y_venus);
    venuspos = rot3D(inclination_venus, 0.0, 0.0) * venuspos;
    vec2 venus = sdf_sphere(p - venuspos, .55*.1,2.);

    //Terre
    float a = 1.25; // Demi-grand axe (distance moyenne au Soleil)
    float e = 0.0167; // Excentricité de l'orbite terrestre
    float b = a * sqrt(1.0 - e * e); // Demi-petit axe
    float M = mod(u_time * 0.5, 6.283185); // Anomalie moyenne (u_time*0.5 ajuste la vitesse pour être plus réaliste)
    float E = M + e * sin(M) * (1.0 + e * cos(M)); // Anomalie excentrique (approximation)
    float x = a * (cos(E) - e); // Coordonnée x de l'orbite elliptique
    float y = b * sin(E); // Coordonnée y de l'orbite elliptique
    vec3 earthpos = vec3(x, 0.0, y);
    earthpos = rot3D(inclination_earth, 0.0, 0.0) * earthpos;
    vec2 earth = sdf_sphere(p - earthpos, .8*.1,3.);

    // Mars
    float a_mars = 1.5; // Demi-grand axe (distance moyenne au Soleil)
    float e_mars = 0.0934; // Excentricité de l'orbite de Mars
    float b_mars = a_mars * sqrt(1.0 - e_mars * e_mars); // Demi-petit axe
    float M_mars = mod(u_time * 0.532, 6.283185); // Anomalie moyenne (u_time*0.532 ajuste la vitesse de Mars)
    float E_mars = M_mars + e_mars * sin(M_mars) * (1.0 + e_mars * cos(M_mars)); // Anomalie excentrique (approximation)
    float x_mars = a_mars * (cos(E_mars) - e_mars); // Coordonnée x de l'orbite elliptique
    float y_mars = b_mars * sin(E_mars); // Coordonnée y de l'orbite elliptique
    vec3 marspos = vec3(x_mars, 0.0, y_mars);
    marspos = rot3D(inclination_mars, 0.0, 0.0) * marspos;
    vec2 mars = sdf_sphere(p - marspos, .4*.1,4.);
    
    // Jupiter
    float a_jupiter = 1.75; // Demi-grand axe (distance moyenne au Soleil)
    float e_jupiter = 0.0489; // Excentricité de l'orbite de Jupiter
    float b_jupiter = a_jupiter * sqrt(1.0 - e_jupiter * e_jupiter); // Demi-petit axe
    float M_jupiter = mod(u_time * 0.0843, 6.283185); // Anomalie moyenne (u_time*0.0843 ajuste la vitesse de Jupiter)
    float E_jupiter = M_jupiter + e_jupiter * sin(M_jupiter) * (1.0 + e_jupiter * cos(M_jupiter)); // Anomalie excentrique (approximation)
    float x_jupiter = a_jupiter * (cos(E_jupiter) - e_jupiter); // Coordonnée x de l'orbite elliptique
    float y_jupiter = b_jupiter * sin(E_jupiter); // Coordonnée y de l'orbite elliptique
    vec3 jupiterpos = vec3(x_jupiter, 0.0, y_jupiter);
    jupiterpos = rot3D(inclination_jupiter, 0.0, 0.0) * jupiterpos;
    vec2 jupiter = sdf_sphere(p - jupiterpos, 1.*.1,5.);

    // Saturne
    float a_saturne = 2.; // Demi-grand axe (distance moyenne au Soleil)
    float e_saturne = 0.0565; // Excentricité de l'orbite de Saturne
    float b_saturne = a_saturne * sqrt(1.0 - e_saturne * e_saturne); // Demi-petit axe
    float M_saturne = mod(u_time * 0.0339, 6.283185); // Anomalie moyenne (u_time*0.0339 ajuste la vitesse de Saturne)
    float E_saturne = M_saturne + e_saturne * sin(M_saturne) * (1.0 + e_saturne * cos(M_saturne)); // Anomalie excentrique (approximation)
    float x_saturne = a_saturne * (cos(E_saturne) - e_saturne); // Coordonnée x de l'orbite elliptique
    float y_saturne = b_saturne * sin(E_saturne); // Coordonnée y de l'orbite elliptique
    vec3 saturnepos = vec3(x_saturne, 0.0, y_saturne);
    saturnepos = rot3D(inclination_saturn, 0.0, 0.0) * saturnepos;
    vec2 saturne = sdf_sphere(p - saturnepos, .65*.1,6.);

    float rMajor1 = 0.2; // Rayon majeur (distance du centre de Saturne aux anneaux)
    float epaisseur = .65*.01; // Rayon mineur (épaisseur des anneaux)
    vec2 anneaux_saturne1 = sdf_tore(p - saturnepos, rMajor1, epaisseur,6.);
    float rMajor2 = 0.18; // Rayon majeur (distance du centre de Saturne aux anneaux)
    vec2 anneaux_saturne2 = sdf_tore(p - saturnepos, rMajor2, epaisseur,6.);
    
    //Uranus
    float a_uranus = 2.25; // Demi-grand axe (distance moyenne au Soleil)
    float e_uranus = 0.046; // Excentricité de l'orbite d'Uranus
    float b_uranus = a_uranus * sqrt(1.0 - e_uranus * e_uranus); // Demi-petit axe
    float M_uranus = mod(u_time * 0.0119, 6.283185); // Anomalie moyenne (u_time*0.0119 ajuste la vitesse d'Uranus)
    float E_uranus = M_uranus + e_uranus * sin(M_uranus) * (1.0 + e_uranus * cos(M_uranus)); // Anomalie excentrique (approximation)
    float x_uranus = a_uranus * (cos(E_uranus) - e_uranus); // Coordonnée x de l'orbite elliptique
    float y_uranus = b_uranus * sin(E_uranus); // Coordonnée y de l'orbite elliptique
    vec3 uranuspos = vec3(x_uranus, 0.0, y_uranus);
    uranuspos = rot3D(inclination_uranus, 0.0, 0.0) * uranuspos;
    vec2 uranus = sdf_sphere(p - uranuspos, .4*.1,7.);

    //Neptune
    float a_neptune = 2.5; // Demi-grand axe (distance moyenne au Soleil)
    float e_neptune = 0.009; // Excentricité de l'orbite de Neptune
    float b_neptune = a_neptune * sqrt(1.0 - e_neptune * e_neptune); // Demi-petit axe
    float M_neptune = mod(u_time * 0.0061, 6.283185); // Anomalie moyenne (u_time*0.0061 ajuste la vitesse de Neptune)
    float E_neptune = M_neptune + e_neptune * sin(M_neptune) * (1.0 + e_neptune * cos(M_neptune)); // Anomalie excentrique (approximation)
    float x_neptune = a_neptune * (cos(E_neptune) - e_neptune); // Coordonnée x de l'orbite elliptique
    float y_neptune = b_neptune * sin(E_neptune); // Coordonnée y de l'orbite elliptique
    vec3 neptunepos = vec3(x_neptune, 0.0, y_neptune);
    neptunepos = rot3D(inclination_neptune, 0.0, 0.0) * neptunepos;
    vec2 neptune = sdf_sphere(p - neptunepos, .4*.1,8.);

    return minvec2(anneaux_saturne2,minvec2(anneaux_saturne1,minvec2(neptune,minvec2(uranus,minvec2(saturne,minvec2(jupiter,minvec2(mars,minvec2(earth,minvec2(venus,minvec2(sun,mercure)))))))))); 
}
vec2 ray_march(vec3 ro, vec3 rd) {
    vec2 s = vec2(0);
    float d=0.0;
    for (int i = 0; i < N_MAX_STEPS; i++) {
        vec3 p = ro + rd * d;
        s = sdf_scene(p);
        d += s.y;
        if (s.y < EPS || d > MAX_DIST) break;
    }
    s.y=d;
    return s;
}
vec3 approx_normal(vec3 p) {
    float dp=sdf_scene(p).y;
    vec2 eps=vec2(EPS,-EPS);
    float dX=sdf_scene(p+eps.xyy).y-dp;
    float dY=sdf_scene(p+eps.yxy).y-dp;
    float dZ=sdf_scene(p+eps.yyx).y-dp;
    return normalize(vec3(dX,dY,dZ));
}
float lighting(vec3 p,vec3 n){
    vec3 lp=vec3(cos(u_time)*2.0,2,sin(u_time)*2.0);
    vec3 ld=lp-p;
    vec3 ln=normalize(ld);
    if(ray_march(p+n*0.01,ln).y<length(ld))return 0.0;
    return max(0.0,dot(n,ln));
}
void main() {
    vec2 uv = (f_uv * 2.0 - 1.0) * u_resolution / u_resolution.y;
    uv*=u_zoom;
    
    vec3 ro = vec3(0.0, 0.0, -1.0);
    vec3 rd = normalize(vec3(uv, 1.0)); 

    ro.yz*=rot2D(-u_mouse.y*3.14);
    rd.yz*=rot2D(-u_mouse.y*3.14);

    ro.xz*=rot2D(-u_mouse.x*3.14);
    rd.xz*=rot2D(-u_mouse.x*3.14);

    
    vec3 starColor = u_starMode == 0 ? texture(u_texture_stars, f_uv).rgb : starNest(ro, rd);
    vec3 col = starColor;

    vec2 t = ray_march(ro, rd);

    if (t.y <= MAX_DIST) {
        vec3 p = ro + rd * t.y;
        vec3 n = approx_normal(p);
        vec2 uv_planet = vec2(atan(n.z, n.x) / (2.0 * PI) + 0.5, asin(n.y) / PI + 0.5);
        col = color(t.x, uv_planet); // Utilisation de la texture pour la planète
    }
    col = pow(col, vec3(0.4545));
    outColor = vec4(col, 1.0);
}
