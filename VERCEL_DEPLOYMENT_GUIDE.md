# 🚀 Guia de Deploy no Vercel - Visage AI Barber

## Pré-requisitos

- Conta no GitHub (já configurada ✅)
- Conta no Vercel (gratuita em https://vercel.com)
- Conta no Supabase (para banco de dados)
- Token da HuggingFace API

## Passo 1: Preparar Variáveis de Ambiente

Você precisará das seguintes variáveis de ambiente:

```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase
HUGGINGFACE_API_KEY=seu_token_huggingface
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_supabase
```

## Passo 2: Deploy no Vercel

### Opção A: Deploy Automático via GitHub (Recomendado)

1. Acesse https://vercel.com
2. Clique em **"New Project"**
3. Selecione **"Import Git Repository"**
4. Procure por `visage-ai-barber` e clique em **"Import"**
5. Na página de configuração:
   - **Project Name:** `visage-ai-barber` (ou outro nome desejado)
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (raiz do projeto)
6. Clique em **"Environment Variables"** e adicione todas as variáveis listadas acima
7. Clique em **"Deploy"**

### Opção B: Deploy via Vercel CLI

```bash
# 1. Instale o Vercel CLI (se não tiver)
npm install -g vercel

# 2. Na pasta do projeto, execute:
cd /home/ubuntu/visage-ai-barber
vercel --prod

# 3. Siga as instruções na tela
# - Confirme o projeto
# - Adicione as variáveis de ambiente
# - Confirme o deploy
```

## Passo 3: Configurar Variáveis de Ambiente no Vercel

Após o deploy inicial:

1. Acesse seu projeto no Vercel
2. Vá para **Settings** → **Environment Variables**
3. Adicione cada variável:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `HUGGINGFACE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **"Save"**
5. Vá para **Deployments** e clique em **"Redeploy"** para aplicar as variáveis

## Passo 4: Configurar Supabase

### Criar Tabelas Necessárias

Execute as seguintes queries no Supabase SQL Editor:

```sql
-- Tabela de créditos de usuário
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  total_credits INT DEFAULT 3,
  used_credits INT DEFAULT 0,
  daily_limit INT DEFAULT 1,
  daily_used INT DEFAULT 0,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabela de logs de uso
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  analysis_id UUID,
  action VARCHAR(100),
  credits_used INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de roles de usuário
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  role VARCHAR(50) DEFAULT 'cliente',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
```

### Configurar Storage para Imagens

1. No Supabase, vá para **Storage**
2. Crie um novo bucket chamado `analysis-photos`
3. Configure as políticas de acesso público (se necessário)

## Passo 5: Testar o Deploy

1. Acesse a URL fornecida pelo Vercel (ex: `https://visage-ai-barber.vercel.app`)
2. Teste o fluxo completo:
   - Faça login/cadastro
   - Preencha o formulário
   - Capture uma foto
   - Aguarde a análise
   - Veja o resultado
   - Compartilhe via WhatsApp

## Passo 6: Configurar Domínio Personalizado (Opcional)

1. No Vercel, vá para **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruído

## 🔧 Troubleshooting

### Erro: "HUGGINGFACE_API_KEY is not configured"
- Verifique se a variável foi adicionada corretamente no Vercel
- Aguarde alguns minutos após adicionar a variável
- Faça um redeploy

### Erro: "Failed to fetch user photo"
- Verifique se o Supabase Storage está configurado
- Verifique as políticas de acesso

### Erro: "Analysis failed"
- Verifique se o token da HuggingFace é válido
- Verifique se você tem créditos suficientes na HuggingFace

## 📊 Monitoramento

1. No Vercel, vá para **Analytics** para ver:
   - Requisições
   - Performance
   - Erros

2. No Supabase, vá para **Logs** para ver:
   - Requisições ao banco de dados
   - Erros de autenticação

## 🎉 Sucesso!

Seu site `visage-ai-barber` está agora online e pronto para uso profissional!

**URL do Site:** `https://visage-ai-barber.vercel.app` (ou seu domínio personalizado)

Para mais informações, consulte:
- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação da HuggingFace](https://huggingface.co/docs)
