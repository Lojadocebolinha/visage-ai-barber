import { useEffect, useState } from "react";
import { getAllAISettings, getAISettings, AISettings } from "@/lib/creditsManager";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminAISettings() {
  const [settings, setSettings] = useState<AISettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getAllAISettings();
      setSettings(data);
      const edited: Record<string, any> = {};
      data.forEach((s) => {
        edited[s.setting_key] = JSON.stringify(s.setting_value, null, 2);
      });
      setEditedSettings(edited);
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao carregar configurações");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const editedValue = editedSettings[setting.setting_key];
        try {
          const parsed = JSON.parse(editedValue);
          const { error } = await supabase
            .from("ai_settings")
            .update({ setting_value: parsed })
            .eq("setting_key", setting.setting_key);

          if (error) throw error;
        } catch (parseError) {
          toast.error(`JSON inválido para ${setting.setting_key}`);
          setSaving(false);
          return;
        }
      }
      toast.success("Configurações salvas com sucesso!");
      await fetchSettings();
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Configurações de IA</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Edite as configurações de modelos de IA e limites de uso. Alterações afetarão todas as análises futuras.
        </p>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {settings.map((setting) => (
          <Card key={setting.setting_key} className="p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              {setting.setting_key}
            </label>
            {setting.description && (
              <p className="text-xs text-muted-foreground mb-2">{setting.description}</p>
            )}
            <textarea
              value={editedSettings[setting.setting_key] || ""}
              onChange={(e) =>
                setEditedSettings({
                  ...editedSettings,
                  [setting.setting_key]: e.target.value,
                })
              }
              className="w-full h-24 p-2 text-xs font-mono bg-secondary border border-border rounded text-foreground"
            />
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
