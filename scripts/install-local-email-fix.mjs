import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export async function installLocalEmailFix(targetRoot,sourceRoot) {
  const configPath=path.join(targetRoot,'vite.config.ts');
  const routePath=path.join(targetRoot,'app/api/contact/route.ts');
  const pkg=JSON.parse(await readFile(path.join(targetRoot,'package.json'),'utf8'));
  if(!pkg.devDependencies?.vinext&&!pkg.dependencies?.vinext) throw Error('Run this command from your portfolio project folder, containing package.json and vite.config.ts.');
  let vite=await readFile(configPath,'utf8');
  let route=await readFile(routePath,'utf8');
  if(!vite.includes('contactEmailTransport')) {
    if(!/plugins\s*:\s*\[/.test(vite)) throw Error('The Vite plugins list could not be found. No files have been changed.');
    vite="import { contactEmailTransport } from './scripts/vite/contact-email-transport.mjs';\n"+vite.replace(/plugins\s*:\s*\[/,'plugins: [\n      contactEmailTransport(),');
  }
  if(!route.includes("'virtual:portfolio-contact-email'")) {
    const original='sendContactNotification({id,name,email,projectType,budget,message,createdAt},env)';
    if(!route.includes(original)) throw Error('Your form handler differs from the expected version. No files have been changed.');
    route="import localEmailTransport from 'virtual:portfolio-contact-email';\n"+route.replace(original,'sendContactNotification({id,name,email,projectType,budget,message,createdAt},env,{fetcher:localEmailTransport})');
  }
  const replacements=new Map([['vite.config.ts',vite],['app/api/contact/route.ts',route]]);
  for(const file of ['scripts/vite/contact-email-transport.mjs','lib/contact-email-transport.d.ts','lib/contact-email.ts']) replacements.set(file,await readFile(path.join(sourceRoot,file),'utf8'));
  const changes=[];
  for(const [file,contents] of replacements) {
    let original=null;
    try{original=await readFile(path.join(targetRoot,file),'utf8')}catch(error){if(error.code!=='ENOENT')throw error}
    if(original!==contents) changes.push({file,contents,original});
  }
  if(!changes.length) return {changed:[],backup:null};
  const backup=path.join(targetRoot,'work','email-fix-backup-'+Date.now());
  // Complete the backup before writing any application file. Secrets and database files are never read or copied.
  for(const change of changes)if(change.original!==null){const to=path.join(backup,change.file);await mkdir(path.dirname(to),{recursive:true});await writeFile(to,change.original)}
  for(const change of changes){const to=path.join(targetRoot,change.file);await mkdir(path.dirname(to),{recursive:true});await writeFile(to,change.contents)}
  return {changed:changes.map(change=>change.file),backup};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
    const result=await installLocalEmailFix(process.cwd(),sourceRoot);
    console.log(result.changed.length?'Local email compatibility fix installed.':'Local email compatibility fix is already installed.');
    if(result.backup)console.log('Code backup:',result.backup);
    console.log('Your .dev.vars, saved inquiries, and page design were not modified.');
    console.log('Restart the development server with npm run dev, then submit the form.');
  }catch(error){console.error(error.message);process.exitCode=1}
}
