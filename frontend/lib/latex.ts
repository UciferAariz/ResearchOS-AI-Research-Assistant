// Cleans the inline LaTeX that arXiv/PubMed titles and abstracts (and the
// LLM's echoes of them) are riddled with — e.g. `$^{211}$Bi`, `SiO$_{2}$`,
// `\(^{211}\)Pb`, `\vec{p}^{*}_1`, `\alpha` — into readable Unicode:
// ²¹¹Bi, SiO₂, ²¹¹Pb, p⃗∗₁, α.
//
// This is deliberately a light normaliser, not a full TeX renderer: the goal is
// "clean, complete prose" in titles/abstracts/chat, not typeset equations. It
// strips math delimiters, maps accents/fractions/super/subscripts and common
// commands to Unicode, and drops any leftover backslash commands/braces so
// nothing renders raw. Output is plain text AND Markdown-safe: it never
// introduces a bare `_` or ASCII `*` that a Markdown renderer downstream
// (see ChatMarkdown) could misparse as emphasis.

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽",
  ")": "⁾", n: "ⁿ", i: "ⁱ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "=": "₌", "(": "₍",
  ")": "₎", a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ", h: "ₕ", k: "ₖ", l: "ₗ",
  m: "ₘ", n: "ₙ", p: "ₚ", s: "ₛ", t: "ₜ",
};

// Trailing tokens that can't be mapped to a dedicated Unicode super/subscript
// glyph (e.g. femtoscopy's ubiquitous "k*") but whose LaTeX marker (^ or _)
// should still be dropped rather than left dangling in the prose.
const UNMAPPABLE_SCRIPT_TOKEN = /[A-Za-z0-9+\-=()*'†‡]/;

// Keyed by the bare command name (no backslash).
const COMMANDS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ",
  tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  times: "×", div: "÷", pm: "±", mp: "∓", cdot: "·", ast: "∗", star: "⋆",
  approx: "≈", sim: "∼", simeq: "≃", cong: "≅", equiv: "≡", propto: "∝",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", ll: "≪", gg: "≫",
  infty: "∞", partial: "∂", nabla: "∇", sum: "∑", prod: "∏", int: "∫",
  sqrt: "√", angstrom: "Å", degree: "°", deg: "°", prime: "′",
  rightarrow: "→", to: "→", leftarrow: "←", leftrightarrow: "↔",
  Rightarrow: "⇒", Leftarrow: "⇐", cdots: "⋯", ldots: "…", dots: "…",
  bullet: "•", circ: "∘", perp: "⊥", parallel: "∥", forall: "∀", exists: "∃",
  in: "∈", notin: "∉", subset: "⊂", supset: "⊃", cup: "∪", cap: "∩",
};

// Combining diacritics applied per-character so `\vec{p}` → "p⃗" and
// `\hat{n}_i` → "n̂ᵢ" instead of losing the accent entirely.
const ACCENTS: Record<string, string> = {
  vec: "⃗", // combining right arrow above
  hat: "̂", // combining circumflex
  widehat: "̂",
  tilde: "̃", // combining tilde
  widetilde: "̃",
  bar: "̅", // combining overline
  overline: "̅",
  dot: "̇", // combining dot above
  ddot: "̈", // combining diaeresis
  underline: "̲", // combining low line
};

function toScript(map: Record<string, string>, group: string): string | null {
  let out = "";
  for (const ch of group) {
    if (map[ch] === undefined) return null;
    out += map[ch];
  }
  return out;
}

// A LaTeX star-variable (`k^*`, `p^{*}`) has to render as *something* once its
// caret is stripped — but a bare ASCII "*" would then get reinterpreted by the
// Markdown renderer as an emphasis marker. U+2217 is the dedicated math
// "asterisk operator": visually near-identical, but invisible to Markdown.
function scriptFallback(g: string): string {
  return g === "*" ? "∗" : g;
}

function applyAccent(mark: string, content: string): string {
  return content
    .split("")
    .map((ch) => ch + mark)
    .join("");
}

export function cleanLatex(input?: string | null): string {
  if (!input) return input ?? "";
  let s = input;

  // Drop math-mode delimiters, keeping the inner content: \( \) \[ \] $$ $
  s = s.replace(/\\[()[\]]/g, "");
  s = s.replace(/\$\$?/g, "");

  // Sizing/spacing no-ops that only matter for real typesetting.
  s = s.replace(/\\(?:left|right|displaystyle|textstyle|scriptstyle|nolimits|limits)\b\s*/g, "");

  // Old-style font switches (`\rm`, `\bf`, `\it`, …) — common inside subscripts
  // like `s_{\rm NN}`. Drop the command (and its trailing space) but keep the
  // text, so `s_{\rm NN}` becomes a clean `s NN` rather than `srm NN`.
  s = s.replace(
    /\\(?:rm|bf|it|sf|tt|sc|em|cal|sl|normalfont|upshape|itshape|slshape|scshape|bfseries|mdseries|rmfamily|sffamily|ttfamily)\b\s*/g,
    "",
  );

  // \frac{a}{b} → "a/b" (parenthesised when either side is more than one glyph).
  s = s.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a, b) => {
    const wrap = (x: string) => (x.length > 1 ? `(${x})` : x);
    return `${wrap(a)}/${wrap(b)}`;
  });

  // Accents: \vec{p} → p⃗, \hat{n} → n̂, \bar{x} → x̄, etc.
  s = s.replace(
    /\\(vec|widehat|hat|widetilde|tilde|overline|bar|ddot|dot|underline)\s*\{([^{}]*)\}/g,
    (_m, cmd, content) => applyAccent(ACCENTS[cmd], content),
  );

  // Super/subscripts: braced groups first, then a single trailing token.
  // Subscripts require a non-whitespace character just before the `_` —
  // real LaTeX subscripts always sit flush against their base (k_1, p⃗*_1,
  // x^2_i), whereas Markdown `_emphasis_` only opens at a word boundary
  // (start of string / whitespace), per CommonMark's intraword-underscore
  // rule. So this can never mistake a Markdown span for a subscript.
  s = s.replace(/\^\{([^{}]*)\}/g, (_m, g) => toScript(SUPERSCRIPT, g) ?? scriptFallback(g));
  s = s.replace(/\^([A-Za-z0-9+\-=()*'†‡])/g, (_m, g) => toScript(SUPERSCRIPT, g) ?? scriptFallback(g));
  s = s.replace(/(?<=\S)_\{([^{}]*)\}/g, (_m, g) => toScript(SUBSCRIPT, g) ?? scriptFallback(g));
  s = s.replace(/(?<=\S)_([A-Za-z0-9+\-=()*])/g, (_m, g) => toScript(SUBSCRIPT, g) ?? scriptFallback(g));

  // Any leftover ^token that couldn't be mapped (e.g. "k^*") — drop the caret
  // but keep the token so nothing renders as a stray circumflex.
  s = s.replace(new RegExp(`\\^(${UNMAPPABLE_SCRIPT_TOKEN.source})`, "g"), (_m, g) => scriptFallback(g));

  // Text/formatting wrappers: keep the argument, drop the command.
  s = s.replace(
    /\\(?:textbf|textit|textrm|textsf|texttt|text|emph|mathrm|mathbf|mathit|mathcal|mathsf|mathtt|operatorname|boldsymbol|hbox|mbox)\s*\{([^{}]*)\}/g,
    "$1",
  );

  // Escaped literals: \%, \&, \_, \#, \$, \{ \}
  s = s.replace(/\\([%&_#${}])/g, "$1");
  // Thin/negative spaces and similar → a plain space.
  s = s.replace(/\\[,;!:> ]/g, " ");

  // Named commands: map known ones to Unicode, drop the backslash from the rest.
  s = s.replace(/\\([A-Za-z]+)/g, (_m, name) => COMMANDS[name] ?? name);

  // Remove any leftover grouping braces and collapse doubled spaces.
  s = s.replace(/[{}]/g, "");
  s = s.replace(/[ \t]{2,}/g, " ");

  return s;
}
