-- Add credits and usage tracking system

-- Create user_credits table
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INT NOT NULL DEFAULT 0,
  used_credits INT NOT NULL DEFAULT 0,
  remaining_credits INT NOT NULL DEFAULT 0,
  plan_type TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create usage_logs table for tracking
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  credits_used INT NOT NULL DEFAULT 1,
  action_type TEXT NOT NULL DEFAULT 'analysis',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create ai_settings table for admin configuration
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Add columns to analyses table for tracking
ALTER TABLE public.analyses 
  ADD COLUMN IF NOT EXISTS credits_used INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hair_type TEXT,
  ADD COLUMN IF NOT EXISTS hair_texture TEXT,
  ADD COLUMN IF NOT EXISTS hair_volume TEXT,
  ADD COLUMN IF NOT EXISTS forehead_size TEXT;

-- Create policies for user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits" ON public.user_credits
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can update credits" ON public.user_credits
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create policies for usage_logs
CREATE POLICY "Users can view own logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.usage_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create policies for ai_settings
CREATE POLICY "Admins can manage settings" ON public.ai_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view settings" ON public.ai_settings
  FOR SELECT USING (true);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total_credits, remaining_credits, plan_type)
  VALUES (NEW.id, 5, 5, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- Function to update remaining credits
CREATE OR REPLACE FUNCTION public.update_remaining_credits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_credits = NEW.total_credits - NEW.used_credits;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_credits_remaining
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_remaining_credits();

-- Updated_at trigger for ai_settings
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI settings
INSERT INTO public.ai_settings (setting_key, setting_value, description) VALUES
  ('primary_model', '{"model": "google/gemini-3.1-flash-image-preview", "provider": "lovable"}', 'Primary image generation model'),
  ('fallback_model', '{"model": "google/gemini-2.5-flash-image", "provider": "lovable"}', 'Fallback image generation model'),
  ('analysis_model', '{"model": "google/gemini-2.5-flash", "provider": "lovable"}', 'Face analysis model'),
  ('credits_per_analysis', '{"free": 1, "pro": 1, "premium": 1}', 'Credits required per analysis'),
  ('daily_limit_free', '{"limit": 3, "reset_hour": 0}', 'Daily analysis limit for free users'),
  ('daily_limit_pro', '{"limit": 20, "reset_hour": 0}', 'Daily analysis limit for pro users'),
  ('enable_regeneration', '{"enabled": true, "credits_cost": 1}', 'Allow users to regenerate results')
ON CONFLICT (setting_key) DO NOTHING;
