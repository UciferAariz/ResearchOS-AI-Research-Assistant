// Cleans the inline LaTeX that arXiv/PubMed titles and abstracts (and the
// LLM's echoes of them) are riddled with — e.g. `$^{211}$Bi`, `SiO$_{2}$`,
// `\(^{211}\)Pb`, `\alpha` — into readable Unicode: ²¹¹Bi, SiO₂, ²¹¹Pb, α.
//
// This is deliberately a light normaliser, not a full TeX renderer: the goal is
// "clean, complete prose" in titles/abstracts/chat, not typeset equations. It
// strips math delimiters, maps super/subscripts and common commands to Unicode,
// and drops any leftover backslash commands/braces so nothing renders raw.

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

function toScript(map: Record<string, string>, group: string): string | null {
  let out = "";
  for (const ch of group) {
    if (map[ch] === undefined) return null;
    out += map[ch];
  }
  return out;
}

export function cleanLatex(input?: string | null): string {
  if (!input) return input ?? "";
  let s = input;

  // Drop math-mode delimiters, keeping the inner content: \( \) \[ \] $$ $
  s = s.replace(/\\[()[\]]/g, "");
  s = s.replace(/\$\$?/g, "");

  // Super/subscripts: braced groups first, then a single trailing token.
  s = s.replace(/\^\{([^{}]*)\}/g, (m, g) => toScript(SUPERSCRIPT, g) ?? g);
  s = s.replace(/\^([A-Za-z0-9+\-=()])/g, (m, g) => toScript(SUPERSCRIPT, g) ?? g);
  s = s.replace(/_\{([^{}]*)\}/g, (m, g) => toScript(SUBSCRIPT, g) ?? g);
  s = s.replace(/_([A-Za-z0-9+\-=()])/g, (m, g) => toScript(SUBSCRIPT, g) ?? g);

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
  s = s.replace(/\\([A-Za-z]+)/g, (m, name) => COMMANDS[name] ?? name);

  // Remove any leftover grouping braces and collapse doubled spaces.
  s = s.replace(/[{}]/g, "");
  s = s.replace(/[ \t]{2,}/g, " ");

  return s;
}
