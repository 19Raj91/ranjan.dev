import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { validateInquiry } from '../lib/contact-validation.ts';
const valid={name:'Alex Example',email:'alex@example.com',projectType:'Custom website',budget:'Let’s discuss',message:'I would like a responsive portfolio website with a working project inquiry form.'};
let db;
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_create_inquiries.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../drizzle/0001_contact_email_notifications.sql',import.meta.url),'utf8'));globalThis.__contactTestEnv={DB:{prepare(sql){return{bind(...values){return{async first(){return db.prepare(sql).get(...values)||null},async run(){return db.prepare(sql).run(...values)}}}}}}}});
let route=readFileSync(new URL('../app/api/contact/route.ts',import.meta.url),'utf8').replace("import { env } from 'cloudflare:workers';",'const env = globalThis.__contactTestEnv;').replace("'../../../lib/contact-validation'",JSON.stringify(pathToFileURL(new URL('../lib/contact-validation.ts',import.meta.url).pathname).href)).replace("'../../../lib/contact-email'",JSON.stringify(new URL('../lib/contact-email.ts',import.meta.url).href));
async function post(body,headers={}){const code=stripTypeScriptTypes(route);const {POST}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+Math.random());return POST(new Request('https://portfolio.example/api/contact',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}))}
test('accepts a complete inquiry and trims whitespace',()=>{assert.equal(validateInquiry({...valid,name:' Alex Example '}).data.name,'Alex Example')});
test('rejects missing, malformed, oversized, and unrecognized values',()=>{for(const value of [null,[],{}, {...valid,email:'invalid'}, {...valid,name:'A'}, {...valid,message:'short'}, {...valid,projectType:'fake'}, {...valid,budget:''}, {...valid,message:'x'.repeat(5001)}])assert.ok(validateInquiry(value).error)});
test('saves an actual inquiry and returns a reference',async()=>{const response=await post(valid,{Origin:'https://portfolio.example'});assert.equal(response.status,201);assert.equal((await response.json()).reference.length,8);const row=db.prepare('SELECT * FROM inquiries').get();assert.equal(row.name,valid.name);assert.equal(row.email,valid.email);assert.equal(row.message,valid.message)});
test('throttles immediate repeat submissions',async()=>{await post(valid);assert.equal((await post(valid)).status,429);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,1)});
test('rejects foreign origins, invalid JSON, honeypots, and oversize payloads',async()=>{assert.equal((await post(valid,{Origin:'https://elsewhere.example'})).status,403);assert.equal((await post('{broken')).status,400);assert.equal((await post({...valid,website:'spam'})).status,400);assert.equal((await post('x'.repeat(16001))).status,413)});
test('returns an honest error when storage fails',async()=>{globalThis.__contactTestEnv.DB=null;assert.equal((await post(valid)).status,503)});
test('a failed webhook does not lose the saved inquiry',async()=>{globalThis.__contactTestEnv.CONTACT_WEBHOOK_URL='https://webhook.example';const previous=globalThis.fetch;globalThis.fetch=async()=>new Response('Unavailable',{status:503});try{assert.equal((await post(valid)).status,201);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,1)}finally{globalThis.fetch=previous}});

test('with email configured, submits every field to the fixed recipient before reporting success',async()=>{
  globalThis.__contactTestEnv.RESEND_API_KEY='re_test_secret';globalThis.__contactTestEnv.CONTACT_EMAIL_FROM='Portfolio <contact@example.com>';
  const previous=globalThis.fetch;const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return Response.json({id:'email-provider-123'})};
  try {
    const response=await post({...valid,to:'attacker@example.com',_cc:'attacker@example.com'});
    assert.equal(response.status,201);assert.equal((await response.json()).notification,'accepted');assert.equal(requests.length,1);
    assert.equal(requests[0].url,'https://api.resend.com/emails');
    const payload=JSON.parse(requests[0].options.body);
    assert.deepEqual(payload.to,['rggupta714@gmail.com']);assert.equal(payload.reply_to,valid.email);assert.equal(payload.cc,undefined);
    for(const value of Object.values(valid))assert.ok(payload.text.includes(value));
    assert.equal(db.prepare('SELECT email_status FROM inquiries').get().email_status,'accepted');
    assert.equal(db.prepare('SELECT email_provider_id FROM inquiries').get().email_provider_id,'email-provider-123');
  }finally{globalThis.fetch=previous}
});
test('without email credentials, preserves the existing saved-inquiry success without claiming an email was sent',async()=>{
  const response=await post(valid);const body=await response.json();assert.equal(response.status,201);assert.equal(body.success,true);assert.equal(body.notification,'not_configured');assert.equal(db.prepare('SELECT email_status FROM inquiries').get().email_status,'not_configured');
});
test('email failure retains the inquiry; a retry reuses its reference and does not insert twice',async()=>{
  globalThis.__contactTestEnv.RESEND_API_KEY='re_test_secret';globalThis.__contactTestEnv.CONTACT_EMAIL_FROM='Portfolio <contact@example.com>';
  const previous=globalThis.fetch;let attempts=0;
  globalThis.fetch=async()=>{attempts++;return Response.json({name:'validation_error',message:'Private provider details'},{status:403})};
  try {
    const response=await post(valid);assert.equal(response.status,503);const result=await response.json();assert.ok(!result.success);assert.ok(!JSON.stringify(result).includes('Private provider details'));assert.equal(attempts,1);
    assert.equal(db.prepare('SELECT email_status FROM inquiries').get().email_status,'failed');
    globalThis.fetch=async()=>Response.json({id:'recovered-email'});
    const retried=await post(valid);const success=await retried.json();assert.equal(retried.status,201);assert.equal(success.reference,result.reference);assert.equal(success.notification,'accepted');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,1);
    assert.equal((await post(valid)).status,429);
  }finally{globalThis.fetch=previous}
});
test('invalid and honeypot submissions cannot trigger email delivery',async()=>{
  globalThis.__contactTestEnv.RESEND_API_KEY='re_test_secret';globalThis.__contactTestEnv.CONTACT_EMAIL_FROM='contact@example.com';const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not send')};
  try{assert.equal((await post({...valid,email:'invalid'})).status,400);assert.equal((await post({...valid,website:'bot'})).status,400);assert.equal(calls,0)}finally{globalThis.fetch=previous}
});
