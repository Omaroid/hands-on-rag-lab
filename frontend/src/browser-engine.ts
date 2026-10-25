// Static zero-spend companion. Real retrieval runs in the visitor's browser, not Qdrant.
// This intentionally exposes the ORIGINAL editorial corpus, which contains no secrets.
import data from './corpus.json';
import type {Chunk,Hit,Mode,Result} from './types';
const corpus:Chunk[]=data;
const stop=new Set('a an the is are of to in for and or what how does do on with be as et de du des le la les un une est sont que qui quoi comment pour dans au aux en quelle quels quel peut il elle this that explain expliquer'.split(' '));
const aliases:Record<string,string>={gouvernance:'governance',couts:'cost',cout:'cost',securite:'security',droits:'permissions',catalogue:'catalog',ligne:'row',lignes:'row',colonnes:'column',donnees:'data',historique:'history',transactions:'acid',transaction:'acid',fichiers:'files',stockage:'storage',suppression:'delete',supprimer:'delete',partage:'sharing',qualite:'quality',medaillon:'medallion',identite:'identity',acces:'access',masquage:'mask',tables:'table',tracabilite:'lineage'};
const tokenize=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)?.filter(x=>!stop.has(x)&&x.length>1).map(x=>aliases[x]||x)||[];
const injection=/ignore\s+(all\s+|previous\s+|the\s+|toutes?\s+|les\s+)*instructions|ignore\s+previous|oublie.{0,25}instructions|system\s*prompt|prompt\s*syst[eè]me|reveal.{0,20}(secret|key)|r[eé]v[eè]le.{0,20}(secret|cl[eé])|you are now|tu es maintenant|\[INST\]|<\|im_start\|>|exfiltrat/i;
async function embedding(text:string):Promise<number[]> {
 const v=new Array<number>(384).fill(0);
 for(const word of tokenize(text)) {
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(word)));
  let value=0n;for(const byte of bytes)value=(value<<8n)+BigInt(byte);
  v[Number(value%384n)]+=((value>>16n)%2n)?1:-1;
 }
 const norm=Math.hypot(...v)||1;return v.map(x=>x/norm);
}
let vectors:Promise<number[][]>|undefined;
const counter=(words:string[])=>words.reduce<Record<string,number>>((a,w)=>{a[w]=(a[w]||0)+1;return a},{});
const docs=corpus.map(c=>counter(tokenize(c.title+' '+c.text)));
const lengths=docs.map(d=>Object.values(d).reduce((a,b)=>a+b,0));
const avg=lengths.reduce((a,b)=>a+b,0)/lengths.length;
const df:Record<string,number>={};for(const d of docs)for(const word of Object.keys(d))df[word]=(df[word]||0)+1;
function hits(scores:number[],products:string[]):Hit[]{return corpus.map((chunk,i)=>({chunk,score:scores[i],rank:0,dense_score:null,lexical_score:null,rerank_score:null})).filter(h=>h.score>0&&(!products.length||products.includes(h.chunk.product))).sort((a,b)=>b.score-a.score||a.chunk.id.localeCompare(b.chunk.id)).slice(0,12).map((h,i)=>({...h,rank:i+1}));}
export async function browserAnswer(question:string,mode:Mode,products:string[]):Promise<Result>{
 const started=performance.now(),normalized=question.trim().normalize('NFKC').replace(/\s+/g,' ');
 const terms=new Set(tokenize(normalized));let reason=injection.test(question)?'injection_detected':/https?:\/\//i.test(question)?'user_url_not_allowed':null;
 if(question.length<8||question.length>1200)throw Error('La question doit contenir entre 8 et 1 200 caractères.');
 let dense:Hit[]=[],lexical:Hit[]=[],fused:Hit[]=[];
 if(!reason){
 if(mode!=='lexical'){
  vectors??=Promise.all(corpus.map(c=>embedding(c.title+' '+c.text)));const [vs,q]=await Promise.all([vectors,embedding(normalized)]);
  dense=hits(vs.map(v=>v.reduce((sum,x,i)=>sum+x*q[i],0)),products).filter(h=>h.score>0.05).map(h=>({...h,dense_score:h.score}));
 }
 if(mode!=='dense')lexical=hits(docs.map((d,i)=>[...terms].reduce((sum,t)=>{const f=d[t]||0;return sum+(f?Math.log(1+(corpus.length-(df[t]||0)+0.5)/((df[t]||0)+0.5))*f*2.5/(f+1.5*(0.25+0.75*lengths[i]/avg)):0)},0)),products).map(h=>({...h,lexical_score:h.score}));
 if(mode.startsWith('hybrid')){
 const merged=new Map<string,Hit>();for(const list of [dense,lexical])for(const h of list){const old=merged.get(h.chunk.id)||{...h,score:0};merged.set(h.chunk.id,{...old,score:old.score+1/(60+h.rank),dense_score:h.dense_score??old.dense_score,lexical_score:h.lexical_score??old.lexical_score})}
 fused=[...merged.values()].sort((a,b)=>b.score-a.score||a.chunk.id.localeCompare(b.chunk.id)).map((h,i)=>({...h,rank:i+1}));
 }else fused=mode==='dense'?dense:lexical;
 }
 const overlap=(text:string)=>[...terms].filter(t=>new Set(tokenize(text)).has(t)).length;
 const reranked=mode==='hybrid_rerank'?fused.map(h=>({...h,rerank_score:(overlap(h.chunk.text)+0.2*overlap(h.chunk.title))/Math.max(1,terms.size)})).sort((a,b)=>(b.rerank_score||0)-(a.rerank_score||0)||b.score-a.score).map((h,i)=>({...h,rank:i+1})):fused;
 const context=reranked.filter(h=>!injection.test(h.chunk.text)&&overlap(h.chunk.title+' '+h.chunk.text)>=2&&overlap(h.chunk.title+' '+h.chunk.text)/Math.max(1,terms.size)>=0.45).slice(0,4).map(h=>h.chunk);
 if(!context.length&&!reason)reason='insufficient_evidence';
 const citations=reason?[]:context.slice(0,3).flatMap(c=>{const sentences=c.text.split(/(?<=[.!?])\s+|\n\n/).map(s=>s.trim()).filter(s=>s.length>25&&s.length<=650).sort((a,b)=>overlap(b)-overlap(a));return sentences[0]&&overlap(sentences[0])>=2?[{id:c.id,title:c.title,url:c.url,quote:sentences[0],provenance:c.provenance}]:[]});
 if(!citations.length&&!reason)reason='insufficient_evidence';
 const answer=reason?'Les sources disponibles ne permettent pas de répondre avec suffisamment de preuves. Précisez le produit et le sujet, ou consultez la documentation officielle.':citations.map((c,i)=>`${c.quote} [${i+1}]`).join('\n\n');
 return {question_normalized:normalized,mode,answer,refused:!!reason,reason,citations,dense,lexical,fused,reranked,context,stages:['validate_input','normalize_or_rewrite_query','retrieve_documents','hybrid_fusion','rerank_documents','grade_context','generate_answer_or_refuse','verify_citations','format_response'],latency_ms:Math.round((performance.now()-started)*100)/100,generation:'extractive · navigateur',embedding:'local-hash-384 · non sémantique',input_tokens:null,output_tokens:null,cost_eur:0,cache_hit:false};
}
