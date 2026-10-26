import {useEffect,useRef,useState} from 'react';
import type {Result,Citation} from './types';
type Reply={answer:string;citations:Citation[];model:string;question:string};
export function ServerAI({result,products}:{result:Result|null;products:string[]}){
 const [ready,setReady]=useState(false),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reply,setReply]=useState<Reply|null>(null);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/ai/status',{signal:c.signal}).then(r=>r.ok?r.json():{ready:false}).then(d=>setReady(d.ready===true)).catch(()=>{});return()=>{c.abort();active.current?.abort();}},[]);
 async function generate(){
  if(!ready||!consent||!result||result.refused||busy)return;
  const c=new AbortController();active.current=c;setBusy(true);setError('');setReply(null);
  const timer=setTimeout(()=>c.abort(),35000);
  try{
   const r=await fetch('/api/ai/answer',{method:'POST',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({question:result.question_normalized,mode:result.mode,products,consent:true})});
   if(!r.ok)throw Error('unavailable');
   const d=await r.json();if(typeof d.answer!=='string'||!Array.isArray(d.citations))throw Error('invalid');
   setReply(d);
  }catch{setError('La génération n’a pas abouti. Les passages sources restent consultables ; aucun nouvel essai automatique ne sera effectué.');}
  finally{clearTimeout(timer);active.current=null;setBusy(false);}
 }
 return <section className="local-ai" aria-labelledby="server-ai-title"><span className="tiny-label">UNE RÉPONSE RELIÉE AUX SOURCES</span><h2 id="server-ai-title">Expliquer avec l’IA</h2><p>Aucun modèle à télécharger. La demande passe par notre serveur ; la clé du fournisseur reste côté serveur.</p><p role="status">{ready?'Le service est prêt. Lancez une recherche, puis demandez une explication.':'La génération est indisponible pour le moment. Vous pouvez continuer à explorer les sources.'}</p><label className="ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> J’accepte l’envoi de ma question et des extraits sélectionnés à NVIDIA pour cette génération. Ne saisissez pas de données confidentielles.</label><button type="button" className="primary" onClick={generate} disabled={!ready||!consent||!result||result.refused||busy}>{busy?'Rédaction en cours…':'Expliquer ces sources avec l’IA'}</button>{busy&&<button type="button" className="ai-stop" onClick={()=>active.current?.abort()}>Arrêter l’attente</button>}<p>Arrêter l’attente ne garantit pas l’annulation d’un calcul déjà reçu par le fournisseur.</p>{error&&<p role="alert">{error}</p>}{reply&&<article className="ai-answer"><h3>Explication de l’IA</h3><p>Question : {reply.question}</p><p className="answer-text">{reply.answer}</p><p>Texte généré : vérifiez les affirmations dans les sources. Les citations ne sont pas une validation automatique.</p><ol>{reply.citations.map(c=><li key={c.id}><strong>{c.title}</strong><blockquote>{c.quote}</blockquote></li>)}</ol></article>}</section>;
}
