ALTER TABLE public.analyses 
  ADD COLUMN IF NOT EXISTS jaw_shape text,
  ADD COLUMN IF NOT EXISTS forehead text,
  ADD COLUMN IF NOT EXISTS proportion text,
  ADD COLUMN IF NOT EXISTS current_style text,
  ADD COLUMN IF NOT EXISTS contrast_level text,
  ADD COLUMN IF NOT EXISTS recommended_style text,
  ADD COLUMN IF NOT EXISTS fade_type text,
  ADD COLUMN IF NOT EXISTS top_style text,
  ADD COLUMN IF NOT EXISTS beard_recommendation text,
  ADD COLUMN IF NOT EXISTS mustache_recommendation text,
  ADD COLUMN IF NOT EXISTS cut_difficulty text,
  ADD COLUMN IF NOT EXISTS barber_level text;