import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Settings, Key, Eye, EyeOff, ExternalLink, AlertTriangle, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";

// LocalStorage keys for OpenRouter API key and base URL
const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter-api-key';
const OPENROUTER_BASE_URL_STORAGE_KEY = 'openrouter-base-url';
const WAVESPEED_API_KEY_STORAGE_KEY = 'wavespeed-api-key';

export const ApiKeySettings = ({ open = false }: { open?: boolean }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(open);
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [wavespeedApiKey, setWavespeedApiKey] = useState("");
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showWavespeedKey, setShowWavespeedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [hasWavespeedKey, setHasWavespeedKey] = useState(false);

  useEffect(() => {
    // Load existing API keys and base URL on component mount
    const existingOpenRouterKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    const existingBaseUrl = localStorage.getItem(OPENROUTER_BASE_URL_STORAGE_KEY);
    const existingWavespeedKey = localStorage.getItem(WAVESPEED_API_KEY_STORAGE_KEY);

    if (existingOpenRouterKey) {
      setOpenRouterApiKey(existingOpenRouterKey);
      setHasOpenRouterKey(true);
    }

    if (existingBaseUrl) {
      setBaseUrl(existingBaseUrl);
    }

    if (existingWavespeedKey) {
      setWavespeedApiKey(existingWavespeedKey);
      setHasWavespeedKey(true);
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

  const saveBaseUrl = (value: string) => {
    try {
      if (value.trim()) {
        localStorage.setItem(OPENROUTER_BASE_URL_STORAGE_KEY, value.trim());
      } else {
        localStorage.removeItem(OPENROUTER_BASE_URL_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving base URL:', error);
      throw new Error('Failed to save base URL');
    }
  };

  const handleSaveWavespeedKey = async () => {
    if (!wavespeedApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Wavespeed API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      apiService.saveWavespeedApiKey(wavespeedApiKey);
      setHasWavespeedKey(true);

      toast({
        title: "Success",
        description: "Wavespeed API key saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save Wavespeed API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

    if (!baseUrl.trim()) {
      toast({
        title: "Base URL Required",
        description: "Please enter a valid base URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      saveApiKey(openRouterApiKey);
      saveBaseUrl(baseUrl);
      apiService.setApiKey(openRouterApiKey);
      apiService.setBaseUrl(baseUrl);
      setHasOpenRouterKey(true);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('apiKeyUpdated'));

      toast({
        title: "Success",
        description: "API settings saved successfully",
      });
    } catch (error) {
      console.error('Failed to save API settings:', error);
      toast({
        title: "Error",
        description: "Failed to save API settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearOpenRouterKey = () => {
    try {
      localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
      localStorage.removeItem(OPENROUTER_BASE_URL_STORAGE_KEY);
      apiService.clearApiKey();
      apiService.clearBaseUrl();
      setOpenRouterApiKey("");
      setBaseUrl("https://openrouter.ai/api/v1");
      setHasOpenRouterKey(false);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('apiKeyUpdated'));

      toast({
        title: "Success",
        description: "API settings cleared successfully",
      });
    } catch (error) {
      console.error('Failed to clear API settings:', error);
      toast({
        title: "Error",
        description: "Failed to clear API settings",
        variant: "destructive",
      });
    }
  };

  const handleClearWavespeedKey = () => {
    try {
      localStorage.removeItem(WAVESPEED_API_KEY_STORAGE_KEY);
      setWavespeedApiKey("");
      setHasWavespeedKey(false);

      toast({
        title: "Success",
        description: "Wavespeed API key cleared successfully",
      });
    } catch (error) {
      console.error('Failed to clear Wavespeed API key:', error);
      toast({
        title: "Error",
        description: "Failed to clear Wavespeed API key",
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

      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5" />
            API Key Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your API settings including base URL and API key to enable AI-powered features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
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
                  <h3 className="text-lg font-semibold text-foreground">API Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure the API endpoint and key for AI model access
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
                  <Label htmlFor="base-url" className="text-foreground">Base URL</Label>
                  <Input
                    id="base-url"
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                    className="bg-background border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    The API endpoint URL. Default is OpenRouter's URL.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openrouter-key" className="text-foreground">API Key</Label>
                  <div className="relative">
                    <Input
                      id="openrouter-key"
                      type={showOpenRouterKey ? "text" : "password"}
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="Enter your API key"
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
                    disabled={isLoading || !openRouterApiKey.trim() || !baseUrl.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? "Saving..." : "Save Settings"}
                  </Button>

                  {hasOpenRouterKey && (
                    <Button
                      variant="outline"
                      onClick={handleClearOpenRouterKey}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Clear Settings
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

              </div>
            </div>
          </Card>

          <Separator className="my-6" />

          {/* Wavespeed API Key Section */}
          <Card className="p-6 bg-secondary/30 border-border/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Wavespeed AI (Image Generation)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure Wavespeed API for AI image generation capabilities
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasWavespeedKey && (
                    <div className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                      ✓ Configured
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wavespeed-key" className="text-foreground">Wavespeed API Key</Label>
                  <div className="relative">
                    <Input
                      id="wavespeed-key"
                      type={showWavespeedKey ? "text" : "password"}
                      value={wavespeedApiKey}
                      onChange={(e) => setWavespeedApiKey(e.target.value)}
                      placeholder="Enter your Wavespeed API key"
                      className="bg-background border-border pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowWavespeedKey(!showWavespeedKey)}
                        className="h-8 w-8 p-0 hover:bg-accent"
                      >
                        {showWavespeedKey ? (
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
                    onClick={handleSaveWavespeedKey}
                    disabled={isLoading || !wavespeedApiKey.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? "Saving..." : "Save Wavespeed Key"}
                  </Button>

                  {hasWavespeedKey && (
                    <Button
                      variant="outline"
                      onClick={handleClearWavespeedKey}
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
                      href="https://wavespeed.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      Get API Key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

              </div>
            </div>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}; 