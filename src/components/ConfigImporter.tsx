import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getConfigFromUrl, importConfiguration, clearConfigFromUrl, SharedConfig } from "@/lib/configSharing";

export const ConfigImporter = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<SharedConfig | null>(null);
  const [importApiKeys, setImportApiKeys] = useState(true);
  const [importAgents, setImportAgents] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const sharedConfig = getConfigFromUrl();
    if (sharedConfig) {
      setConfig(sharedConfig);
      setOpen(true);
    }
  }, []);

  const handleImport = async () => {
    if (!config) return;

    setIsImporting(true);
    try {
      const result = importConfiguration(config, {
        importApiKeys,
        importAgents,
        overwriteExisting
      });

      let description = "Configuration imported successfully!";
      if (result.apiKeysImported) {
        description += " API keys have been configured.";
      }
      if (result.agentsImported) {
        description += ` ${result.agentsCount} agent(s) imported.`;
      }

      toast({
        title: "Import Successful",
        description,
      });

      clearConfigFromUrl();
      setOpen(false);
      
      window.location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import configuration",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancel = () => {
    clearConfigFromUrl();
    setOpen(false);
  };

  if (!config) return null;

  const hasApiKeys = config.apiKeys && (
    config.apiKeys.openRouterApiKey || 
    config.apiKeys.openRouterBaseUrl || 
    config.apiKeys.wavespeedApiKey
  );
  const hasAgents = config.agents && config.agents.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5" />
            Import Shared Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            A collaborator has shared their configuration with you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Security Notice:</strong> Only import configurations from trusted sources. 
              This will give you access to their API keys.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 p-4 bg-secondary/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground">Configuration includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              {hasApiKeys && (
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">API Keys</div>
                    <ul className="text-xs space-y-0.5 mt-1 ml-4">
                      {config.apiKeys?.openRouterApiKey && (
                        <li className="list-disc">OpenRouter API key</li>
                      )}
                      {config.apiKeys?.openRouterBaseUrl && (
                        <li className="list-disc">OpenRouter base URL</li>
                      )}
                      {config.apiKeys?.wavespeedApiKey && (
                        <li className="list-disc">Wavespeed API key</li>
                      )}
                    </ul>
                  </div>
                </li>
              )}
              {!hasApiKeys && (
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground/50 mt-0.5" />
                  <div>
                    <div className="font-medium text-muted-foreground/50">No API keys</div>
                  </div>
                </li>
              )}
              {hasAgents && (
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Agents</div>
                    <div className="text-xs mt-1">{config.agents!.length} agent(s)</div>
                  </div>
                </li>
              )}
              {!hasAgents && (
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground/50 mt-0.5" />
                  <div>
                    <div className="font-medium text-muted-foreground/50">No agents</div>
                  </div>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground">Import options:</h4>
            
            {hasApiKeys && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-api-keys"
                  checked={importApiKeys}
                  onCheckedChange={(checked) => setImportApiKeys(checked as boolean)}
                />
                <Label
                  htmlFor="import-api-keys"
                  className="text-sm font-normal cursor-pointer"
                >
                  Import API keys
                </Label>
              </div>
            )}

            {hasAgents && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-agents"
                  checked={importAgents}
                  onCheckedChange={(checked) => setImportAgents(checked as boolean)}
                />
                <Label
                  htmlFor="import-agents"
                  className="text-sm font-normal cursor-pointer"
                >
                  Import agents
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite-existing"
                checked={overwriteExisting}
                onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
              />
              <Label
                htmlFor="overwrite-existing"
                className="text-sm font-normal cursor-pointer"
              >
                Overwrite existing configuration
              </Label>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              {overwriteExisting 
                ? "⚠️ This will replace all your current settings and agents."
                : "New items will be added without replacing existing ones."}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || (!importApiKeys && !importAgents)}
              className="bg-gradient-primary hover:opacity-90"
            >
              {isImporting ? "Importing..." : "Import Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

