# 🚀 Guia de Deploy - Visage AI Barber

## Opção Recomendada: Deploy via Vercel (Automático)

### Passo 1: Acesse o Vercel
1. Abra https://vercel.com
2. Clique em **"Sign Up"** ou **"Log In"** (use sua conta GitHub para facilitar)

### Passo 2: Conecte seu Repositório GitHub
1. Após fazer login, clique em **"New Project"**
2. Clique em **"Import Git Repository"**
3. Procure por **`Lojadocebolinha/visage-ai-barber`**
4. Clique em **"Import"**

### Passo 3: Configure o Deploy
1. **Framework Preset:** Selecione **"Vite"**
2. **Build Command:** Deixe como padrão (já está configurado)
3. **Output Directory:** Deixe como padrão (`dist`)
4. **Environment Variables:** Adicione se necessário:
   - `VITE_SUPABASE_URL` (sua URL do Supabase)
   - `VITE_SUPABASE_ANON_KEY` (sua chave anônima do Supabase)

### Passo 4: Deploy
1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos enquanto o Vercel compila e faz o deploy
3. Você verá uma mensagem de sucesso com a URL do seu site!

### Passo 5: Seu Site Está Online! 🎉
- **URL Permanente:** Algo como `https://visage-ai-barber.vercel.app`
- **Domínio Customizado:** Você pode adicionar seu próprio domínio nas configurações do Vercel

---

## Opção 2: Deploy via CLI (Linha de Comando)

### Passo 1: Instale o Vercel CLI
```bash
npm install -g vercel
```

### Passo 2: Autentique-se
```bash
vercel login
```
(Siga as instruções na tela para fazer login com sua conta GitHub)

### Passo 3: Deploy em Produção
```bash
cd /caminho/para/visage-ai-barber
vercel --prod
```

### Passo 4: Confirme as Configurações
- **Project name:** Deixe como sugerido ou customize
- **Framework:** Selecione `Vite`
- **Output directory:** Deixe como `dist`

### Passo 5: Seu Site Está Online! 🎉
O Vercel fornecerá uma URL pública permanente

---

## ✅ Checklist Pré-Deploy

- ✅ Projeto compilando sem erros: `npm run build`
- ✅ Arquivo `vercel.json` configurado para SPA
- ✅ Variáveis de ambiente do Supabase prontas
- ✅ Todas as rotas funcionando localmente
- ✅ Tradução 100% em Português (Brasil)
- ✅ Nomes de cortes limpos e profissionais

---

## 🔧 Variáveis de Ambiente Necessárias

Se você precisar adicionar variáveis de ambiente no Vercel:

1. Vá para **Project Settings** → **Environment Variables**
2. Adicione as variáveis do seu Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 📱 Após o Deploy

### Seu site estará disponível em:
- **URL Vercel:** `https://seu-projeto.vercel.app`
- **Domínio Customizado:** Configure em Vercel Settings

### Próximas atualizações:
- Qualquer push no `main` do GitHub atualizará automaticamente o site
- Você pode ver o histórico de deploys no dashboard do Vercel

---

## 🆘 Troubleshooting

### Erro: "Build failed"
- Verifique se `npm run build` funciona localmente
- Confirme que todas as dependências estão no `package.json`

### Erro: "404 em rotas SPA"
- O arquivo `vercel.json` já está configurado para isso
- Se persistir, verifique se o arquivo está na raiz do projeto

### Erro: "Variáveis de ambiente não encontradas"
- Adicione as variáveis no Vercel Settings
- Aguarde o redeploy automático

---

## 📞 Suporte

Se tiver dúvidas:
1. Consulte a documentação do Vercel: https://vercel.com/docs
2. Verifique o status do deploy no dashboard do Vercel
3. Veja os logs de build para identificar erros

---

**Seu site Visage AI Barber estará online em poucos minutos! 🚀**
