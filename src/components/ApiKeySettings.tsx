import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Key, Eye, EyeOff, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";

// LocalStorage key for OpenRouter API key
const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter-api-key';

export const ApiKeySettings = ({ open = false }: { open?: boolean }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(open);
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);

  useEffect(() => {
    // Load existing API key on component mount
    const existingOpenRouterKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    
    if (existingOpenRouterKey) {
      setOpenRouterApiKey(existingOpenRouterKey);
      setHasOpenRouterKey(true);
    }
  }, []);

  const saveApiKey = (value: string) => {
    try {
      if (value.trim()) {
        localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, value.trim());
      } else {
        localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      throw new Error('Failed to save API key');
    }
  };

  const handleSaveOpenRouterKey = async () => {
    if (!openRouterApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenRouter API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      saveApiKey(openRouterApiKey);
      apiService.setApiKey(openRouterApiKey);
      setHasOpenRouterKey(true);
      
      toast({
        title: "Success",
        description: "OpenRouter API key saved successfully",
      });
    } catch (error) {
      console.error('Failed to save OpenRouter API key:', error);
      toast({
        title: "Error",
        description: "Failed to save OpenRouter API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearOpenRouterKey = () => {
    try {
      localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
      apiService.clearApiKey();
      setOpenRouterApiKey("");
      setHasOpenRouterKey(false);
      
      toast({
        title: "Success", 
        description: "OpenRouter API key cleared successfully",
      });
    } catch (error) {
      console.error('Failed to clear OpenRouter API key:', error);
      toast({
        title: "Error",
        description: "Failed to clear OpenRouter API key",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          API Settings
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5" />
            API Key Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your OpenRouter API key to enable AI-powered features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Security Notice */}
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Your API keys are stored locally in your browser and never sent to our servers.
            </AlertDescription>
          </Alert>

          {/* OpenRouter API Key Section */}
          <Card className="p-6 bg-secondary/30 border-border/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">OpenRouter API Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Required for accessing multiple AI models through OpenRouter
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasOpenRouterKey && (
                    <div className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                      ✓ Configured
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openrouter-key" className="text-foreground">API Key</Label>
                  <div className="relative">
                    <Input
                      id="openrouter-key"
                      type={showOpenRouterKey ? "text" : "password"}
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="Enter your OpenRouter API key"
                      className="bg-background border-border pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                        className="h-8 w-8 p-0 hover:bg-accent"
                      >
                        {showOpenRouterKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={handleSaveOpenRouterKey}
                    disabled={isLoading || !openRouterApiKey.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? "Saving..." : "Save Key"}
                  </Button>
                  
                  {hasOpenRouterKey && (
                    <Button
                      variant="outline"
                      onClick={handleClearOpenRouterKey}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Clear Key
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      Get API Key
                      <ExternalLink className="h-3 w-3" />
                    </a>  
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">
                    About OpenRouter
                  </h4>
                  <div className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                    <p>• Access to multiple AI models from different providers in one place</p>
                    <p>• Competitive pricing and flexible usage options</p>
                    <p>• Support for various model types including text, vision, and code generation</p>
                    <p>• Simple API integration with standardized endpoints</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Usage Information */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">How to Use</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Sign up for an account at OpenRouter.ai</li>
              <li>Generate an API key from your account dashboard</li>
              <li>Paste the API key above and save it</li>
              <li>Start creating and using AI agents with various models</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 