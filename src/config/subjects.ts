export interface SubTopic {
  name: string;
  slug: string;
}

export interface Topic {
  name: string;
  slug: string;
  subTopics: SubTopic[];
}

export interface Subject {
  name: string;
  slug: string;
  topics: Topic[];
}

export const SUBJECTS: Subject[] = [
  {
    name: "Quantitative Aptitude",
    slug: "quantitative-aptitude",
    topics: [
      {
        name: "Percentage",
        slug: "percentage",
        subTopics: [
          { name: "Basic Percentage", slug: "basic-percentage" },
          { name: "Successive Percentage", slug: "successive-percentage" },
          { name: "Population-based Problems", slug: "population-based-problems" },
        ],
      },
      {
        name: "Profit and Loss",
        slug: "profit-and-loss",
        subTopics: [
          { name: "Basic Profit & Loss", slug: "basic-profit-and-loss" },
          { name: "Dishonest Dealing", slug: "dishonest-dealing" },
          { name: "Successive Selling", slug: "successive-selling" },
          { name: "Partnership", slug: "partnership" },
        ],
      },
      {
        name: "Simple Interest",
        slug: "simple-interest",
        subTopics: [
          { name: "Basic SI", slug: "basic-si" },
          { name: "SI with Time & Rate", slug: "si-with-time-and-rate" },
        ],
      },
      {
        name: "Compound Interest",
        slug: "compound-interest",
        subTopics: [
          { name: "Basic CI", slug: "basic-ci" },
          { name: "CI vs SI Difference", slug: "ci-vs-si-difference" },
          { name: "Half-yearly & Quarterly", slug: "half-yearly-and-quarterly" },
        ],
      },
      {
        name: "Ratio and Proportion",
        slug: "ratio-and-proportion",
        subTopics: [
          { name: "Basic Ratio", slug: "basic-ratio" },
          { name: "Proportion", slug: "proportion" },
          { name: "Mixtures & Alligation", slug: "mixtures-and-alligation" },
        ],
      },
      {
        name: "Average",
        slug: "average",
        subTopics: [
          { name: "Basic Average", slug: "basic-average" },
          { name: "Weighted Average", slug: "weighted-average" },
          { name: "Average of Groups", slug: "average-of-groups" },
        ],
      },
      {
        name: "Time and Work",
        slug: "time-and-work",
        subTopics: [
          { name: "Basic Time & Work", slug: "basic-time-and-work" },
          { name: "Pipes & Cisterns", slug: "pipes-and-cisterns" },
          { name: "Work Efficiency", slug: "work-efficiency" },
          { name: "Alternate Days Work", slug: "alternate-days-work" },
        ],
      },
      {
        name: "Time, Speed and Distance",
        slug: "time-speed-and-distance",
        subTopics: [
          { name: "Basic Speed & Distance", slug: "basic-speed-and-distance" },
          { name: "Relative Speed", slug: "relative-speed" },
          { name: "Trains", slug: "trains" },
          { name: "Boats & Streams", slug: "boats-and-streams" },
          { name: "Circular Motion", slug: "circular-motion" },
        ],
      },
      {
        name: "Number System",
        slug: "number-system",
        subTopics: [
          { name: "Divisibility Rules", slug: "divisibility-rules" },
          { name: "Remainders", slug: "remainders" },
          { name: "HCF & LCM", slug: "hcf-and-lcm" },
          { name: "Factors & Multiples", slug: "factors-and-multiples" },
        ],
      },
      {
        name: "Simplification",
        slug: "simplification",
        subTopics: [
          { name: "BODMAS", slug: "bodmas" },
          { name: "Surds & Indices", slug: "surds-and-indices" },
          { name: "Approximation", slug: "approximation" },
        ],
      },
      {
        name: "Data Interpretation",
        slug: "data-interpretation",
        subTopics: [
          { name: "Tables", slug: "tables" },
          { name: "Bar Graphs", slug: "bar-graphs" },
          { name: "Line Graphs", slug: "line-graphs" },
          { name: "Pie Charts", slug: "pie-charts" },
          { name: "Caselets", slug: "caselets" },
          { name: "Mixed DI", slug: "mixed-di" },
        ],
      },
      {
        name: "Number Series",
        slug: "number-series",
        subTopics: [
          { name: "Missing Number", slug: "missing-number" },
          { name: "Wrong Number", slug: "wrong-number" },
        ],
      },
      {
        name: "Quadratic Equations",
        slug: "quadratic-equations",
        subTopics: [
          { name: "Find Roots", slug: "find-roots" },
          { name: "Compare Values", slug: "compare-values" },
        ],
      },
      {
        name: "Mensuration",
        slug: "mensuration",
        subTopics: [
          { name: "2D Shapes", slug: "2d-shapes" },
          { name: "3D Shapes", slug: "3d-shapes" },
        ],
      },
      {
        name: "Probability",
        slug: "probability",
        subTopics: [
          { name: "Basic Probability", slug: "basic-probability" },
          { name: "Permutation & Combination", slug: "permutation-and-combination" },
        ],
      },
      {
        name: "Age Problems",
        slug: "age-problems",
        subTopics: [
          { name: "Basic Age Problems", slug: "basic-age-problems" },
          { name: "Ratio-based Age", slug: "ratio-based-age" },
        ],
      },
    ],
  },
  {
    name: "Reasoning Ability",
    slug: "reasoning-ability",
    topics: [
      {
        name: "Syllogism",
        slug: "syllogism",
        subTopics: [
          { name: "Basic Syllogism", slug: "basic-syllogism" },
          { name: "Either-Or Cases", slug: "either-or-cases" },
          { name: "Reverse Syllogism", slug: "reverse-syllogism" },
        ],
      },
      {
        name: "Coding-Decoding",
        slug: "coding-decoding",
        subTopics: [
          { name: "Letter Coding", slug: "letter-coding" },
          { name: "Number Coding", slug: "number-coding" },
          { name: "Sentence Coding", slug: "sentence-coding" },
          { name: "New Pattern Coding", slug: "new-pattern-coding" },
        ],
      },
      {
        name: "Inequalities",
        slug: "inequalities",
        subTopics: [
          { name: "Direct Inequalities", slug: "direct-inequalities" },
          { name: "Coded Inequalities", slug: "coded-inequalities" },
        ],
      },
      {
        name: "Blood Relations",
        slug: "blood-relations",
        subTopics: [
          { name: "Basic Blood Relations", slug: "basic-blood-relations" },
          { name: "Coded Blood Relations", slug: "coded-blood-relations" },
          { name: "Family Tree Puzzles", slug: "family-tree-puzzles" },
        ],
      },
      {
        name: "Direction Sense",
        slug: "direction-sense",
        subTopics: [
          { name: "Basic Directions", slug: "basic-directions" },
          { name: "Shadow-based", slug: "shadow-based" },
          { name: "Distance & Direction", slug: "distance-and-direction" },
        ],
      },
      {
        name: "Order and Ranking",
        slug: "order-and-ranking",
        subTopics: [
          { name: "Linear Ranking", slug: "linear-ranking" },
          { name: "Comparison-based", slug: "comparison-based" },
        ],
      },
      {
        name: "Seating Arrangement",
        slug: "seating-arrangement",
        subTopics: [
          { name: "Linear (Single Row)", slug: "linear-single-row" },
          { name: "Linear (Double Row)", slug: "linear-double-row" },
          { name: "Circular", slug: "circular" },
          { name: "Rectangular / Square", slug: "rectangular-square" },
        ],
      },
      {
        name: "Puzzles",
        slug: "puzzles",
        subTopics: [
          { name: "Floor-based Puzzles", slug: "floor-based-puzzles" },
          { name: "Scheduling Puzzles", slug: "scheduling-puzzles" },
          { name: "Box-based Puzzles", slug: "box-based-puzzles" },
          { name: "Comparison Puzzles", slug: "comparison-puzzles" },
          { name: "Multi-parameter Puzzles", slug: "multi-parameter-puzzles" },
        ],
      },
      {
        name: "Alphanumeric Series",
        slug: "alphanumeric-series",
        subTopics: [
          { name: "Letter Series", slug: "letter-series" },
          { name: "Number Series", slug: "number-series" },
          { name: "Mixed Series", slug: "mixed-series" },
        ],
      },
      {
        name: "Input-Output",
        slug: "input-output",
        subTopics: [
          { name: "Word Rearrangement", slug: "word-rearrangement" },
          { name: "Number Rearrangement", slug: "number-rearrangement" },
        ],
      },
      {
        name: "Data Sufficiency",
        slug: "data-sufficiency",
        subTopics: [
          { name: "Quantitative DS", slug: "quantitative-ds" },
          { name: "Reasoning DS", slug: "reasoning-ds" },
        ],
      },
      {
        name: "Logical Reasoning",
        slug: "logical-reasoning",
        subTopics: [
          { name: "Statement & Assumption", slug: "statement-and-assumption" },
          { name: "Statement & Conclusion", slug: "statement-and-conclusion" },
          { name: "Cause & Effect", slug: "cause-and-effect" },
          { name: "Course of Action", slug: "course-of-action" },
          { name: "Strong & Weak Arguments", slug: "strong-and-weak-arguments" },
        ],
      },
    ],
  },
  {
    name: "English Language",
    slug: "english-language",
    topics: [
      {
        name: "Reading Comprehension",
        slug: "reading-comprehension",
        subTopics: [
          { name: "Main Idea", slug: "main-idea" },
          { name: "Inference-based", slug: "inference-based" },
          { name: "Vocabulary in Context", slug: "vocabulary-in-context" },
          { name: "Tone & Style", slug: "tone-and-style" },
        ],
      },
      {
        name: "Cloze Test",
        slug: "cloze-test",
        subTopics: [
          { name: "Single Blank", slug: "single-blank" },
          { name: "Double Blank", slug: "double-blank" },
          { name: "New Pattern Cloze", slug: "new-pattern-cloze" },
        ],
      },
      {
        name: "Error Detection",
        slug: "error-detection",
        subTopics: [
          { name: "Grammar-based Errors", slug: "grammar-based-errors" },
          { name: "Vocabulary-based Errors", slug: "vocabulary-based-errors" },
          { name: "Sentence Correction", slug: "sentence-correction" },
        ],
      },
      {
        name: "Sentence Rearrangement",
        slug: "sentence-rearrangement",
        subTopics: [
          { name: "Para Jumbles", slug: "para-jumbles" },
          { name: "Sentence Connectors", slug: "sentence-connectors" },
        ],
      },
      {
        name: "Fill in the Blanks",
        slug: "fill-in-the-blanks",
        subTopics: [
          { name: "Single Fill", slug: "single-fill" },
          { name: "Double Fill", slug: "double-fill" },
          { name: "Phrasal Verbs", slug: "phrasal-verbs" },
          { name: "Idioms & Phrases", slug: "idioms-and-phrases" },
        ],
      },
      {
        name: "Word Usage / Vocabulary",
        slug: "word-usage-vocabulary",
        subTopics: [
          { name: "Synonyms", slug: "synonyms" },
          { name: "Antonyms", slug: "antonyms" },
          { name: "One Word Substitution", slug: "one-word-substitution" },
          { name: "Spelling Errors", slug: "spelling-errors" },
        ],
      },
      {
        name: "Sentence Completion",
        slug: "sentence-completion",
        subTopics: [
          { name: "Starters", slug: "starters" },
          { name: "Connectors", slug: "connectors" },
          { name: "Fillers", slug: "fillers" },
        ],
      },
      {
        name: "Column-based Matching",
        slug: "column-based-matching",
        subTopics: [
          { name: "Sentence Matching", slug: "sentence-matching" },
          { name: "Phrase Matching", slug: "phrase-matching" },
        ],
      },
    ],
  },
  {
    name: "General / Financial Awareness",
    slug: "general-financial-awareness",
    topics: [
      {
        name: "Banking Awareness",
        slug: "banking-awareness",
        subTopics: [
          { name: "Types of Banks", slug: "types-of-banks" },
          { name: "Banking Terms", slug: "banking-terms" },
          { name: "RBI Functions & Policies", slug: "rbi-functions-and-policies" },
          { name: "Monetary Policy", slug: "monetary-policy" },
          { name: "Financial Inclusion", slug: "financial-inclusion" },
          { name: "Banking Regulations", slug: "banking-regulations" },
        ],
      },
      {
        name: "Financial Awareness",
        slug: "financial-awareness",
        subTopics: [
          { name: "Capital Markets", slug: "capital-markets" },
          { name: "Insurance", slug: "insurance" },
          { name: "Mutual Funds", slug: "mutual-funds" },
          { name: "Budget & Fiscal Policy", slug: "budget-and-fiscal-policy" },
          { name: "Financial Institutions", slug: "financial-institutions" },
        ],
      },
      {
        name: "Current Affairs",
        slug: "current-affairs",
        subTopics: [
          { name: "National", slug: "national" },
          { name: "International", slug: "international" },
          { name: "Awards & Honours", slug: "awards-and-honours" },
          { name: "Sports", slug: "sports" },
          { name: "Books & Authors", slug: "books-and-authors" },
          { name: "Summits & Conferences", slug: "summits-and-conferences" },
        ],
      },
      {
        name: "Static GK",
        slug: "static-gk",
        subTopics: [
          { name: "Indian Polity", slug: "indian-polity" },
          { name: "Indian Economy", slug: "indian-economy" },
          { name: "Geography", slug: "geography" },
          { name: "History", slug: "history" },
          { name: "Science", slug: "science" },
          { name: "Important Dates & Days", slug: "important-dates-and-days" },
        ],
      },
      {
        name: "Government Schemes",
        slug: "government-schemes",
        subTopics: [
          { name: "Central Government Schemes", slug: "central-government-schemes" },
          { name: "State Government Schemes", slug: "state-government-schemes" },
          { name: "Financial Inclusion Schemes", slug: "financial-inclusion-schemes" },
        ],
      },
    ],
  },
  {
    name: "Computer Knowledge",
    slug: "computer-knowledge",
    topics: [
      {
        name: "Computer Fundamentals",
        slug: "computer-fundamentals",
        subTopics: [
          { name: "History of Computers", slug: "history-of-computers" },
          { name: "Generations of Computers", slug: "generations-of-computers" },
          { name: "Types of Computers", slug: "types-of-computers" },
          { name: "Input & Output Devices", slug: "input-and-output-devices" },
          { name: "Memory & Storage", slug: "memory-and-storage" },
        ],
      },
      {
        name: "Software",
        slug: "software",
        subTopics: [
          { name: "System Software", slug: "system-software" },
          { name: "Application Software", slug: "application-software" },
          { name: "Operating Systems", slug: "operating-systems" },
          { name: "Programming Languages", slug: "programming-languages" },
        ],
      },
      {
        name: "Networking",
        slug: "networking",
        subTopics: [
          { name: "Network Types (LAN, WAN, MAN)", slug: "network-types" },
          { name: "Internet & Protocols", slug: "internet-and-protocols" },
          { name: "Network Devices", slug: "network-devices" },
          { name: "Cloud Computing", slug: "cloud-computing" },
        ],
      },
      {
        name: "Database Management",
        slug: "database-management",
        subTopics: [
          { name: "DBMS Concepts", slug: "dbms-concepts" },
          { name: "SQL Basics", slug: "sql-basics" },
          { name: "Keys & Normalization", slug: "keys-and-normalization" },
        ],
      },
      {
        name: "Cyber Security",
        slug: "cyber-security",
        subTopics: [
          { name: "Viruses & Malware", slug: "viruses-and-malware" },
          { name: "Firewalls & Encryption", slug: "firewalls-and-encryption" },
          { name: "Cyber Crimes", slug: "cyber-crimes" },
          { name: "Digital Signatures", slug: "digital-signatures" },
        ],
      },
      {
        name: "MS Office",
        slug: "ms-office",
        subTopics: [
          { name: "MS Word", slug: "ms-word" },
          { name: "MS Excel", slug: "ms-excel" },
          { name: "MS PowerPoint", slug: "ms-powerpoint" },
          { name: "MS Access", slug: "ms-access" },
        ],
      },
      {
        name: "Number Systems & Logic Gates",
        slug: "number-systems-and-logic-gates",
        subTopics: [
          { name: "Binary, Octal, Hexadecimal", slug: "binary-octal-hexadecimal" },
          { name: "Logic Gates", slug: "logic-gates" },
          { name: "Boolean Algebra", slug: "boolean-algebra" },
        ],
      },
    ],
  },
];
