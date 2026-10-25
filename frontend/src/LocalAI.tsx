import {useEffect,useRef,useState} from 'react';
import type {Result} from './types';
export function LocalAI({result}:{result:Result|null}){
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [state,setState]=useState<'idle'|'loading'|'ready'|'generating'|'error'>('idle');
 const [progress,setProgress]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[generatedFor,setGeneratedFor]=useState<Result|null>(null);
 const supported=typeof Worker!=='undefined'&&typeof WebAssembly!=='undefined'&&window.isSecureContext;
 function clearTimer(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
 function stop(){clearTimer();worker.current?.terminate();worker.current=null;setState('idle');setProgress('');setAnswer('');setGeneratedFor(null);setError('');}
 useEffect(()=>()=>{worker.current?.terminate();if(timer.current)clearTimeout(timer.current)},[]);
 function load(){
  stop();setState('loading');setProgress('Préparation du téléchargement…');
  try{
   const w=new Worker(new URL('./local-ai.worker.ts',import.meta.url),{type:'module'});worker.current=w;
   const fail=()=>{clearTimer();w.terminate();worker.current=null;setState('error');setError('Le modèle est indisponible sur cet appareil ou le chargement a échoué. La recherche par extraits reste accessible.');};
   w.onerror=fail;
   w.onmessage=({data})=>{
    if(data.type==='progress')setProgress(data.total?`${Math.round(data.loaded/1e6)} / ${Math.round(data.total/1e6)} Mo · ${data.file}`:`Chargement de ${data.file}…`);
    if(data.type==='ready'){clearTimer();setState('ready');setProgress('Modèle chargé sur cet appareil.');}
    if(data.type==='delta')setAnswer(data.text);
    if(data.type==='done'){clearTimer();setAnswer(data.text);setState('ready');}
    if(data.type==='error')fail();
   };
   timer.current=setTimeout(fail,10*60*1000);w.postMessage({type:'load'});
  }catch{setState('error');setError('Ce navigateur ne permet pas de démarrer le modèle local.');}
 }
 function generate(){
  if(!result||result.refused||!result.citations.length||!worker.current||state!=='ready')return;
  setAnswer('');setGeneratedFor(result);setState('generating');setError('');
  timer.current=setTimeout(()=>{worker.current?.terminate();worker.current=null;setState('error');setAnswer('');setError('Le calcul a dépassé 3 minutes. Essayez sur un ordinateur plus puissant. Les extraits restent consultables.');},180000);
  worker.current.postMessage({type:'generate',question:result.question_normalized,evidence:result.citations.map((c,i)=>`[${i+1}] ${c.title}\n${result.context.find(p=>p.id===c.id)?.text.slice(0,1600)||c.quote}`).join('\n\n')});
 }
 return <section className="local-ai" aria-labelledby="local-ai-title"><div className="section-heading"><div><span className="tiny-label">VOTRE APPAREIL, VOTRE MODÈLE</span><h2 id="local-ai-title">Une IA pour relier les idées</h2></div><span className="tag">Qwen 3 · 0,6B</span></div><p>Après la recherche, l’IA reformule les extraits sélectionnés en une réponse courte. Vos questions et extraits sont traités sur cet appareil, sans service de génération distant.</p>
 {(state==='idle'||state==='error')&&<><p className="ai-download">Premier chargement : environ <strong>950 Mo</strong> depuis Hugging Face, puis mise en cache si le navigateur le permet. Privilégiez un ordinateur récent, une connexion Wi-Fi et plusieurs Go de mémoire libre. Le calcul peut prendre du temps et consomme de la batterie.</p><button type="button" className="primary" disabled={!supported} onClick={load}>Télécharger et activer l’IA sur cet appareil</button>{!supported&&<p role="status">Ce navigateur ne prend pas en charge le moteur local. Utilisez une version récente sur une connexion sécurisée.</p>}</>}
 <div role="status" aria-live="polite">{state==='loading'&&<p><span className="loading-dot"/>{progress}</p>}{state==='ready'&&<p>✓ IA prête · {result&&!result.refused?'Les extraits de votre recherche peuvent maintenant être reformulés.':'Commencez par une recherche avec des preuves suffisantes.'}</p>}{state==='generating'&&<p><span className="loading-dot"/>L’IA rédige sur votre appareil… Vous pouvez arrêter le calcul.</p>}</div>
 {(state==='ready'||state==='generating')&&<button type="button" className="primary" disabled={state!=='ready'||!result||result.refused||!result.citations.length} onClick={generate}>Expliquer ces sources avec l’IA</button>}
 {(state==='loading'||state==='ready'||state==='generating')&&<button type="button" className="ai-stop" onClick={stop}>{state==='ready'?'Décharger le modèle':'Arrêter'}</button>}
 {error&&<p role="alert">{error}</p>}
 {answer&&generatedFor&&<article className="ai-answer"><h3>{state==='generating'?'Rédaction en cours':'Explication de l’IA'}</h3><p className="ai-question">Question : {generatedFor.question_normalized}</p>{result!==generatedFor&&<p>Cette explication concerne la recherche précédente.</p>}<p className="answer-text">{answer}</p><p>Reformulation générée : elle peut contenir des erreurs. Les numéros proposés par le modèle ne constituent pas une validation automatique ; vérifiez les extraits ci-dessous.</p><ol>{generatedFor.citations.map(c=><li key={c.id}><a href={c.url} target="_blank" rel="noreferrer">{c.title} ↗</a><blockquote>{generatedFor.context.find(p=>p.id===c.id)?.text.slice(0,1600)||c.quote}</blockquote></li>)}</ol></article>}
 <details><summary>Comprendre le modèle et ses limites</summary><p>Qwen3-0.6B, conversion ONNX quantifiée q4, exécutée via Transformers.js et WebAssembly dans un worker. Ce petit modèle peut être imprécis en français ; les passages originaux restent la référence. Aucun téléchargement ne démarre avant votre clic. Hugging Face reçoit la requête de téléchargement et votre adresse IP, pas votre question. Décharger arrête le calcul ; les fichiers en cache peuvent être supprimés dans les données du site de votre navigateur.</p><a href="https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/tree/58ca03a5e7b354b480b1a82b34bde8dc7b854cc0" target="_blank" rel="noreferrer">Modèle et révision</a> · <a href="https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/LICENSE" target="_blank" rel="noreferrer">Licence Apache-2.0</a></details></section>;
}
