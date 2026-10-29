// Irisé HOLOSENE — même définition que iridescent.css (angles mathématiques : 0 = droite, sens antihoraire).
// iris(uv) : couleur irisée autour du centre (uv dans [-1, 1]) ; irisCore(r) : cœur lumineux de la version claire.

vec3 irisStop(float a) {
  // a : angle en degrés [0, 360)
  const vec3 MINT  = vec3(0.596, 0.886, 0.706); // #98E2B4  0°
  const vec3 BLUE  = vec3(0.600, 0.757, 0.867); // #99C1DD  45°
  const vec3 MAUVE = vec3(0.855, 0.608, 0.761); // #DA9BC2  90°
  const vec3 ROSE  = vec3(0.996, 0.604, 0.835); // #FE9AD5  135°
  const vec3 PINK  = vec3(1.000, 0.592, 0.941); // #FF97F0  180°
  const vec3 ROSE2 = vec3(0.976, 0.616, 0.816); // #F99DD0  225°
  const vec3 MAUV2 = vec3(0.851, 0.612, 0.765); // #D99CC3  270°
  const vec3 BLUE2 = vec3(0.608, 0.757, 0.871); // #9BC1DE  315°
  float s = a / 45.0;
  float t = fract(s);
  int i = int(floor(s));
  vec3 c0 = MINT, c1 = BLUE;
  if (i == 1) { c0 = BLUE;  c1 = MAUVE; }
  else if (i == 2) { c0 = MAUVE; c1 = ROSE; }
  else if (i == 3) { c0 = ROSE;  c1 = PINK; }
  else if (i == 4) { c0 = PINK;  c1 = ROSE2; }
  else if (i == 5) { c0 = ROSE2; c1 = MAUV2; }
  else if (i == 6) { c0 = MAUV2; c1 = BLUE2; }
  else if (i >= 7) { c0 = BLUE2; c1 = MINT; }
  return mix(c0, c1, t);
}

vec3 iris(vec2 uv) {
  float a = degrees(atan(uv.y, uv.x));
  if (a < 0.0) a += 360.0;
  return irisStop(a);
}

// cœur blanc : r = distance au centre normalisée par le rayon intérieur du « o »
float irisCore(float r) {
  return 1.0 - smoothstep(0.38, 0.8, r);
}
