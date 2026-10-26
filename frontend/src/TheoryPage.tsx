import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Search,
  MessageSquare,
  Layers,
  Monitor,
  Server,
  ArrowUpRight,
  Check,
  Info,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./components/ui/accordion";
const copy = {
  fr: {
    label: "LE GUIDE",
    title: "Comprendre le RAG.",
    intro:
      "Comment passer d’un dossier de documents à une réponse que l’on peut vérifier. Les principes, un exemple et les technologies qui les rendent possibles.",
    reading: "6 min de lecture",
    nav: [
      "Le principe",
      "Un exemple complet",
      "Les technologies",
      "Les points de vigilance",
    ],
    definition: "Une réponse, avec ses références.",
    definitionText:
      "RAG signifie Retrieval-Augmented Generation : une génération enrichie par la recherche. Au lieu de répondre uniquement avec ce que le modèle a appris pendant son entraînement, on lui fournit des passages retrouvés dans vos documents au moment de la question.",
    analogy:
      "Comme un collègue qui consulte le bon dossier avant de vous répondre, puis vous indique la page qu’il a utilisée.",
    stages: ["Préparer", "Retrouver", "Répondre"],
    stageTexts: [
      "Lire les documents, les découper et construire un index de recherche.",
      "Comparer la question aux passages, classer les candidats et sélectionner le contexte.",
      "Fournir ce contexte au modèle et produire une réponse accompagnée de citations.",
    ],
    separation:
      "L’indexation prépare les sources. La recherche choisit les preuves. La génération rédige. Ce sont trois opérations différentes.",
    example: "Suivez une question de bout en bout.",
    exampleIntro:
      "Un guide RH fictif, trois questions et le même parcours. Changez de question, puis explorez les trois étapes.",
    demo: "Exemple pédagogique · aucun appel NVIDIA",
    questions: ["Les congés", "La formation", "Information absente"],
    queryLabel: "La question",
    queries: [
      "Combien de jours de congés payés par an ?",
      "Quel est le budget annuel de formation ?",
      "Quel est le montant de la prime de Noël ?",
    ],
    guide: "guide-rh.pdf",
    passages: [
      "Les salariés disposent de 25 jours de congés payés par an.",
      "Le budget annuel de formation est de 500 euros par salarié.",
      "Le télétravail est autorisé deux jours par semaine.",
    ],
    ingestion: "Préparation des sources",
    ingestionText:
      "Le texte de chaque page devient un passage identifiable. L’encodeur E5 en calcule un vecteur pour la recherche sémantique ; les termes du passage servent à BM25.",
    retrieval: "Recherche dans le guide",
    retrievalText:
      "E5 recherche un sens proche. BM25 privilégie les termes distinctifs. RRF fusionne leurs rangs. Les règles de sélection déterminent ensuite quels passages entrent dans le contexte.",
    selected: "Passage retenu pour cet exemple",
    none: "Aucun passage ne contient l’information demandée. Le contexte reste vide.",
    demonstration:
      "Cette sélection est une illustration guidée. Elle n’exécute ni E5 ni BM25 et n’affiche pas de scores inventés. Pour les calculs réels, utilisez Documents puis Architecture.",
    generation: "Réponse illustrée",
    answers: [
      "Les salariés disposent de 25 jours de congés payés par an. [1]",
      "Le budget annuel de formation est de 500 euros par salarié. [1]",
      "Les passages disponibles ne permettent pas de répondre sur la prime de Noël.",
    ],
    answerNote:
      "Dans l’application, cette étape exige votre accord : la question et les extraits sélectionnés passent par le serveur vers NVIDIA. La clé API reste côté serveur.",
    absentNote:
      "Dans l’application, sans passage admissible, aucun appel de génération n’est lancé. Refuser vaut mieux qu’inventer.",
    citation:
      "La référence renvoie au passage d’origine. Elle permet de vérifier la réponse ; elle n’en garantit pas automatiquement la justesse.",
    stackTitle: "Chaque technologie a un rôle précis.",
    stackIntro:
      "Deux espaces de travail : le navigateur prépare et recherche ; le serveur valide et demande la rédaction. Voici comment les pièces s’assemblent.",
    local: "Dans le navigateur",
    remote: "Sur le serveur et chez NVIDIA",
    purpose: "Objectif",
    connection: "Comment elle s’imbrique",
    layers: [
      [
        "Interface & orchestration",
        "React · TypeScript · shadcn/ui · Vite",
        "React pilote les écrans et la session. TypeScript décrit les contrats. shadcn/ui fournit les composants accessibles. Vite construit les fichiers statiques.",
        "Les interactions lancent les traitements dans des Web Workers pour garder l’interface réactive. Les documents et l’index vivent dans la mémoire de la session.",
      ],
      [
        "Lecture des PDF",
        "PDF.js · Tesseract.js",
        "PDF.js extrait le texte avec la provenance fichier/page. Si la page a trop peu de texte, Tesseract reconnaît les caractères de son image en français ou en anglais.",
        "Le texte extrait est découpé par page en passages. Le tokenizer mesure leur taille réelle : il ne s’agit pas d’une estimation en nombre de mots.",
      ],
      [
        "Index & recherche hybride",
        "Transformers.js · ONNX Runtime · E5 · BM25",
        "E5 multilingue convertit passages et question en vecteurs de 384 dimensions. Le cosinus compare leurs directions. BM25 calcule une correspondance lexicale fondée sur fréquence et rareté des termes.",
        "Transformers.js charge E5 et son tokenizer ; ONNX Runtime exécute le modèle dans le navigateur. Les préfixes passage: et query: indiquent au modèle ce qu’il encode. Les poids du modèle peuvent être téléchargés ; les PDF ne sont pas envoyés à Hugging Face.",
      ],
      [
        "Fusion & sélection",
        "RRF · seuil de cosinus · budget de contexte",
        "RRF additionne 1/(60 + rang) pour les 20 premiers de chaque liste. On fusionne des rangs, pas des scores BM25 et cosinus d’échelles différentes.",
        "Les passages suivent l’ordre RRF. Il faut un cosinus ≥ 0,78, une contribution au classement et de la place : au plus 4 passages et 1 600 tokens E5. Ce seuil est une règle heuristique, pas une probabilité de vérité.",
      ],
      [
        "Génération & références",
        "Vercel Functions · NVIDIA · GPT-OSS",
        "Une fonction Node.js vérifie consentement, tailles et structure, puis appelle openai/gpt-oss-20b via l’API NVIDIA à destination fixe.",
        "La requête contient la question, la langue et les passages choisis, jamais le PDF complet ni ses vecteurs. Le JSON retourné est contrôlé, et les identifiants de citation sont reliés aux fichiers/pages reçus. Le serveur ne peut pas authentifier un PDF qu’il n’a pas reçu.",
      ],
    ],
    cautionsTitle: "Ce que le RAG permet. Et ce qu’il faut vérifier.",
    cautions: [
      [
        "Ce n’est pas un réentraînement",
        "Indexer un PDF ne modifie pas les poids d’E5 ou de GPT-OSS. L’application construit un index temporaire et fournit des extraits lors de la génération.",
      ],
      [
        "La qualité commence dans les sources",
        "Une page manquante, une erreur d’OCR ou un mauvais découpage peut faire perdre une information. Commencez par consulter le texte réellement extrait.",
      ],
      [
        "Retrouver n’est pas prouver",
        "Un passage proche peut être hors sujet. La fusion et le seuil aident à sélectionner ; ils ne démontrent pas qu’une réponse est vraie.",
      ],
      [
        "Une citation doit être relue",
        "Vérifiez la page, la date, le périmètre et les exceptions. Une référence valide ne prouve pas à elle seule que le modèle a bien interprété le passage.",
      ],
    ],
    closing: "Passez de la théorie à vos documents.",
    try: "Ouvrir les documents",
    architecture: "Explorer les calculs",
    privacy:
      "Aucun compteur de demandes n’est appliqué par l’application. Les bornes techniques et les conditions des fournisseurs restent distinctes.",
  },
  en: {
    label: "THE GUIDE",
    title: "Understanding RAG.",
    intro:
      "How to turn a folder of documents into an answer you can verify. The principles, a worked example and the technologies behind them.",
    reading: "6 min read",
    nav: [
      "The principle",
      "A worked example",
      "The technology",
      "What to watch for",
    ],
    definition: "An answer, with its references.",
    definitionText:
      "RAG stands for Retrieval-Augmented Generation. Instead of relying only on what a model learned during training, we provide passages retrieved from your documents when you ask a question.",
    analogy:
      "Like a colleague who opens the right file before answering, then points you to the page they used.",
    stages: ["Prepare", "Retrieve", "Answer"],
    stageTexts: [
      "Read documents, split them and build a searchable index.",
      "Compare the question with passages, rank candidates and select context.",
      "Provide that context to the model and produce an answer with citations.",
    ],
    separation:
      "Indexing prepares sources. Retrieval chooses evidence. Generation writes the answer. These are three different operations.",
    example: "Follow a question from start to finish.",
    exampleIntro:
      "A fictional staff guide, three questions and one pipeline. Change the question, then explore all three steps.",
    demo: "Educational example · no NVIDIA calls",
    questions: ["Annual leave", "Training", "Missing information"],
    queryLabel: "The question",
    queries: [
      "How many days of paid annual leave?",
      "What is the annual training budget?",
      "How much is the Christmas bonus?",
    ],
    guide: "staff-guide.pdf",
    passages: [
      "Employees receive 25 days of paid annual leave.",
      "The annual training budget is 500 euros per employee.",
      "Working from home is allowed two days per week.",
    ],
    ingestion: "Preparing the sources",
    ingestionText:
      "Each page becomes an identifiable passage. The E5 encoder computes a vector for semantic retrieval; passage terms support BM25.",
    retrieval: "Searching the guide",
    retrievalText:
      "E5 searches for similar meaning. BM25 prioritizes distinctive terms. RRF combines their ranks. Selection rules determine which passages enter the context.",
    selected: "Selected passage for this example",
    none: "No passage contains the requested information. The context stays empty.",
    demonstration:
      "This is a guided illustration. It runs neither E5 nor BM25 and displays no invented scores. For actual calculations, use Documents, then Architecture.",
    generation: "Illustrated answer",
    answers: [
      "Employees receive 25 days of paid annual leave. [1]",
      "The annual training budget is 500 euros per employee. [1]",
      "The available passages do not establish the amount of any Christmas bonus.",
    ],
    answerNote:
      "In the application, this step requires consent: the question and selected excerpts go through the server to NVIDIA. The API key stays on the server.",
    absentNote:
      "In the application, no eligible passage means no generation call. Refusing is better than inventing.",
    citation:
      "The reference points to the original passage. It enables verification; it does not automatically guarantee correctness.",
    stackTitle: "Each technology has a specific job.",
    stackIntro:
      "Two workspaces: the browser prepares and retrieves; the server validates and requests writing. Here is how the pieces connect.",
    local: "In the browser",
    remote: "On the server and at NVIDIA",
    purpose: "Purpose",
    connection: "How it connects",
    layers: [
      [
        "Interface & orchestration",
        "React · TypeScript · shadcn/ui · Vite",
        "React manages screens and session state. TypeScript describes contracts. shadcn/ui provides accessible components. Vite builds static files.",
        "Interactions start processing in Web Workers to keep the interface responsive. Documents and index remain in session memory.",
      ],
      [
        "Reading PDFs",
        "PDF.js · Tesseract.js",
        "PDF.js extracts text with file/page provenance. If a page contains too little text, Tesseract recognizes its image characters in French or English.",
        "Extracted text is split into passages within each page. The tokenizer measures their actual size rather than estimating a word count.",
      ],
      [
        "Index & hybrid retrieval",
        "Transformers.js · ONNX Runtime · E5 · BM25",
        "Multilingual E5 converts passages and questions into 384-dimensional vectors. Cosine compares their directions. BM25 measures lexical matching based on term frequency and rarity.",
        "Transformers.js loads E5 and its tokenizer; ONNX Runtime executes the model in the browser. The passage: and query: prefixes identify the input type. Model weights may be downloaded; PDFs are not sent to Hugging Face.",
      ],
      [
        "Fusion & selection",
        "RRF · cosine threshold · context budget",
        "RRF sums 1/(60 + rank) for the first 20 results of each list. It merges ranks rather than adding incompatible BM25 and cosine scores.",
        "Passages follow RRF order. They need cosine ≥0.78, a ranking contribution and room in the budget: at most 4 passages and 1,600 E5 tokens. The threshold is a heuristic, not a probability of truth.",
      ],
      [
        "Generation & references",
        "Vercel Functions · NVIDIA · GPT-OSS",
        "A Node.js function validates consent, sizes and structure, then calls openai/gpt-oss-20b through a fixed NVIDIA API destination.",
        "The request contains question, language and chosen passages, never the complete PDF or its vectors. Returned JSON is validated and citation IDs link to supplied files/pages. The server cannot authenticate a PDF it never received.",
      ],
    ],
    cautionsTitle: "What RAG helps with. What still needs checking.",
    cautions: [
      [
        "It is not retraining",
        "Indexing a PDF does not change E5 or GPT-OSS model weights. The application builds a temporary index and supplies excerpts during generation.",
      ],
      [
        "Quality starts with sources",
        "A missing page, OCR error or poor split can lose information. Start by inspecting the text that was actually extracted.",
      ],
      [
        "Retrieval is not proof",
        "A similar passage can be irrelevant. Fusion and thresholds help select evidence; they do not demonstrate that an answer is true.",
      ],
      [
        "Read the cited source",
        "Check the page, date, scope and exceptions. A valid reference alone does not establish that the model interpreted the passage correctly.",
      ],
    ],
    closing: "Move from theory to your documents.",
    try: "Open documents",
    architecture: "Explore the calculations",
    privacy:
      "The application applies no request counter. Technical bounds and provider terms remain separate.",
  },
};
export default function TheoryPage({
  lang,
  onDocuments,
  onArchitecture,
}: {
  lang: "fr" | "en";
  onDocuments: () => void;
  onArchitecture: () => void;
}) {
  const t = copy[lang],
    [question, setQuestion] = useState(0),
    [tab, setTab] = useState("prepare");
  const icons = [FileText, Search, MessageSquare],
    ids = ["principle", "example", "technology", "checks"];
  return (
    <div className="theory-view page-enter">
      <header className="theory-hero">
        <Badge variant="outline">
          <BookOpen size={13} />
          {t.label}
        </Badge>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <span className="reading-time">{t.reading}</span>
      </header>
      <div className="theory-layout">
        <aside className="theory-toc">
          <span>{lang === "fr" ? "DANS CE GUIDE" : "IN THIS GUIDE"}</span>
          <nav
            aria-label={
              lang === "fr" ? "Sommaire de la théorie" : "Theory contents"
            }
          >
            {t.nav.map((title, i) => (
              <a key={title} href={"#" + ids[i]}>
                <span>0{i + 1}</span>
                {title}
              </a>
            ))}
          </nav>
          <Button variant="outline" onClick={onDocuments}>
            {t.try}
            <ArrowUpRight size={14} />
          </Button>
        </aside>
        <div className="theory-body">
          <section id="principle" className="theory-section">
            <div className="theory-section-number">01 / {t.nav[0]}</div>
            <h2>{t.definition}</h2>
            <p>{t.definitionText}</p>
            <blockquote>{t.analogy}</blockquote>
            <div className="rag-overview">
              {t.stages.map((title, i) => {
                const Icon = icons[i];
                return (
                  <div key={title}>
                    <Icon size={21} />
                    <span>0{i + 1}</span>
                    <h3>{title}</h3>
                    <p>{t.stageTexts[i]}</p>
                    {i < 2 && (
                      <ArrowRight className="overview-arrow" size={16} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="theory-note">
              <Info size={16} />
              {t.separation}
            </p>
          </section>
          <section id="example" className="theory-section">
            <div className="theory-section-number">02 / {t.nav[1]}</div>
            <h2>{t.example}</h2>
            <p>{t.exampleIntro}</p>
            <Card className="theory-example">
              <CardHeader>
                <Badge variant="secondary">{t.demo}</Badge>
                <CardTitle>{t.queryLabel}</CardTitle>
                <div className="demo-questions">
                  {t.questions.map((label, i) => (
                    <Button
                      key={label}
                      variant={question === i ? "default" : "outline"}
                      aria-pressed={question === i}
                      onClick={() => setQuestion(i)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <CardDescription className="demo-question">
                  {t.queries[question]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList
                    aria-label={
                      lang === "fr" ? "Étapes de l’exemple" : "Example stages"
                    }
                  >
                    {t.stages.map((label, i) => (
                      <TabsTrigger
                        key={label}
                        value={["prepare", "retrieve", "answer"][i]}
                      >
                        <span>0{i + 1}</span>
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="prepare">
                    <h3>{t.ingestion}</h3>
                    <p>{t.ingestionText}</p>
                    <div className="demo-passages">
                      {t.passages.map((text, i) => (
                        <article key={text}>
                          <div>
                            <FileText size={14} />
                            {t.guide} · p. {i + 1}
                          </div>
                          <p>{text}</p>
                          <small>
                            {lang === "fr"
                              ? "Identifiant du passage"
                              : "Passage ID"}{" "}
                            : #{i + 1}
                          </small>
                        </article>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="retrieve">
                    <h3>{t.retrieval}</h3>
                    <p>{t.retrievalText}</p>
                    {question < 2 ? (
                      <div className="demo-evidence">
                        <Badge variant="outline">
                          <Check size={12} />
                          {t.selected}
                        </Badge>
                        <p>{t.passages[question]}</p>
                        <small>
                          {t.guide} · p. {question + 1}
                        </small>
                      </div>
                    ) : (
                      <div className="demo-empty">
                        <Search size={20} />
                        <p>{t.none}</p>
                      </div>
                    )}
                    <p className="demo-disclosure">{t.demonstration}</p>
                  </TabsContent>
                  <TabsContent value="answer">
                    <h3>{t.generation}</h3>
                    <div className="demo-answer">
                      <MessageSquare size={18} />
                      <p>{t.answers[question]}</p>
                    </div>
                    {question < 2 && (
                      <Badge variant="outline">
                        [1] {t.guide} · p. {question + 1}
                      </Badge>
                    )}
                    <p>{question < 2 ? t.answerNote : t.absentNote}</p>
                    <p className="demo-disclosure">{t.citation}</p>
                  </TabsContent>
                </Tabs>
                <div className="demo-navigation">
                  <Button
                    variant="ghost"
                    disabled={tab === "prepare"}
                    onClick={() =>
                      setTab(tab === "answer" ? "retrieve" : "prepare")
                    }
                  >
                    {lang === "fr" ? "Précédent" : "Previous"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={tab === "answer"}
                    onClick={() =>
                      setTab(tab === "prepare" ? "retrieve" : "answer")
                    }
                  >
                    {lang === "fr" ? "Étape suivante" : "Next step"}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
          <section id="technology" className="theory-section">
            <div className="theory-section-number">03 / {t.nav[2]}</div>
            <h2>{t.stackTitle}</h2>
            <p>{t.stackIntro}</p>
            <div className="stack-boundaries">
              <span>
                <Monitor size={16} />
                {t.local}
              </span>
              <ArrowRight size={16} />
              <span>
                <Server size={16} />
                {t.remote}
              </span>
            </div>
            <Accordion
              type="multiple"
              defaultValue={["layer-0"]}
              className="technology-stack"
            >
              {t.layers.map(([name, tech, purpose, connection], i) => (
                <AccordionItem key={name} value={"layer-" + i}>
                  <AccordionTrigger>
                    <span className="stack-layer">
                      <span className="stack-number">0{i + 1}</span>
                      <span>
                        <strong>{name}</strong>
                        <small>{tech}</small>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="stack-detail">
                      <div>
                        <h4>{t.purpose}</h4>
                        <p>{purpose}</p>
                      </div>
                      <div>
                        <h4>{t.connection}</h4>
                        <p>{connection}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
          <section id="checks" className="theory-section">
            <div className="theory-section-number">04 / {t.nav[3]}</div>
            <h2>{t.cautionsTitle}</h2>
            <div className="theory-checks">
              {t.cautions.map(([title, text]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <p className="theory-note">
              <Info size={16} />
              {t.privacy}
            </p>
          </section>
          <div className="theory-cta">
            <Layers size={23} />
            <h2>{t.closing}</h2>
            <div>
              <Button onClick={onDocuments}>
                {t.try}
                <ArrowRight size={15} />
              </Button>
              <Button variant="outline" onClick={onArchitecture}>
                {t.architecture}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
