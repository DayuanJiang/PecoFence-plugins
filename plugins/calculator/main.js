// Calculator: an offline inline expression calculator for a PecoFence desktop fence.
// Evaluates arithmetic, powers, postfix percent, constants (pi, e, ans), and standard math
// functions via a bounded recursive-descent parser and iterative postorder evaluator (no dynamic
// code execution, no timers, no network). Persists per-fence history in `<fence id>-calc.json`
// and writes the canonical result to the Windows clipboard only when the user explicitly triggers
// Copy result.
"use strict";

const T = {
  en: {
    placeholder: "e.g. 2*(3+4)",
    inputTip: "Enter or click away to calculate; Esc cancels",
    loading: "Loading…",
    noHistory: "No history yet.",
    sessionOnly: "Session only",
    copyResult: "Copy result",
    reuseExpr: "Reuse expression",
    deleteEntry: "Delete entry",
    clearAll: "Clear history and answer",
    copying: "Copying…",
    copied: "Copied",
    copyBusy: "Clipboard busy. Try again.",
    copyFailed: "Couldn't copy",
    errTooLong: "Expression too long",
    errTooComplex: "Expression too complex",
    errTooNested: "Expression too nested",
    errBadChar: "Unexpected character",
    errBadNumber: "Invalid number",
    errSyntax: "Syntax error",
    errMultiply: "Use * to multiply",
    errUnknownName: "Unknown name",
    errArity: "Wrong number of arguments",
    errNoAns: "No previous answer",
    errDivZero: "Cannot divide by zero",
    errRange: "Result out of range",
    errDomain: "Math domain error",
    errTan: "Tangent undefined",
  },
  "zh-CN": {
    placeholder: "例如 2*(3+4)",
    inputTip: "按 Enter 或点外部计算；按 Esc 取消",
    loading: "正在加载…",
    noHistory: "暂无计算历史。",
    sessionOnly: "仅本次会话",
    copyResult: "复制结果",
    reuseExpr: "重用算式",
    deleteEntry: "删除记录",
    clearAll: "清空历史与上次结果",
    copying: "正在复制…",
    copied: "已复制",
    copyBusy: "剪贴板忙，请重试。",
    copyFailed: "复制失败",
    errTooLong: "算式过长",
    errTooComplex: "算式过于复杂",
    errTooNested: "括号或嵌套过深",
    errBadChar: "无法识别的字符",
    errBadNumber: "数字格式无效",
    errSyntax: "语法错误",
    errMultiply: "请使用 * 表示乘法",
    errUnknownName: "未知名称",
    errArity: "参数个数不正确",
    errNoAns: "尚无上次结果",
    errDivZero: "不能除以 0",
    errRange: "结果超出范围",
    errDomain: "数学定义域错误",
    errTan: "正切值无定义",
  },
  "zh-TW": {
    placeholder: "例如 2*(3+4)",
    inputTip: "按 Enter 或點外部計算；按 Esc 取消",
    loading: "載入中…",
    noHistory: "尚無計算歷史。",
    sessionOnly: "僅本次工作階段",
    copyResult: "複製結果",
    reuseExpr: "重用算式",
    deleteEntry: "刪除記錄",
    clearAll: "清除歷史與上次結果",
    copying: "複製中…",
    copied: "已複製",
    copyBusy: "剪貼簿忙碌中，請重試。",
    copyFailed: "無法複製",
    errTooLong: "算式過長",
    errTooComplex: "算式過於複雜",
    errTooNested: "括號或巢狀過深",
    errBadChar: "無法辨識的字元",
    errBadNumber: "數字格式無效",
    errSyntax: "語法錯誤",
    errMultiply: "請使用 * 表示乘法",
    errUnknownName: "未知的名稱",
    errArity: "參數數量不正確",
    errNoAns: "尚無上次結果",
    errDivZero: "不可除以 0",
    errRange: "結果超出範圍",
    errDomain: "數學定義域錯誤",
    errTan: "正切值無定義",
  },
  ja: {
    placeholder: "例: 2*(3+4)",
    inputTip: "Enter またはフォーカス移動で計算、Esc でキャンセル",
    loading: "読み込み中…",
    noHistory: "履歴はまだありません。",
    sessionOnly: "今回のみ保持",
    copyResult: "結果をコピー",
    reuseExpr: "式を再利用",
    deleteEntry: "履歴を削除",
    clearAll: "履歴と前回の答えを消去",
    copying: "コピー中…",
    copied: "コピーしました",
    copyBusy: "クリップボードが使用中です。再試行してください。",
    copyFailed: "コピーできませんでした",
    errTooLong: "式が長すぎます",
    errTooComplex: "式が複雑すぎます",
    errTooNested: "入れ子が深すぎます",
    errBadChar: "使えない文字があります",
    errBadNumber: "数値の形式が不正です",
    errSyntax: "構文エラー",
    errMultiply: "乗算には * を使ってください",
    errUnknownName: "不明な名前です",
    errArity: "引数の数が正しくありません",
    errNoAns: "前回の答えがありません",
    errDivZero: "0 で割ることはできません",
    errRange: "結果が範囲外です",
    errDomain: "定義域外の値です",
    errTan: "タンジェントは未定義です",
  },
  ko: {
    placeholder: "예: 2*(3+4)",
    inputTip: "Enter 또는 포커스 이동으로 계산, Esc로 취소",
    loading: "불러오는 중…",
    noHistory: "계산 기록이 없습니다.",
    sessionOnly: "이번 세션만 유지",
    copyResult: "결과 복사",
    reuseExpr: "수식 다시 사용",
    deleteEntry: "항목 삭제",
    clearAll: "기록 및 이전 답 지우기",
    copying: "복사 중…",
    copied: "복사됨",
    copyBusy: "클립보드가 사용 중입니다. 다시 시도하세요.",
    copyFailed: "복사할 수 없음",
    errTooLong: "수식이 너무 깁니다",
    errTooComplex: "수식이 너무 복잡합니다",
    errTooNested: "중첩이 너무 깊습니다",
    errBadChar: "지원하지 않는 문자입니다",
    errBadNumber: "잘못된 숫자 형식입니다",
    errSyntax: "구문 오류",
    errMultiply: "곱셈에는 *를 사용하세요",
    errUnknownName: "알 수 없는 이름입니다",
    errArity: "인수 개수가 올바르지 않습니다",
    errNoAns: "이전 답이 없습니다",
    errDivZero: "0으로 나눌 수 없습니다",
    errRange: "결과가 범위를 벗어났습니다",
    errDomain: "수학 정의역 오류",
    errTan: "탄젠트가 정의되지 않습니다",
  },
  de: {
    placeholder: "z. B. 2*(3+4)",
    inputTip: "Eingabe oder Fokusverlust berechnet; Esc bricht ab",
    loading: "Wird geladen…",
    noHistory: "Noch kein Verlauf.",
    sessionOnly: "Nur diese Sitzung",
    copyResult: "Ergebnis kopieren",
    reuseExpr: "Ausdruck wiederverwenden",
    deleteEntry: "Eintrag löschen",
    clearAll: "Verlauf und Ergebnis leeren",
    copying: "Kopiere…",
    copied: "Kopiert",
    copyBusy: "Zwischenablage belegt. Erneut versuchen.",
    copyFailed: "Kopieren fehlgeschlagen",
    errTooLong: "Ausdruck zu lang",
    errTooComplex: "Ausdruck zu komplex",
    errTooNested: "Zu tief verschachtelt",
    errBadChar: "Unerwartetes Zeichen",
    errBadNumber: "Ungültige Zahl",
    errSyntax: "Syntaxfehler",
    errMultiply: "* zum Multiplizieren verwenden",
    errUnknownName: "Unbekannter Name",
    errArity: "Falsche Anzahl an Argumenten",
    errNoAns: "Kein vorheriges Ergebnis",
    errDivZero: "Division durch Null nicht möglich",
    errRange: "Ergebnis außerhalb des Bereichs",
    errDomain: "Definitionsbereichsfehler",
    errTan: "Tangens nicht definiert",
  },
  fr: {
    placeholder: "ex. 2*(3+4)",
    inputTip: "Entrée ou clic ailleurs calcule ; Échap annule",
    loading: "Chargement…",
    noHistory: "Aucun historique.",
    sessionOnly: "Session uniquement",
    copyResult: "Copier le résultat",
    reuseExpr: "Réutiliser l'expression",
    deleteEntry: "Supprimer l'entrée",
    clearAll: "Effacer l'historique et ans",
    copying: "Copie…",
    copied: "Copié",
    copyBusy: "Presse-papiers occupé. Réessayez.",
    copyFailed: "Impossible de copier",
    errTooLong: "Expression trop longue",
    errTooComplex: "Expression trop complexe",
    errTooNested: "Imbrication trop profonde",
    errBadChar: "Caractère inattendu",
    errBadNumber: "Nombre invalide",
    errSyntax: "Erreur de syntaxe",
    errMultiply: "Utilisez * pour multiplier",
    errUnknownName: "Nom inconnu",
    errArity: "Nombre d'arguments incorrect",
    errNoAns: "Aucun résultat précédent",
    errDivZero: "Division par zéro impossible",
    errRange: "Résultat hors limites",
    errDomain: "Erreur de domaine",
    errTan: "Tangente non définie",
  },
  es: {
    placeholder: "ej. 2*(3+4)",
    inputTip: "Intro o clic fuera calcula; Esc cancela",
    loading: "Cargando…",
    noHistory: "Sin historial todavía.",
    sessionOnly: "Solo esta sesión",
    copyResult: "Copiar resultado",
    reuseExpr: "Reutilizar expresión",
    deleteEntry: "Eliminar entrada",
    clearAll: "Borrar historial y respuesta",
    copying: "Copiando…",
    copied: "Copiado",
    copyBusy: "Portapapeles ocupado. Inténtalo de nuevo.",
    copyFailed: "No se pudo copiar",
    errTooLong: "Expresión demasiado larga",
    errTooComplex: "Expresión demasiado compleja",
    errTooNested: "Demasiado anidamiento",
    errBadChar: "Carácter inesperado",
    errBadNumber: "Número no válido",
    errSyntax: "Error de sintaxis",
    errMultiply: "Usa * para multiplicar",
    errUnknownName: "Nombre desconocido",
    errArity: "Número incorrecto de argumentos",
    errNoAns: "No hay respuesta anterior",
    errDivZero: "No se puede dividir entre cero",
    errRange: "Resultado fuera de rango",
    errDomain: "Error de dominio matemático",
    errTan: "Tangente indefinida",
  },
  "pt-BR": {
    placeholder: "ex. 2*(3+4)",
    inputTip: "Enter ou clicar fora calcula; Esc cancela",
    loading: "Carregando…",
    noHistory: "Sem histórico ainda.",
    sessionOnly: "Somente nesta sessão",
    copyResult: "Copiar resultado",
    reuseExpr: "Reutilizar expressão",
    deleteEntry: "Excluir entrada",
    clearAll: "Limpar histórico e resposta",
    copying: "Copiando…",
    copied: "Copiado",
    copyBusy: "Área de transferência ocupada. Tente novamente.",
    copyFailed: "Não foi possível copiar",
    errTooLong: "Expressão muito longa",
    errTooComplex: "Expressão muito complexa",
    errTooNested: "Aninhamento excessivo",
    errBadChar: "Caractere inesperado",
    errBadNumber: "Número inválido",
    errSyntax: "Erro de sintaxe",
    errMultiply: "Use * para multiplicar",
    errUnknownName: "Nome desconhecido",
    errArity: "Número incorreto de argumentos",
    errNoAns: "Sem resposta anterior",
    errDivZero: "Não é possível dividir por zero",
    errRange: "Resultado fora do intervalo",
    errDomain: "Erro de domínio matemático",
    errTan: "Tangente indefinida",
  },
  ru: {
    placeholder: "напр. 2*(3+4)",
    inputTip: "Enter или потеря фокуса вычисляет; Esc отменяет",
    loading: "Загрузка…",
    noHistory: "Истории пока нет.",
    sessionOnly: "Только эта сессия",
    copyResult: "Копировать результат",
    reuseExpr: "Повторить выражение",
    deleteEntry: "Удалить запись",
    clearAll: "Очистить историю и ответ",
    copying: "Копирование…",
    copied: "Скопировано",
    copyBusy: "Буфер обмена занят. Попробуйте ещё раз.",
    copyFailed: "Не удалось скопировать",
    errTooLong: "Выражение слишком длинное",
    errTooComplex: "Выражение слишком сложное",
    errTooNested: "Слишком глубокая вложенность",
    errBadChar: "Недопустимый символ",
    errBadNumber: "Неверное число",
    errSyntax: "Синтаксическая ошибка",
    errMultiply: "Используйте * для умножения",
    errUnknownName: "Неизвестное имя",
    errArity: "Неверное число аргументов",
    errNoAns: "Нет предыдущего ответа",
    errDivZero: "Деление на ноль невозможно",
    errRange: "Результат вне диапазона",
    errDomain: "Ошибка области определения",
    errTan: "Тангенс не определён",
  },
  it: {
    placeholder: "es. 2*(3+4)",
    inputTip: "Invio o clic fuori calcola; Esc annulla",
    loading: "Caricamento…",
    noHistory: "Nessuna cronologia.",
    sessionOnly: "Solo questa sessione",
    copyResult: "Copia risultato",
    reuseExpr: "Riutilizza espressione",
    deleteEntry: "Elimina voce",
    clearAll: "Cancella cronologia e risposta",
    copying: "Copia in corso…",
    copied: "Copiato",
    copyBusy: "Appunti occupati. Riprova.",
    copyFailed: "Impossibile copiare",
    errTooLong: "Espressione troppo lunga",
    errTooComplex: "Espressione troppo complessa",
    errTooNested: "Annidamento eccessivo",
    errBadChar: "Carattere imprevisto",
    errBadNumber: "Numero non valido",
    errSyntax: "Errore di sintassi",
    errMultiply: "Usa * per moltiplicare",
    errUnknownName: "Nome sconosciuto",
    errArity: "Numero di argomenti errato",
    errNoAns: "Nessun risultato precedente",
    errDivZero: "Impossibile dividere per zero",
    errRange: "Risultato fuori intervallo",
    errDomain: "Errore di dominio matematico",
    errTan: "Tangente non definita",
  },
};

const MAX_INPUT_LEN = 256;
const MAX_TOKENS = 128;
const MAX_DEPTH = 24;
const MAX_HISTORY = 16;
const MAX_SCAN_SAVED = 32;
const MAX_FILE_LEN = 16384;
const MAX_CAPTION_LEN = 24;
const WIDE_RESULT_BP = 360;
const ICON_COPY = "\uE8C8"; // Segoe Fluent Icons Copy glyph.

const CONSTS = Object.assign(Object.create(null), { pi: true, e: true, ans: true });
const FN_ARITY = Object.assign(Object.create(null), {
  sqrt: [1, 1], abs: [1, 1], round: [1, 1], floor: [1, 1], ceil: [1, 1],
  ln: [1, 1], log: [1, 1], sin: [1, 1], cos: [1, 1], tan: [1, 1],
  pow: [2, 2], mod: [2, 2],
  min: [1, 16], max: [1, 16],
});

const texts = () => T[pf.lang] || T[String(pf.lang || "en").split("-")[0]] || T.en;
let t = texts();

// Per-fence data file (<fence-uuid>-calc.json): 36 + 10 = 46 chars (<= 64).
const dataFile = () => pf.fence.id + "-calc.json";

function normZero(x) {
  return x === 0 ? 0 : x;
}

function isLexSpace(ch) {
  return ch === " " || ch === "\t" || ch === "\u00A0" || ch === "\u3000";
}

function trimLexSpaces(s) {
  let a = 0;
  let b = s.length;
  while (a < b && isLexSpace(s[a])) a += 1;
  while (b > a && isLexSpace(s[b - 1])) b -= 1;
  return s.slice(a, b);
}

function makeErr(code, pos) {
  return { ok: false, code, pos: typeof pos === "number" ? pos : -1 };
}

function errorText(code) {
  return t[code] || t.errSyntax;
}

// --- Lexer ---
function tokenize(raw) {
  if (typeof raw !== "string") return makeErr("errSyntax", 0);
  if (raw.length > MAX_INPUT_LEN) return makeErr("errTooLong", MAX_INPUT_LEN);

  const tokens = [];
  let i = 0;
  const n = raw.length;

  while (i < n) {
    const ch = raw[i];
    if (isLexSpace(ch)) {
      i += 1;
      continue;
    }
    if (tokens.length >= MAX_TOKENS) {
      return makeErr("errTooComplex", i);
    }

    // Unicode math aliases
    if (ch === "\u2212") { tokens.push({ type: "op", value: "-", pos: i }); i += 1; continue; }
    if (ch === "\u00D7") { tokens.push({ type: "op", value: "*", pos: i }); i += 1; continue; }
    if (ch === "\u00F7") { tokens.push({ type: "op", value: "/", pos: i }); i += 1; continue; }
    if (ch === "\u03C0") { tokens.push({ type: "id", value: "pi", pos: i }); i += 1; continue; }

    // Operators and delimiters
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^" || ch === "%") {
      tokens.push({ type: "op", value: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === ",") {
      tokens.push({ type: ch, value: ch, pos: i });
      i += 1;
      continue;
    }

    // Numbers: (?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?
    const code = ch.charCodeAt(0);
    if ((code >= 48 && code <= 57) || ch === ".") {
      const start = i;
      let intDigits = 0;
      let fracDigits = 0;
      while (i < n && raw.charCodeAt(i) >= 48 && raw.charCodeAt(i) <= 57) {
        intDigits += 1;
        i += 1;
      }
      if (i < n && raw[i] === ".") {
        i += 1;
        while (i < n && raw.charCodeAt(i) >= 48 && raw.charCodeAt(i) <= 57) {
          fracDigits += 1;
          i += 1;
        }
      }
      if (intDigits === 0 && fracDigits === 0) {
        return makeErr("errBadNumber", start);
      }
      if (i < n && (raw[i] === "e" || raw[i] === "E")) {
        i += 1;
        if (i < n && (raw[i] === "+" || raw[i] === "-")) i += 1;
        let expDigits = 0;
        while (i < n && raw.charCodeAt(i) >= 48 && raw.charCodeAt(i) <= 57) {
          expDigits += 1;
          i += 1;
        }
        if (expDigits === 0) {
          return makeErr("errBadNumber", start);
        }
      }
      const lit = raw.slice(start, i);
      const val = Number(lit);
      if (!Number.isFinite(val)) {
        return makeErr("errRange", start);
      }
      tokens.push({ type: "num", value: normZero(val), pos: start });
      continue;
    }

    // ASCII identifiers: [A-Za-z][A-Za-z0-9_]*
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      const start = i;
      i += 1;
      while (i < n) {
        const c = raw.charCodeAt(i);
        if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95) {
          i += 1;
        } else {
          break;
        }
      }
      tokens.push({ type: "id", value: raw.slice(start, i).toLowerCase(), pos: start });
      continue;
    }

    return makeErr("errBadChar", i);
  }

  tokens.push({ type: "eof", value: "", pos: n });
  return { ok: true, tokens };
}

// --- Recursive-descent parser -> bounded AST ---
function parseExpression(raw) {
  const lex = tokenize(raw);
  if (!lex.ok) return lex;
  const tokens = lex.tokens;
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function enterDepth(tokPos) {
    depth += 1;
    if (depth > MAX_DEPTH) return makeErr("errTooNested", tokPos);
    return null;
  }

  function isOperandStart(tok) {
    return tok.type === "num" || tok.type === "id" || tok.type === "(";
  }

  function parseSum() {
    let left = parseProduct();
    if (!left.ok) return left;
    let node = left.node;
    while (peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = next();
      const right = parseProduct();
      if (!right.ok) return right;
      node = { kind: "bin", op: op.value, left: node, right: right.node, pos: op.pos };
    }
    return { ok: true, node };
  }

  function parseProduct() {
    let left = parseSigned();
    if (!left.ok) return left;
    let node = left.node;
    while (peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = next();
      const right = parseSigned();
      if (!right.ok) return right;
      node = { kind: "bin", op: op.value, left: node, right: right.node, pos: op.pos };
    }
    return { ok: true, node };
  }

  function parseSigned() {
    if (peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = next();
      const err = enterDepth(op.pos);
      if (err) return err;
      const arg = parseSigned();
      depth -= 1;
      if (!arg.ok) return arg;
      if (op.value === "+") return arg;
      return { ok: true, node: { kind: "neg", arg: arg.node, pos: op.pos } };
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePostfix();
    if (!base.ok) return base;
    if (peek().type === "op" && peek().value === "^") {
      const op = next();
      const err = enterDepth(op.pos);
      if (err) return err;
      const exp = parseSigned();
      depth -= 1;
      if (!exp.ok) return exp;
      return { ok: true, node: { kind: "bin", op: "^", left: base.node, right: exp.node, pos: op.pos } };
    }
    return base;
  }

  function parsePostfix() {
    const prim = parsePrimary();
    if (!prim.ok) return prim;
    let node = prim.node;
    if (peek().type === "op" && peek().value === "%") {
      const op = next();
      node = { kind: "pct", arg: node, pos: op.pos };
    }
    if (isOperandStart(peek())) {
      return makeErr("errMultiply", peek().pos);
    }
    return { ok: true, node };
  }

  function parsePrimary() {
    const tok = peek();
    if (tok.type === "num") {
      next();
      return { ok: true, node: { kind: "num", value: tok.value, pos: tok.pos } };
    }
    if (tok.type === "id") {
      next();
      const name = tok.value;
      if (peek().type === "(") {
        if (CONSTS[name]) {
          return makeErr("errMultiply", peek().pos);
        }
        const arity = FN_ARITY[name];
        if (!arity) {
          return makeErr("errUnknownName", tok.pos);
        }
        next(); // consume '('
        const args = [];
        if (peek().type !== ")") {
          while (true) {
            const err = enterDepth(peek().pos);
            if (err) return err;
            const arg = parseSum();
            depth -= 1;
            if (!arg.ok) return arg;
            args.push(arg.node);
            if (args.length > arity[1]) {
              return makeErr("errArity", tok.pos);
            }
            if (peek().type === ",") {
              next();
              continue;
            }
            break;
          }
        }
        if (peek().type !== ")") {
          return makeErr("errSyntax", peek().pos);
        }
        next(); // consume ')'
        if (args.length < arity[0] || args.length > arity[1]) {
          return makeErr("errArity", tok.pos);
        }
        return { ok: true, node: { kind: "fn", name, args, pos: tok.pos } };
      }
      if (CONSTS[name]) {
        return { ok: true, node: { kind: "const", name, pos: tok.pos } };
      }
      if (FN_ARITY[name]) {
        return makeErr("errSyntax", peek().pos);
      }
      return makeErr("errUnknownName", tok.pos);
    }
    if (tok.type === "(") {
      next();
      const err = enterDepth(tok.pos);
      if (err) return err;
      const inner = parseSum();
      depth -= 1;
      if (!inner.ok) return inner;
      if (peek().type !== ")") {
        return makeErr("errSyntax", peek().pos);
      }
      next();
      return inner;
    }
    return makeErr("errSyntax", tok.pos);
  }

  const res = parseSum();
  if (!res.ok) return res;
  if (peek().type !== "eof") {
    if (isOperandStart(peek())) return makeErr("errMultiply", peek().pos);
    return makeErr("errSyntax", peek().pos);
  }
  return { ok: true, ast: res.node };
}

// --- Trig helpers ---
function evalQuadrantTrig(fn, quad, s, c, exactAxis) {
  if (fn === "sin") {
    if (quad === 0) return s;
    if (quad === 1) return c;
    if (quad === 2) return -s;
    return -c;
  }
  if (fn === "cos") {
    if (quad === 0) return c;
    if (quad === 1) return -s;
    if (quad === 2) return -c;
    return s;
  }
  // tan
  if (quad === 0 || quad === 2) return s / c;
  if (exactAxis) return null;
  return -c / s;
}

function evalTrig(fn, x, angleUnit) {
  if (angleUnit === "deg") {
    const r = x % 360;
    const q = Math.round(r / 90);
    const d = r - 90 * q;
    const rad = d * (Math.PI / 180);
    const s = d === 0 ? 0 : Math.sin(rad);
    const c = d === 0 ? 1 : Math.cos(rad);
    const quad = ((q % 4) + 4) % 4;
    const val = evalQuadrantTrig(fn, quad, s, c, d === 0);
    if (val === null) return makeErr("errTan");
    return { ok: true, value: normZero(val) };
  }
  // Radians with exact-match right-angle convention for common multiples of pi/2.
  const halfPi = Math.PI / 2;
  const q = Math.round(x / halfPi);
  if (Math.abs(q) <= 1048576 && x === q * halfPi) {
    const quad = ((q % 4) + 4) % 4;
    const val = evalQuadrantTrig(fn, quad, 0, 1, true);
    if (val === null) return makeErr("errTan");
    return { ok: true, value: normZero(val) };
  }
  let val;
  if (fn === "sin") val = Math.sin(x);
  else if (fn === "cos") val = Math.cos(x);
  else val = Math.tan(x);
  return { ok: true, value: normZero(val) };
}

function evalPow(a, b, pos) {
  if (a === 0 && b === 0) return { ok: true, value: 1 };
  if (a === 0 && b < 0) return makeErr("errDivZero", pos);
  if (a < 0 && !Number.isInteger(b)) return makeErr("errDomain", pos);
  const v = Math.pow(a, b);
  if (!Number.isFinite(v)) return makeErr("errRange", pos);
  return { ok: true, value: normZero(v) };
}

// --- Iterative postorder evaluator ---
function evaluateAst(ast, ansSnapshot, angleUnit) {
  const work = [{ node: ast, ready: false }];
  const vals = [];

  while (work.length > 0) {
    const top = work.pop();
    const node = top.node;

    if (!top.ready) {
      if (node.kind === "num") {
        vals.push(normZero(node.value));
        continue;
      }
      if (node.kind === "const") {
        if (node.name === "pi") vals.push(Math.PI);
        else if (node.name === "e") vals.push(Math.E);
        else if (node.name === "ans") {
          if (ansSnapshot === null) return makeErr("errNoAns", node.pos);
          vals.push(normZero(ansSnapshot));
        } else {
          return makeErr("errUnknownName", node.pos);
        }
        continue;
      }
      work.push({ node, ready: true });
      if (node.kind === "neg" || node.kind === "pct") {
        work.push({ node: node.arg, ready: false });
      } else if (node.kind === "bin") {
        work.push({ node: node.right, ready: false });
        work.push({ node: node.left, ready: false });
      } else if (node.kind === "fn") {
        for (let i = node.args.length - 1; i >= 0; i -= 1) {
          work.push({ node: node.args[i], ready: false });
        }
      }
      continue;
    }

    let out = 0;
    if (node.kind === "neg") {
      out = -vals.pop();
    } else if (node.kind === "pct") {
      out = vals.pop() / 100;
    } else if (node.kind === "bin") {
      const b = vals.pop();
      const a = vals.pop();
      switch (node.op) {
        case "+": out = a + b; break;
        case "-": out = a - b; break;
        case "*": out = a * b; break;
        case "/":
          if (b === 0) return makeErr("errDivZero", node.pos);
          out = a / b;
          break;
        case "^": {
          const p = evalPow(a, b, node.pos);
          if (!p.ok) return p;
          out = p.value;
          break;
        }
        default:
          return makeErr("errSyntax", node.pos);
      }
    } else if (node.kind === "fn") {
      const argc = node.args.length;
      const args = new Array(argc);
      for (let i = argc - 1; i >= 0; i -= 1) args[i] = vals.pop();
      switch (node.name) {
        case "sqrt":
          if (args[0] < 0) return makeErr("errDomain", node.pos);
          out = Math.sqrt(args[0]);
          break;
        case "abs": out = Math.abs(args[0]); break;
        case "round": out = Math.round(args[0]); break;
        case "floor": out = Math.floor(args[0]); break;
        case "ceil": out = Math.ceil(args[0]); break;
        case "ln":
          if (args[0] <= 0) return makeErr("errDomain", node.pos);
          out = Math.log(args[0]);
          break;
        case "log":
          if (args[0] <= 0) return makeErr("errDomain", node.pos);
          out = Math.log10(args[0]);
          break;
        case "sin":
        case "cos":
        case "tan": {
          const tr = evalTrig(node.name, args[0], angleUnit);
          if (!tr.ok) return makeErr(tr.code, node.pos);
          out = tr.value;
          break;
        }
        case "pow": {
          const p = evalPow(args[0], args[1], node.pos);
          if (!p.ok) return p;
          out = p.value;
          break;
        }
        case "mod":
          if (args[1] === 0) return makeErr("errDivZero", node.pos);
          out = args[0] % args[1];
          break;
        case "min": {
          out = args[0];
          for (let i = 1; i < argc; i += 1) {
            if (args[i] < out) out = args[i];
          }
          break;
        }
        case "max": {
          out = args[0];
          for (let i = 1; i < argc; i += 1) {
            if (args[i] > out) out = args[i];
          }
          break;
        }
        default:
          return makeErr("errUnknownName", node.pos);
      }
    }

    if (!Number.isFinite(out)) {
      return makeErr("errRange", node.pos);
    }
    vals.push(normZero(out));
  }

  const finalVal = vals.length === 1 ? vals[0] : NaN;
  if (!Number.isFinite(finalVal)) return makeErr("errRange", 0);
  return { ok: true, value: normZero(finalVal) };
}

// --- Canonical ASCII formatting & compact visual preview ---
function formatParts(neg, rawDigits, exp) {
  const digits = rawDigits.replace(/0+$/, "") || "0";
  if (digits === "0") return "0";
  const sign = neg ? "-" : "";
  if (exp >= -6 && exp <= 14) {
    if (exp >= digits.length - 1) {
      return sign + digits + "0".repeat(exp - (digits.length - 1));
    }
    if (exp >= 0) {
      return sign + digits.slice(0, exp + 1) + "." + digits.slice(exp + 1);
    }
    return sign + "0." + "0".repeat(-exp - 1) + digits;
  }
  const coeff = digits.length === 1 ? digits : digits[0] + "." + digits.slice(1);
  return sign + coeff + "e" + String(exp);
}

function parseExpString(s) {
  const idx = s.indexOf("e");
  const mantissa = s.slice(0, idx).replace(".", "");
  const exp = Number(s.slice(idx + 1));
  return { digits: mantissa, exp };
}

function formatCanonical(x) {
  if (!Number.isFinite(x)) return "0";
  if (x === 0) return "0";
  const neg = x < 0;
  const ax = Math.abs(x);

  if (Number.isSafeInteger(ax)) {
    const d = String(ax);
    return formatParts(neg, d, d.length - 1);
  }

  const pFull = parseExpString(ax.toExponential());
  if (pFull.digits.length <= 15) {
    return formatParts(neg, pFull.digits, pFull.exp);
  }

  const p15 = parseExpString(ax.toExponential(14));
  const cand = formatParts(neg, p15.digits, p15.exp);
  const rt = Number(cand);
  if (Number.isFinite(rt) && rt !== 0) {
    return cand;
  }

  return formatParts(neg, pFull.digits, pFull.exp);
}

function formatCompact(canon, maxLen) {
  if (canon.length <= maxLen) return canon;
  let s = canon;
  let neg = false;
  if (s[0] === "-") {
    neg = true;
    s = s.slice(1);
  }
  let baseExp = 0;
  const eIdx = s.indexOf("e");
  if (eIdx >= 0) {
    baseExp = Number(s.slice(eIdx + 1));
    s = s.slice(0, eIdx);
  }
  const dotIdx = s.indexOf(".");
  let rawDigits;
  let fracShift;
  if (dotIdx >= 0) {
    rawDigits = s.slice(0, dotIdx) + s.slice(dotIdx + 1);
    fracShift = dotIdx - 1;
  } else {
    rawDigits = s;
    fracShift = s.length - 1;
  }
  let firstNonZero = 0;
  while (firstNonZero < rawDigits.length && rawDigits[firstNonZero] === "0") {
    firstNonZero += 1;
  }
  if (firstNonZero >= rawDigits.length) return "0";
  const sig = rawDigits.slice(firstNonZero);
  const exp = baseExp + fracShift - firstNonZero;
  const kept = sig.slice(0, 4).replace(/0+$/, "") || "0";
  const approx = /[1-9]/.test(sig.slice(4));
  const coeff = kept.length === 1 ? kept : kept[0] + "." + kept.slice(1);
  return (approx ? "\u2248" : "") + (neg ? "-" : "") + coeff + "e" + String(exp);
}

// --- Settings & state ---
function readSettings() {
  const s = pf.settings || {};
  return {
    angleUnit: s.angleUnit === "rad" ? "rad" : "deg",
    showCaption: s.showCaption === true,
  };
}

let ready = false;
let writable = true;
let stateRev = 0;
let savedRev = 0;
let saveInFlight = false;
let lastWidth = 320;
let ans = null;
let items = []; // newest first: [{ id, expression, result, angleUnit }]
let nextHistId = 1;
let inputSeq = 0;
let draft = "";
let feedback = null; // null | { kind: "error"|"copying"|"copied"|"copyBusy"|"copyFailed", key, copiedText? }
let feedbackGen = 0;
let copyInFlight = false;
let lastViewJson = "";

function updateWidth(w) {
  if (typeof w === "number" && Number.isFinite(w) && w > 0) {
    lastWidth = Math.floor(w);
  }
}

function buildSnapshot() {
  return {
    v: 1,
    ans: ans === null ? null : normZero(ans),
    items: items.map((it) => ({
      expression: it.expression,
      result: normZero(it.result),
      angleUnit: it.angleUnit === "rad" ? "rad" : "deg",
    })),
  };
}

function flushSave() {
  if (!ready || !writable || saveInFlight || stateRev <= savedRev) return;
  saveInFlight = true;
  const targetRev = stateRev;
  const payload = JSON.stringify(buildSnapshot());
  let promise;
  try {
    promise = pf.data.write(dataFile(), payload);
  } catch (_) {
    saveInFlight = false;
    return;
  }
  Promise.resolve(promise).then(
    () => {
      saveInFlight = false;
      if (targetRev > savedRev) savedRev = targetRev;
      if (stateRev > savedRev) flushSave();
    },
    () => {
      saveInFlight = false;
    }
  );
}

function persistState() {
  if (!ready || !writable) return;
  stateRev += 1;
  flushSave();
}

function sanitizeLoaded(raw) {
  if (raw === null || raw === undefined) {
    return { writable: true, ans: null, items: [] };
  }
  if (typeof raw !== "string") {
    return { writable: true, ans: null, items: [] };
  }
  if (raw.length > MAX_FILE_LEN) {
    return { writable: false, ans: null, items: [] };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    return { writable: true, ans: null, items: [] };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { writable: true, ans: null, items: [] };
  }
  if (typeof data.v === "number" && Number.isInteger(data.v) && data.v !== 1) {
    return { writable: false, ans: null, items: [] };
  }
  if (data.v !== 1) {
    return { writable: true, ans: null, items: [] };
  }

  const savedAns = typeof data.ans === "number" && Number.isFinite(data.ans) ? normZero(data.ans) : null;
  const cleanItems = [];
  if (Array.isArray(data.items)) {
    const scanLimit = Math.min(data.items.length, MAX_SCAN_SAVED);
    for (let i = 0; i < scanLimit && cleanItems.length < MAX_HISTORY; i += 1) {
      const e = data.items[i];
      if (!e || typeof e !== "object" || Array.isArray(e)) continue;
      if (typeof e.expression !== "string" || typeof e.result !== "number" || !Number.isFinite(e.result)) continue;
      if (e.angleUnit !== "deg" && e.angleUnit !== "rad") continue;
      if (e.expression.length > MAX_INPUT_LEN) continue;
      const expr = trimLexSpaces(e.expression);
      if (!expr) continue;
      // Validate syntax & arity without evaluating against today's ans or angle unit.
      if (!parseExpression(expr).ok) continue;
      cleanItems.push({
        id: nextHistId++,
        expression: expr,
        result: normZero(e.result),
        angleUnit: e.angleUnit,
      });
    }
  }
  return { writable: true, ans: savedAns, items: cleanItems };
}

function feedbackText(fb) {
  if (!fb) return "";
  return fb.kind === "error" ? errorText(fb.key) : (t[fb.key] || "");
}

function feedbackTip(fb) {
  if (!fb) return "";
  const base = feedbackText(fb);
  return fb.kind === "copied" && fb.copiedText ? base + ": " + fb.copiedText : base;
}

function buildView() {
  const cfg = readSettings();
  const modeTag = cfg.angleUnit === "rad" ? "RAD" : "DEG";
  const hasAns = ans !== null;
  const hasState = hasAns || items.length > 0 || draft.length > 0;

  const menu = [
    { id: "copy-result", title: t.copyResult, disabled: !hasAns || copyInFlight },
    { id: "clear-all", title: t.clearAll, disabled: !hasState },
  ];

  if (!ready) {
    return { rows: [{ text: t.loading, color: "gray", size: "small" }], menu };
  }

  const fbText = feedbackText(feedback);
  const exprTip = feedback && feedback.kind === "error"
    ? fbText + "\n" + t.inputTip
    : t.inputTip;

  const canonAns = hasAns ? formatCanonical(ans) : "";
  const resultDisplay = !hasAns
    ? "\u2014"
    : (lastWidth < WIDE_RESULT_BP ? formatCompact(canonAns, 16) : canonAns);

  let statusText = writable ? modeTag : t.sessionOnly;
  let statusColor;
  let statusTip = writable ? modeTag : t.sessionOnly + " (" + modeTag + ")";
  if (feedback) {
    statusText = fbText;
    statusTip = feedbackTip(feedback);
    if (feedback.kind === "error" || feedback.kind === "copyFailed") statusColor = "red";
    else if (feedback.kind === "copyBusy") statusColor = "orange";
    else if (feedback.kind === "copied") statusColor = "green";
    else statusColor = "gray";
  } else if (!writable) {
    statusColor = "orange";
  } else {
    statusColor = "gray";
  }

  const statusCells = [
    { text: statusText, fill: true, align: "left", color: statusColor },
  ];
  if (hasAns) {
    statusCells.push({
      id: "copy-result",
      icon: ICON_COPY,
      width: 36,
      align: "center",
      tip: copyInFlight ? t.copying : t.copyResult,
    });
  }

  const rows = [
    {
      input: { type: "line", id: "expr-" + inputSeq, value: draft, placeholder: t.placeholder },
      tip: exprTip,
    },
    {
      cells: [{ text: resultDisplay, bold: true, fill: true, align: "right" }],
      tip: hasAns ? canonAns : undefined,
    },
    { cells: statusCells, tip: statusTip },
  ];

  if (items.length === 0) {
    rows.push({ pane: "history", text: t.noHistory, color: "gray", size: "small" });
  } else {
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      const canon = formatCanonical(it.result);
      const disp = formatCompact(canon, 9);
      const mLabel = it.angleUnit === "rad" ? "RAD" : "DEG";
      const row = {
        id: "hist-" + it.id,
        cells: [
          { text: it.expression, fill: true, align: "left" },
          { text: disp, width: 100, align: "right" },
        ],
        tip: it.expression + " = " + canon + " (" + mLabel + ")",
        menu: [
          { id: "hist-copy-" + it.id, title: t.copyResult, disabled: copyInFlight },
          { id: "hist-reuse-" + it.id, title: t.reuseExpr },
          { id: "hist-delete-" + it.id, title: t.deleteEntry },
        ],
      };
      if (i === 0) row.pane = "history";
      rows.push(row);
    }
  }

  const view = { rows, menu };
  if (cfg.showCaption && hasAns) {
    view.caption = canonAns.length <= MAX_CAPTION_LEN ? canonAns : formatCompact(canonAns, MAX_CAPTION_LEN);
  }
  return view;
}

function draw(force) {
  const view = buildView();
  const json = JSON.stringify(view);
  if (force || json !== lastViewJson) {
    lastViewJson = json;
    pf.show(view);
  }
}

function setFeedback(nextFeedback) {
  feedbackGen += 1;
  feedback = nextFeedback;
  return feedbackGen;
}

function copyValue(canonText) {
  if (copyInFlight) {
    setFeedback({ kind: "copyBusy", key: "copyBusy" });
    draw(false);
    return;
  }
  copyInFlight = true;
  const gen = setFeedback({ kind: "copying", key: "copying" });
  draw(false);

  let promise;
  try {
    promise = pf.clipboard.setText(canonText);
  } catch (_) {
    copyInFlight = false;
    if (feedbackGen === gen) {
      feedback = { kind: "copyFailed", key: "copyFailed" };
    }
    draw(false);
    return;
  }

  Promise.resolve(promise).then(
    () => {
      copyInFlight = false;
      if (feedbackGen === gen) {
        feedback = { kind: "copied", key: "copied", copiedText: canonText };
      }
      draw(false);
    },
    (err) => {
      copyInFlight = false;
      if (feedbackGen === gen) {
        const msg = err && typeof err.message === "string" ? err.message.toLowerCase() : "";
        if (msg.indexOf("busy") >= 0) {
          feedback = { kind: "copyBusy", key: "copyBusy" };
        } else {
          feedback = { kind: "copyFailed", key: "copyFailed" };
        }
      }
      draw(false);
    }
  );
}

function findHistory(idNum) {
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].id === idNum) return items[i];
  }
  return null;
}

function parseHistRowId(row) {
  if (typeof row !== "string" || !row.startsWith("hist-")) return -1;
  const n = Number(row.slice(5));
  return Number.isInteger(n) && n >= 1 ? n : -1;
}

async function load() {
  ready = false;
  stateRev = 0;
  savedRev = 0;
  saveInFlight = false;
  updateWidth(pf.fence && pf.fence.width);
  draw(true);

  let raw = null;
  let readFailed = false;
  try {
    raw = await pf.data.read(dataFile());
  } catch (_) {
    readFailed = true;
  }

  if (readFailed) {
    writable = false;
    ans = null;
    items = [];
  } else {
    const clean = sanitizeLoaded(raw);
    writable = clean.writable;
    ans = clean.ans;
    items = clean.items;
  }

  ready = true;
  draw(true);
}

pf.on("start", load);
pf.on("show", () => { draw(false); });

pf.on("resize", (size) => {
  const prevWide = lastWidth >= WIDE_RESULT_BP;
  const w = size && typeof size.width === "number" ? size.width : (pf.fence && pf.fence.width);
  updateWidth(w);
  const nextWide = lastWidth >= WIDE_RESULT_BP;
  if (prevWide !== nextWide) {
    draw(false);
  }
});

pf.on("settings", () => {
  if (!ready) return;
  draw(false);
});

pf.on("lang", () => {
  t = texts();
  lastViewJson = "";
  draw(true);
});

pf.on("text", (e) => {
  if (!ready || !e || typeof e.id !== "string" || typeof e.text !== "string") return;
  if (e.id !== "expr-" + inputSeq) return;

  // Retire the current edit-session ID synchronously so replayed Enter/blur events are no-ops.
  inputSeq += 1;

  const raw = e.text;
  if (raw.length > MAX_INPUT_LEN) {
    draft = "";
    setFeedback({ kind: "error", key: "errTooLong" });
    draw(false);
    return;
  }

  const trimmed = trimLexSpaces(raw);
  if (!trimmed) {
    draft = "";
    setFeedback(null);
    draw(false);
    return;
  }

  const parsed = parseExpression(trimmed);
  if (!parsed.ok) {
    draft = trimmed;
    setFeedback({ kind: "error", key: parsed.code });
    draw(false);
    return;
  }

  const cfg = readSettings();
  const evaluated = evaluateAst(parsed.ast, ans, cfg.angleUnit);
  if (!evaluated.ok) {
    draft = trimmed;
    setFeedback({ kind: "error", key: evaluated.code });
    draw(false);
    return;
  }

  ans = evaluated.value;
  items.unshift({
    id: nextHistId++,
    expression: trimmed,
    result: evaluated.value,
    angleUnit: cfg.angleUnit,
  });
  if (items.length > MAX_HISTORY) {
    items.length = MAX_HISTORY;
  }
  draft = "";
  setFeedback(null);
  persistState();
  draw(false);
});

pf.on("click", (e) => {
  if (!ready || !e || typeof e.id !== "string") return;
  if (e.id === "copy-result") {
    if (ans === null) return;
    copyValue(formatCanonical(ans));
  }
});

pf.on("command", (c) => {
  if (!ready || !c || typeof c.id !== "string" || c.via !== "menu") return;
  const hasRow = typeof c.row === "string" && c.row.length > 0;

  // Fence-level menu commands require no row id.
  if (!hasRow) {
    if (c.id === "copy-result") {
      if (ans === null) return;
      copyValue(formatCanonical(ans));
      return;
    }
    if (c.id === "clear-all") {
      if (ans === null && items.length === 0 && !draft) return;
      const hadSavedState = ans !== null || items.length > 0;
      ans = null;
      items = [];
      draft = "";
      inputSeq += 1;
      setFeedback(null);
      if (hadSavedState) persistState();
      draw(false);
    }
    return;
  }

  // Row-level history menu commands require a matching live history item.
  const rowNum = parseHistRowId(c.row);
  if (rowNum < 1) return;
  const item = findHistory(rowNum);
  if (!item) return;

  if (c.id === "hist-copy-" + rowNum) {
    copyValue(formatCanonical(item.result));
  } else if (c.id === "hist-reuse-" + rowNum) {
    draft = item.expression;
    inputSeq += 1;
    setFeedback(null);
    draw(false);
  } else if (c.id === "hist-delete-" + rowNum) {
    items = items.filter((it) => it.id !== rowNum);
    persistState();
    draw(false);
  }
});

pf.on("stop", () => {
  if (!ready || !writable || stateRev <= savedRev) return;
  try {
    pf.data.write(dataFile(), JSON.stringify(buildSnapshot())).catch(() => {});
  } catch (_) {}
});
