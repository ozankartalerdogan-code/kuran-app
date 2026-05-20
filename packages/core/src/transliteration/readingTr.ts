export interface ReadingTrNormalizationResult {
  input: string;
  output: string;
  phraseMatches: string[];
  dictionaryMatches: string[];
  ruleMatches: string[];
  suspiciousMatches: string[];
}

type ReplacementRule = {
  name: string;
  pattern: RegExp;
  replacement: string;
};

type SuspiciousPattern = {
  name: string;
  pattern: RegExp;
};

const phraseReplacements = new Map<string, string>([
  ["Bismi Allahi alrrahmani alrraheemi", "Bismillahirrahmanirrahim"],
  ["Alhamdu lillahi rabbi alAAalameena", "Elhamdulillahi rabbil alemin"],
  ["Alrrahmani alrraheemi", "Errahmanirrahim"],
  ["Maliki yawmi alddeeni", "Maliki yevmiddin"],
  ["Iyyaka naAAbudu waiyyaka nastaAAeenu", "Iyyake nabudu ve iyyake nestein"],
  ["Ihdina alssirata almustaqeema", "Ihdinas siratal mustakim"],
  [
    "Sirata allatheena anAAamta AAalayhim ghayri almaghdoobi AAalayhim wala alddalleena",
    "Siratallezine enamte aleyhim gayril magdubi aleyhim veleddallin"
  ],
  ["Qul huwa Allahu ahadun", "Kul huvallahu ehad"],
  ["Allahu alssamadu", "Allahus samed"],
  ["Lam yalid walam yooladu", "Lem yelid ve lem yuled"],
  ["Walam yakun lahu kufuwan ahadun", "Ve lem yekun lehu kufuven ehad"],
  ["Qul aAAoothu birabbi alfalaqi", "Kul euzu birabbil felak"],
  ["Min sharri ma khalaqa", "Min serri ma halak"],
  ["Wamin sharri ghasiqin itha waqaba", "Ve min serri gasikin iza vakab"],
  ["Wamin sharri alnnaffathati fee alAAuqadi", "Ve min serrin neffasati fil ukad"],
  ["Wamin sharri hasidin itha hasada", "Ve min serri hasidin iza hased"],
  ["Qul aAAoothu birabbi alnnasi", "Kul euzu birabbin nas"],
  ["Maliki alnnasi", "Melikin nas"],
  ["Ilahi alnnasi", "Ilahin nas"],
  ["Min sharri alwaswasi alkhannasi", "Min serril vesvasil hannas"],
  ["Allathee yuwaswisu fee sudoori alnnasi", "Ellezi yuvesvisu fi sudurin nas"],
  ["Mina aljinnati wa alnnasm", "Minel cinneti ven nas"],
  ["Inna aAAtaynaka alkawthara", "Inna ataynake kevser"],
  ["Fasalli lirabbika wainhar", "Fesalli lirabbike venhar"],
  ["Inna shaniaka huwa alabtaru", "Inne sanieke huvel ebter"],
  ["WaalAAasri", "Vel asr"],
  ["Inna alinsana lafee khusrin", "Innel insane lefi husr"],
  [
    "Illa allatheena amanoo waAAamiloo alssalihati watawasaw bialhaqqi watawasaw bialssabri",
    "Illallezine amenu ve amilus salihati ve tevasav bil hakki ve tevasav bis sabr"
  ],
  ["Aliflammeem", "Elif lam mim"],
  ["Thalika alkitabu la rayba feehi hudan lilmuttaqeena", "Zalik el kitabu la rayb fihi, huda lil muttakin"],
  [
    "Allatheena yuminoona bialghaybi wayuqeemoona alssalata wamimma razaqnahum yunfiqoona",
    "Ellezine yuminun bil gaybi ve yukimunes salate ve mimma razaknahum yunfikun"
  ],
  [
    "Waallatheena yuminoona bima onzila ilayka wama onzila min qablika wabialakhirati hum yooqinoona",
    "Vellezine yuminun bima unzile ileyke ve ma unzile min kablike ve bil ahiret hum yukinun"
  ],
  [
    "Olaika AAala hudan min rabbihim waolaika humu almuflihoona",
    "Ulaike ala huda min rabbihim ve ulaike humul muflihun"
  ]
]);

const dictionaryReplacements = new Map<string, string>([
  ["Bismi Allahi", "Bismillahi"],
  ["Allahi", "Allahi"],
  ["Allahu", "Allahu"],
  ["alrrahmani", "errahmani"],
  ["alrraheemi", "errahimi"],
  ["Alrrahmani", "Errahmani"],
  ["Alhamdu", "Elhamdu"],
  ["lillahi", "lillahi"],
  ["alAAalameena", "al alemina"],
  ["alddeeni", "eddini"],
  ["Iyyaka", "Iyyake"],
  ["naAAbudu", "nabudu"],
  ["waiyyaka", "ve iyyake"],
  ["nastaAAeenu", "nesteinu"],
  ["Ihdina", "Ihdina"],
  ["alssirata", "essirata"],
  ["almustaqeema", "almustakima"],
  ["Sirata", "Sirata"],
  ["allatheena", "allezine"],
  ["Allatheena", "Ellezine"],
  ["waallatheena", "vellezine"],
  ["Waallatheena", "Vellezine"],
  ["allathee", "ellezi"],
  ["anAAamta", "enamte"],
  ["AAalayhim", "aleyhim"],
  ["AAalayhi", "aleyhi"],
  ["AAalaykum", "aleykum"],
  ["AAala", "ala"],
  ["ghayri", "gayri"],
  ["almaghdoobi", "almagdubi"],
  ["wala", "ve la"],
  ["alddalleena", "eddallina"],
  ["Qul", "Kul"],
  ["aAAoothu", "euzu"],
  ["alfalaqi", "alfelaki"],
  ["alnnasi", "ennasi"],
  ["alssamadu", "essamedu"],
  ["yooladu", "yuladu"],
  ["feehi", "fihi"],
  ["fee", "fi"],
  ["ilayka", "ileyke"],
  ["ilaykum", "ileykum"],
  ["sudoori", "suduri"],
  ["Allathee", "Ellezi"],
  ["alkawthara", "elkevser"],
  ["wainhar", "venhar"],
  ["alinsana", "elinsane"],
  ["lafee", "lefi"],
  ["khusrin", "husrin"],
  ["bialghaybi", "bil gaybi"],
  ["wabialakhirati", "ve bil ahirati"],
  ["onzila", "unzile"],
  ["qablika", "kablike"],
  ["raybe", "rayb"],
  ["huden", "huda"],
  ["Zalikel", "Zalik el"],
  ["zalikel", "zalik el"],
  ["lilmuttaqeena", "lil muttakin"],
  ["muttekin", "muttakin"],
  ["muttakina", "muttakin"],
  ["Olaika", "Ulaike"],
  ["yooqinoona", "yukinun"],
  ["yuminoona", "yuminun"],
  ["yuminune", "yuminun"],
  ["yuqeemoona", "yukimune"],
  ["alssalata", "essalate"],
  ["ahirati", "ahiret"],
  ["razaqnahum", "razaknahum"],
  ["yunfiqoona", "yunfikun"]
]);

const replacementRules: ReplacementRule[] = [
  {
    name: "word-initial-wa-to-ve",
    pattern: /\bwa(?=[a-z])/giu,
    replacement: "ve "
  },
  {
    name: "sun-letter-alr",
    pattern: /\balr/giu,
    replacement: "err"
  },
  {
    name: "sun-letter-alss",
    pattern: /\balss/giu,
    replacement: "ess"
  },
  {
    name: "sun-letter-aldd",
    pattern: /\baldd/giu,
    replacement: "edd"
  },
  {
    name: "ayn-aa",
    pattern: /AA/gu,
    replacement: ""
  },
  {
    name: "long-ee",
    pattern: /ee/giu,
    replacement: "i"
  },
  {
    name: "long-oo",
    pattern: /oo/giu,
    replacement: "u"
  },
  {
    name: "gh-to-g",
    pattern: /gh/giu,
    replacement: "g"
  },
  {
    name: "q-to-k",
    pattern: /q/giu,
    replacement: "k"
  }
];

const suspiciousPatterns: SuspiciousPattern[] = [
  {
    name: "technical-ayn-AA",
    pattern: /AA/u
  },
  {
    name: "unresolved-sun-letter-alnn",
    pattern: /\balnn/iu
  },
  {
    name: "unresolved-bi-prefix",
    pattern: /\bbial/iu
  },
  {
    name: "english-th-digraph",
    pattern: /th/iu
  },
  {
    name: "english-kh-digraph",
    pattern: /kh/iu
  },
  {
    name: "english-sh-digraph",
    pattern: /sh/iu
  }
];

function applyPhraseDictionary(
  text: string
): Pick<ReadingTrNormalizationResult, "output" | "phraseMatches"> {
  const phraseMatches: string[] = [];
  let output = text;

  for (const [source, replacement] of phraseReplacements) {
    if (output.includes(source)) {
      phraseMatches.push(source);
      output = output.replaceAll(source, replacement);
    }
  }

  return {
    output,
    phraseMatches
  };
}

function applyDictionary(
  text: string
): Pick<ReadingTrNormalizationResult, "output" | "dictionaryMatches"> {
  const dictionaryMatches: string[] = [];
  let output = text;

  for (const [source, replacement] of dictionaryReplacements) {
    const pattern = new RegExp(`\\b${source}\\b`, "gu");

    if (pattern.test(output)) {
      dictionaryMatches.push(source);
      output = output.replace(pattern, replacement);
    }
  }

  return {
    output,
    dictionaryMatches
  };
}

function getSuspiciousMatches(text: string): string[] {
  return suspiciousPatterns
    .filter((pattern) => pattern.pattern.test(text))
    .map((pattern) => pattern.name);
}

function applyRules(text: string): Pick<ReadingTrNormalizationResult, "output" | "ruleMatches"> {
  const ruleMatches: string[] = [];
  let output = text;

  for (const rule of replacementRules) {
    rule.pattern.lastIndex = 0;

    if (rule.pattern.test(output)) {
      ruleMatches.push(rule.name);
      rule.pattern.lastIndex = 0;
      output = output.replace(rule.pattern, rule.replacement);
    }
  }

  return {
    output,
    ruleMatches
  };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function postProcessReadableText(text: string): string {
  return normalizeWhitespace(
    text
      .replace(/\bfih\b/giu, "fihi")
      .replace(/\bzalikel\b/giu, "zalik el")
      .replace(/\braybe\b/giu, "rayb")
      .replace(/\bhuden\b/giu, "huda")
      .replace(/\bmuttekin\b/giu, "muttakin")
      .replace(/\bmuttakina\b/giu, "muttakin")
      .replace(/\byuminune\b/giu, "yuminun")
      .replace(/\bahirati\b/giu, "ahiret")
      .replace(/\bve\s+bil\s+ahirati\b/giu, "ve bil ahirati")
      .replace(/\bve\s+la\b/giu, "ve la")
      .replace(/\bve\s+ve\b/giu, "ve")
      .replace(/\s+,/gu, ",")
  );
}

export function normalizeTransliterationToReadingTrDetailed(
  text: string | null | undefined
): ReadingTrNormalizationResult | null {
  const input = text?.trim() ?? "";

  if (!input) {
    return null;
  }

  const phraseResult = applyPhraseDictionary(input);
  const dictionaryResult = applyDictionary(phraseResult.output);
  const ruleResult = applyRules(dictionaryResult.output);
  const output = postProcessReadableText(ruleResult.output);

  return {
    input,
    output,
    phraseMatches: phraseResult.phraseMatches,
    dictionaryMatches: dictionaryResult.dictionaryMatches,
    ruleMatches: ruleResult.ruleMatches,
    suspiciousMatches: getSuspiciousMatches(output)
  };
}

export function normalizeTransliterationToReadingTr(
  text: string | null | undefined
): string | null {
  return normalizeTransliterationToReadingTrDetailed(text)?.output ?? null;
}
