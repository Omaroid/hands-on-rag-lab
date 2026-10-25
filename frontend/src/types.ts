export type Mode = 'lexical'|'dense'|'hybrid'|'hybrid_rerank';
export type Chunk = {id:string;document_id:string;title:string;url:string;product:string;section:string[];retrieved_at:string|null;content_hash:string;language:string;position:number;text:string;provenance:string};
export type Hit = {chunk:Chunk;score:number;rank:number;dense_score:number|null;lexical_score:number|null;rerank_score:number|null};
export type Citation = {id:string;title:string;url:string;quote:string;provenance:string};
export type Result = {question_normalized:string;mode:Mode;answer:string;refused:boolean;reason:string|null;citations:Citation[];dense:Hit[];lexical:Hit[];fused:Hit[];reranked:Hit[];context:Chunk[];stages:string[];latency_ms:number;generation:string;embedding:string;input_tokens:number|null;output_tokens:number|null;cost_eur:number;cache_hit:boolean};
export const modes:Record<Mode,string> = {lexical:'Lexicale',dense:'Vectorielle',hybrid:'Hybride',hybrid_rerank:'Hybride + reranking'};
