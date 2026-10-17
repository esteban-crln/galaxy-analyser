/*
 * Analyse d'un relevé provisoire de notes (export Excel → PDF, BUT R&T).
 *
 * Le relevé est un grand tableau coupé sur plusieurs pages A3, qui se suivent
 * de gauche à droite. Chaque bloc (ressource, SAE ou UE) est une suite de
 * colonnes qui se termine par une colonne « Moy » ou « Moy. UE ».
 * Lignes du tableau, de haut en bas :
 *   intitulé du bloc · code (R501, SAE501, UE51…) · en-tête de colonne ·
 *   coefficient · notes de l'étudiant · Min · Max · Moy (promo).
 *
 * Entrée : pages = [{ width, items: [{ str, x, y, w }] }] (coordonnées pdf.js)
 * Sortie : { student, semester, editedAt, dates, groups, bonus, absences }
 */
(function (root) {
  "use strict";

  var Y_TOL = 2;

  function num(s) {
    if (s == null) return null;
    var t = String(s).replace(/\s/g, "").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return parseFloat(t);
  }

  function near(a, b) { return Math.abs(a - b) <= Y_TOL; }

  // Fusionne deux morceaux d'un texte coupé entre deux pages
  // (« …réseaux et l’Inte » + « ux et l’Internet Niveau 3 »).
  // crossPage : les deux morceaux sont de part et d'autre d'une coupure de page,
  // le recouvrement peut alors ne faire qu'une lettre (« avanc » + « cés »).
  function mergeText(a, b, crossPage) {
    if (!a) return b;
    if (!b || a.indexOf(b) >= 0) return a;
    if (b.indexOf(a) >= 0) return b;
    for (var k = Math.min(a.length, b.length); k >= (crossPage ? 1 : 3); k--) {
      if (a.slice(-k) === b.slice(0, k)) return a + b.slice(k);
    }
    return crossPage ? a + b : a + " " + b;
  }

  function parseReleve(pages) {
    if (!pages || !pages.length) throw new Error("PDF vide.");

    // 1. Toutes les pages sur un même axe horizontal.
    var items = [];
    var offset = 0;
    pages.forEach(function (p, i) {
      p.items.forEach(function (it) {
        var s = String(it.str || "").trim();
        if (!s) return;
        items.push({ s: s, x: it.x + offset, y: it.y, w: it.w, cx: it.x + offset + it.w / 2, page: i });
      });
      offset += p.width;
    });

    // 2. Repérer les lignes grâce aux libellés de la première page.
    var p0 = items.filter(function (it) { return it.page === 0; });
    function labelY(re) {
      var hit = p0.filter(function (it) { return re.test(it.s); })[0];
      return hit ? hit.y : null;
    }
    var yMin = labelY(/^Min$/), yMax = labelY(/^Max$/);
    var yMoyPromo = p0.filter(function (it) { return it.s === "Moy" && yMin != null && it.y < yMin - Y_TOL; })
      .map(function (it) { return it.y; })[0];
    if (yMin == null || yMax == null) {
      throw new Error("Lignes Min / Max introuvables : ce PDF ne ressemble pas à un relevé provisoire de notes.");
    }

    // Ligne d'en-tête : celle qui contient le plus de « Moy ».
    var counts = {};
    items.forEach(function (it) {
      if (/^Moy(\. UE)?$/.test(it.s) && it.y > yMin) {
        var key = Math.round(it.y);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    var yHead = null, best = 0;
    Object.keys(counts).forEach(function (k) { if (counts[k] > best) { best = counts[k]; yHead = +k; } });
    if (yHead == null) throw new Error("En-têtes de colonnes introuvables.");

    var headItems = items.filter(function (it) { return near(it.y, yHead); }).sort(function (a, b) { return a.x - b.x; });
    var firstColX = headItems[0].x;

    // Ligne des coefficients : juste sous l'en-tête.
    var below = items.filter(function (it) { return it.y < yHead - Y_TOL && it.y > yMin + Y_TOL && it.x >= firstColX - 5; })
      .map(function (it) { return it.y; });
    var yCoef = Math.max.apply(null, below);

    // Ligne de l'étudiant : celle qui porte son nom à gauche du tableau.
    var leftStudent = p0.filter(function (it) { return it.x < firstColX && it.y < yCoef - Y_TOL && it.y > yMin + Y_TOL; })
      .sort(function (a, b) { return a.x - b.x; });
    if (!leftStudent.length) throw new Error("Ligne de l'étudiant introuvable.");
    var yStudent = leftStudent[0].y;

    // Ligne des codes : au-dessus de l'en-tête, avec des codes R5xx / SAE / UE.
    var codeRe = /^(R\d|SAE|UE)/i;
    var codeYs = {};
    items.forEach(function (it) {
      if (it.y > yHead + Y_TOL && codeRe.test(it.s)) {
        var k = Math.round(it.y);
        codeYs[k] = (codeYs[k] || 0) + 1;
      }
    });
    var yCode = null; best = 0;
    Object.keys(codeYs).forEach(function (k) { if (codeYs[k] > best) { best = codeYs[k]; yCode = +k; } });

    // 3. Colonnes. Excel aligne les nombres à droite de leur case : les bords
    // droits des nombres (notes, Min, Max, Moy) donnent les limites des cases,
    // y compris celles dont l'en-tête est vide.
    var dataYs = [yStudent, yMin, yMax];
    if (yMoyPromo != null) dataYs.push(yMoyPromo);
    function inRow(it, ys) { return ys.some(function (y) { return near(it.y, y); }); }
    var rights = items.filter(function (it) { return inRow(it, dataYs) && it.x >= firstColX - 5 && num(it.s) != null; })
      .map(function (it) { return it.x + it.w; }).sort(function (a, b) { return a - b; });
    var anchors = [];
    rights.forEach(function (r) {
      if (anchors.length && r - anchors[anchors.length - 1] < 3) anchors[anchors.length - 1] = r;
      else anchors.push(r);
    });
    if (!anchors.length) throw new Error("Aucune note ni statistique de promo trouvée.");
    var lastEdge = anchors[anchors.length - 1] + 1.5;
    var cols = anchors.map(function (r, i) {
      return { label: "", x0: i ? anchors[i - 1] + 1.5 : firstColX - 5, x1: r + 1.5 };
    });
    function colAt(x) {
      if (x > lastEdge) return null;
      for (var i = 0; i < cols.length; i++) if (x <= cols[i].x1) return cols[i];
      return null;
    }
    headItems.forEach(function (it) {
      var c = colAt(it.cx);
      if (c) c.label = c.label ? c.label + " " + it.s : it.s;
    });
    function fillRow(y, key, byRight) {
      items.forEach(function (it) {
        if (!near(it.y, y) || it.x < firstColX - 5) return;
        var v = num(it.s);
        var c = colAt(byRight ? it.x + it.w - 0.5 : it.cx);
        if (!c) return;
        if (v != null) { if (c[key] == null) c[key] = v; }
        else if (key === "value") c.raw = it.s; // ABS, DEF…
      });
    }
    fillRow(yCoef, "coef", false);
    fillRow(yStudent, "value", true);
    fillRow(yMin, "min", true);
    fillRow(yMax, "max", true);
    if (yMoyPromo != null) fillRow(yMoyPromo, "moy", true);

    // 4. Blocs : colonnes jusqu'à « Moy » / « Moy. UE » incluse.
    var isMoy = function (label) { return /^Moy(enne)?(\.?\s*UE)?$/i.test(label); };
    var groups = [], cur = [];
    cols.forEach(function (c) {
      cur.push(c);
      if (isMoy(c.label)) { groups.push(cur); cur = []; }
    });
    var extras = headItems.filter(function (it) { return it.cx > lastEdge; });

    function span(g) {
      var gap = 4;
      return [g[0].x0 - gap, g[g.length - 1].x1 + gap];
    }
    function inGroup(it, g) { var s = span(g); return it.cx >= s[0] && it.cx <= s[1]; }

    var codeItems = yCode == null ? [] : items.filter(function (it) { return near(it.y, yCode) && codeRe.test(it.s); });
    var nameTop = yCode == null ? yHead + 40 : yCode + 25;
    var nameItems = items.filter(function (it) {
      return it.y > (yCode == null ? yHead : yCode) + Y_TOL && it.y < nameTop && it.x >= firstColX - 30;
    });

    var out = [];
    groups.forEach(function (g) {
      var codes = codeItems.filter(function (it) { return inGroup(it, g); })
        .sort(function (a, b) { return b.s.length - a.s.length; });
      if (!codes.length) return; // colonnes « Moy » vides en fin de section
      var code = codes[0].s;
      var name = "";
      nameItems.filter(function (it) { return inGroup(it, g); })
        .sort(function (a, b) { return a.x - b.x; })
        .forEach(function (it, i, arr) {
          var prev = arr[i - 1];
          name = mergeText(name, it.s, prev && prev.page !== it.page);
        });

      var last = g[g.length - 1];
      var kind = /^UE/i.test(code) ? "ue" : /^SAE/i.test(code) ? "sae" : "ressource";
      out.push({
        kind: kind,
        code: code,
        name: name.replace(/\s+/g, " ").replace("analy se", "analyse").trim(),
        coefTotal: kind === "ue" ? (last.coef == null ? null : last.coef) : null,
        avg: { value: last.value == null ? null : last.value, min: last.min, max: last.max, moy: last.moy == null ? null : last.moy },
        components: g.slice(0, -1).filter(function (c) {
          return c.label || c.coef || c.value != null;
        }).map(function (c) {
          return { label: c.label || "?", raw: c.raw || null, coef: c.coef == null ? null : c.coef, value: c.value == null ? null : c.value,
            min: c.min == null ? null : c.min, max: c.max == null ? null : c.max, moy: c.moy == null ? null : c.moy };
        })
      });
    });

    // 5. Sport / Citoyen et absences (après le dernier bloc).
    var bonus = null;
    extras.forEach(function (h) {
      if (!/Citoyen|Sport|Bonus/i.test(h.s)) return;
      items.forEach(function (v) { if (near(v.y, yStudent) && Math.abs(v.cx - h.cx) < 25 && num(v.s) != null) bonus = num(v.s); });
    });
    var absences = { aj: null, anj: null };
    items.forEach(function (it) {
      if (!near(it.y, yCoef) || !/^A(N)?J$/.test(it.s)) return;
      var key = it.s.toLowerCase();
      items.forEach(function (v) {
        if (near(v.y, yStudent) && Math.abs(v.cx - it.cx) < 12 && num(v.s) != null) absences[key] = num(v.s);
      });
    });

    // 6. En-tête : étudiant, semestre, dates.
    var leftOf = function (y) {
      return p0.filter(function (it) { return near(it.y, y) && it.x < firstColX - 20; }).sort(function (a, b) { return a.x - b.x; });
    };
    var st = leftOf(yStudent).map(function (it) { return it.s; });
    var student = {
      name: st[0] || "",
      birthDate: st.filter(function (s) { return /^\d{2}\/\d{2}\/\d{4}$/.test(s); })[0] || null,
      id: st.filter(function (s) { return /^\d{5,}$/.test(s); })[0] || null
    };
    var semItem = p0.filter(function (it) { return /^S\d{1,2}$/.test(it.s); })[0];
    var edited = p0.filter(function (it) { return /^\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(it.s); })[0];
    function dateAfter(re) {
      var lab = p0.filter(function (it) { return re.test(it.s); })[0];
      if (!lab) return null;
      var d = leftOf(lab.y).filter(function (it) { return /^\d{2}\/\d{2}\/\d{4}$/.test(it.s); })[0];
      return d ? d.s : null;
    }

    if (!out.length) throw new Error("Aucune matière trouvée dans ce PDF.");

    return {
      student: student,
      semester: semItem ? semItem.s : null,
      editedAt: edited ? edited.s : null,
      dates: { start: dateAfter(/^Date début/i), end: dateAfter(/^Date fin/i), jury: dateAfter(/^Date jury/i) },
      groups: out,
      bonus: bonus,
      absences: absences
    };
  }

  // pdf.js → format attendu par parseReleve
  async function extractPages(pdfDoc) {
    var pages = [];
    for (var n = 1; n <= pdfDoc.numPages; n++) {
      var page = await pdfDoc.getPage(n);
      var vp = page.getViewport({ scale: 1 });
      var tc = await page.getTextContent();
      pages.push({
        width: vp.width,
        items: tc.items.map(function (it) { return { str: it.str, x: it.transform[4], y: it.transform[5], w: it.width }; })
      });
    }
    return pages;
  }

  var api = { parseReleve: parseReleve, extractPages: extractPages };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReleveParser = api;
})(this);
