// AUTO-GÉNÉRÉ depuis Figma. Roue irisée du « o » (version finale).
// p = position fragment relative au centre, en pixels, y vers le BAS (convention écran).
const int IRIS_N = 12;
vec3 irisColor(vec2 p){
  float deg = degrees(atan(p.y, p.x)) + 90.0 - 180.0;
  float t = fract(deg / 360.0);
  vec3 c = vec3(0.0);
  if (t >= 0.0000 && t <= 0.0400) c = mix(vec3(0.3176,0.9059,0.5569), vec3(0.2510,0.8549,0.8314), (t - 0.0000) / 0.0400);
  if (t >= 0.0400 && t <= 0.1300) c = mix(vec3(0.2510,0.8549,0.8314), vec3(0.2392,0.5725,0.9843), (t - 0.0400) / 0.0900);
  if (t >= 0.1300 && t <= 0.2500) c = mix(vec3(0.2392,0.5725,0.9843), vec3(0.3529,0.3569,0.9843), (t - 0.1300) / 0.1200);
  if (t >= 0.2500 && t <= 0.3700) c = mix(vec3(0.3529,0.3569,0.9843), vec3(0.7020,0.2000,0.9490), (t - 0.2500) / 0.1200);
  if (t >= 0.3700 && t <= 0.5000) c = mix(vec3(0.7020,0.2000,0.9490), vec3(0.9569,0.1765,0.6157), (t - 0.3700) / 0.1300);
  if (t >= 0.5000 && t <= 0.6300) c = mix(vec3(0.9569,0.1765,0.6157), vec3(0.9451,0.1490,0.8706), (t - 0.5000) / 0.1300);
  if (t >= 0.6300 && t <= 0.7500) c = mix(vec3(0.9451,0.1490,0.8706), vec3(0.8863,0.1647,0.9725), (t - 0.6300) / 0.1200);
  if (t >= 0.7500 && t <= 0.8400) c = mix(vec3(0.8863,0.1647,0.9725), vec3(0.9608,0.8196,0.2784), (t - 0.7500) / 0.0900);
  if (t >= 0.8400 && t <= 0.9100) c = mix(vec3(0.9608,0.8196,0.2784), vec3(0.5765,0.9412,0.3882), (t - 0.8400) / 0.0700);
  if (t >= 0.9100 && t <= 0.9800) c = mix(vec3(0.5765,0.9412,0.3882), vec3(0.3529,0.9294,0.4196), (t - 0.9100) / 0.0700);
  if (t >= 0.9800 && t <= 1.0000) c = mix(vec3(0.3529,0.9294,0.4196), vec3(0.3176,0.9059,0.5569), (t - 0.9800) / 0.0200);
  return c;
}

// Masque d'anneau anticrénelé (bords nets à toute densité) : r = length(p), Ro = rayon extérieur.
float irisRing(vec2 p, float Ro){
  float r = length(p), Ri = Ro * 0.514, aa = fwidth(r);
  return smoothstep(Ro + aa*0.5, Ro - aa*0.5, r) * smoothstep(Ri - aa*0.5, Ri + aa*0.5, r);
}
