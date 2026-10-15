'use client';
import { useState } from 'react';
import { createAuthClient } from '@neondatabase/auth/next';

const auth=createAuthClient();
const field='border rounded-lg p-3 w-full mt-1';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [verifying,setVerifying]=useState(false);

  async function signIn(){
    setBusy(true);setMessage('');
    try{
      const result=await auth.signIn.email({email,password});
      if(result.error){setMessage('Não foi possível entrar. Confira seus dados e verifique seu e-mail.');return;}
      const response=await fetch('/api/session',{cache:'no-store'});
      if(response.ok)window.location.assign('/renovacoes');
      else {setMessage('Verifique seu e-mail antes de acessar o CRM.');setVerifying(true);}
    }catch{setMessage('Serviço de login indisponível. Tente novamente.');}
    finally{setBusy(false);}
  }

  async function sendCode(){
    setBusy(true);
    try{
      const result=await auth.emailOtp.sendVerificationOtp({email,type:'email-verification'});
      setMessage(result.error?'Não foi possível enviar o código.':'Confira o código recebido no seu e-mail.');
      if(!result.error)setVerifying(true);
    }catch{setMessage('Não foi possível enviar o código.');}
    finally{setBusy(false);}
  }

  return <div className="min-h-[80vh] flex items-center justify-center">
    <form className="max-w-sm w-full bg-white border rounded-2xl p-8 space-y-5" onSubmit={e=>{e.preventDefault();void signIn();}}>
      <div><h1 className="text-2xl font-bold">Entrar no TV Box CRM</h1><p className="text-slate-500 mt-2">Acesso reservado à administração.</p></div>
      <label className="block">E-mail<input required type="email" autoComplete="username" className={field} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="block">Senha<input required type="password" autoComplete="current-password" className={field} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {message&&<p role="status" className="text-blue-700">{message}</p>}
      <button disabled={busy} className="bg-blue-600 text-white rounded-lg p-3 w-full disabled:opacity-50">{busy?'Aguarde…':'Entrar'}</button>
      <button type="button" className="text-blue-600 text-sm" disabled={busy||!email} onClick={()=>void sendCode()}>Verificar meu e-mail</button>
      {verifying&&<div className="border-t pt-4 space-y-3">
        <label>Código de verificação<input inputMode="numeric" autoComplete="one-time-code" className={field} value={code} onChange={e=>setCode(e.target.value)}/></label>
        <button type="button" disabled={busy||!code} className="border rounded-lg p-2" onClick={async()=>{setBusy(true);try{const r=await auth.emailOtp.verifyEmail({email,otp:code});if(r.error)setMessage('Código inválido ou expirado.');else{setVerifying(false);setMessage('E-mail verificado. Clique em Entrar.');}}catch{setMessage('Falha na verificação.');}finally{setBusy(false);}}}>Confirmar código</button>
      </div>}
      <button type="button" className="text-blue-600 text-sm block" disabled={busy||!email} onClick={async()=>{setBusy(true);try{await auth.requestPasswordReset({email,redirectTo:window.location.origin+'/login/redefinir'});setMessage('Se a conta existir, você receberá as instruções por e-mail.');}catch{setMessage('Não foi possível solicitar a recuperação.');}finally{setBusy(false);}}}>Esqueci minha senha</button>
    </form>
  </div>;
}
