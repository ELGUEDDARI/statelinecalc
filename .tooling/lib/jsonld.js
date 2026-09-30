/* Decode les entites HTML litterales a l'interieur des blocs JSON-LD.
 *
 * POURQUOI : un <script type="application/ld+json"> n'est PAS decode comme du
 * HTML. Une FAQ ecrite avec &rsquo; / &mdash; / &quot; pour le corps de la page
 * puis recopiee telle quelle dans le JSON-LD est lue a la lettre par les
 * moteurs (« state&rsquo;s »). Defaut releve le 30/09/2026 sur 8 pages d'Etat.
 *
 * Usage : fs.writeFileSync(f, nettoieJsonLd(html)). Idempotent. Ne touche QUE
 * l'interieur des blocs ld+json ; le format (indentation) est conserve.
 * &quot; devient \" (guillemet echappe JSON) pour que le bloc reste valide.
 * Leve une erreur si un bloc n'est pas du JSON valide apres nettoyage. */
const NOMMEES = {
  mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  sect: "§", copy: "©", reg: "®", deg: "°", plusmn: "±", minus: "−", frac12: "½", cent: "¢", hellip: "…", times: "×", nbsp: " ", middot: "·", apos: "'", lt: "<", gt: ">"
};
function decodeTexte(s) {
  let prev;
  do {
    prev = s;
    s = s
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&([a-z]+);/gi, (m, n) => (n in NOMMEES ? NOMMEES[n] : m))
      .replace(/&quot;/g, '\\"')
      .replace(/&amp;/g, "&");
  } while (s !== prev);
  return s;
}
function nettoieJsonLd(html) {
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,
    (m, a, corps, c) => {
      const propre = decodeTexte(corps);
      JSON.parse(propre);
      return a + propre + c;
    });
}
module.exports = { nettoieJsonLd, decodeTexte };
