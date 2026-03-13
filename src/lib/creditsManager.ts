import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  id: string;
  user_id: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  plan_type: "free" | "pro" | "premium";
  plan_expires_at: string | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  analysis_id: string | null;
  credits_used: number;
  action_type: string;
  status: string;
  created_at: string;
}

export interface AISettings {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description: string | null;
}

/**
 * Fetch user's current credits
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user credits:", error);
    return null;
  }

  return data;
}

/**
 * Check if user has enough credits for analysis
 */
export async function hasEnoughCredits(userId: string, creditsNeeded: number = 1): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits ? credits.remaining_credits >= creditsNeeded : false;
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(userId: string, analysisId: string, creditsToDeduct: number = 1): Promise<boolean> {
  try {
    // Get current credits
    const credits = await getUserCredits(userId);
    if (!credits || credits.remaining_credits < creditsToDeduct) {
      return false;
    }

    // Update user credits
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        used_credits: credits.used_credits + creditsToDeduct,
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // Log the usage
    const { error: logError } = await supabase
      .from("usage_logs")
      .insert({
        user_id: userId,
        analysis_id: analysisId,
        credits_used: creditsToDeduct,
        action_type: "analysis",
        status: "completed",
      });

    if (logError) console.error("Error logging usage:", logError);

    return true;
  } catch (error) {
    console.error("Error deducting credits:", error);
    return false;
  }
}

/**
 * Get user's daily usage count
 */
export async function getDailyUsageCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_logs")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching daily usage:", error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Check if user has exceeded daily limit
 */
export async function hasExceededDailyLimit(userId: string): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return true;

    const settings = await getAISettings("daily_limit_" + credits.plan_type);
    if (!settings) return false;

    const dailyLimit = settings.setting_value?.limit || 3;
    const usageCount = await getDailyUsageCount(userId);

    return usageCount >= dailyLimit;
  } catch (error) {
    console.error("Error checking daily limit:", error);
    return false;
  }
}

/**
 * Get AI settings by key
 */
export async function getAISettings(settingKey: string): Promise<AISettings | null> {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("setting_key", settingKey)
    .single();

  if (error) {
    console.error(`Error fetching AI setting ${settingKey}:`, error);
    return null;
  }

  return data;
}

/**
 * Get all AI settings
 */
export async function getAllAISettings(): Promise<AISettings[]> {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*");

  if (error) {
    console.error("Error fetching AI settings:", error);
    return [];
  }

  return data || [];
}

/**
 * Add credits to user (admin function)
 */
export async function addCreditsToUser(userId: string, creditsToAdd: number): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return false;

    const { error } = await supabase
      .from("user_credits")
      .update({
        total_credits: credits.total_credits + creditsToAdd,
      })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error adding credits:", error);
    return false;
  }
}

/**
 * Update user plan
 */
export async function updateUserPlan(userId: string, planType: "free" | "pro" | "premium", expiresAt?: Date): Promise<boolean> {
  try {
    const updateData: any = { plan_type: planType };
    
    if (expiresAt) {
      updateData.plan_expires_at = expiresAt.toISOString();
    }

    const { error } = await supabase
      .from("user_credits")
      .update(updateData)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating user plan:", error);
    return false;
  }
}

/**
 * Get usage statistics for admin
 */
export async function getUsageStatistics(startDate?: Date, endDate?: Date) {
  try {
    let query = supabase.from("usage_logs").select("*");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      total_analyses: data?.length || 0,
      total_credits_used: data?.reduce((sum, log) => sum + log.credits_used, 0) || 0,
      by_status: data?.reduce((acc: any, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    return null;
  }
}
