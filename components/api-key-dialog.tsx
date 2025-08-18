"use client"

import React, { useState } from "react"
import { ApiKeyForm } from "@/types/api-keys"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react"
import { validateApiKey, maskApiKey } from "@/lib/utils"
import toast from "react-hot-toast"

// Provider configurations
const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models and embeddings",
    placeholder: "sk-...",
  },
  {
    id: "anthropic", 
    name: "Anthropic",
    description: "Claude models",
    placeholder: "sk-ant-...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini models",
    placeholder: "API Key",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Private repository access",
    placeholder: "ghp_... or github_pat_...",
  },
] as const

const formSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "github"]),
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  apiKey: z.string().min(1, "API key is required"),
})

type FormData = z.infer<typeof formSchema>

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey?: ApiKeyForm | null
  onSuccess: () => void
}

export function ApiKeyDialog({ open, onOpenChange, apiKey, onSuccess }: ApiKeyDialogProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!(apiKey && apiKey.id)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: (apiKey?.provider as any) || "openai",
      name: apiKey?.name || "",
      apiKey: "",
    },
  })

  // Update form values when apiKey prop changes
  React.useEffect(() => {
    if (apiKey) {
      form.reset({
        provider: apiKey.provider as any,
        name: apiKey.name,
        apiKey: "",
      })
    }
  }, [apiKey, form])

  const selectedProvider = PROVIDERS.find(p => p.id === form.watch("provider"))

  const handleTestApiKey = async () => {
    const formData = form.getValues()
    
    if (!validateApiKey(formData.provider, formData.apiKey)) {
      setTestResult({
        success: false,
        message: "Invalid API key format for this provider"
      })
      return
    }

    setIsTestingKey(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/settings/api-keys/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: formData.provider,
          apiKey: formData.apiKey,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: result.message || "API key is valid and working"
        })
      } else {
        setTestResult({
          success: false,
          message: result.error || "Failed to validate API key"
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Network error while testing API key"
      })
    } finally {
      setIsTestingKey(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const url = isEditing ? `/api/settings/api-keys/${apiKey.id}` : "/api/settings/api-keys"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save API key")
      }

      toast.success(isEditing ? "API key updated successfully" : "API key added successfully")
      onSuccess()
      onOpenChange(false)
      form.reset()
      setTestResult(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
    setTestResult(null)
    setShowApiKey(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Update API Key" : "Add API Key"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your API key configuration" 
              : "Add a new API key to enable LLM integrations"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing} // Don't allow changing provider when editing
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {provider.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Production API Key"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this API key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder={selectedProvider?.placeholder || "Enter API key"}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isEditing 
                      ? "Leave blank to keep the existing key"
                      : "Enter your API key from the provider"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Result */}
            {testResult && (
              <Alert className={testResult.success ? "border-green-200" : "border-red-200"}>
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
                    {testResult.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestApiKey}
                disabled={!form.watch("apiKey") || isTestingKey || isSubmitting}
              >
                {isTestingKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Key"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!isEditing && !form.watch("apiKey"))}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  isEditing ? "Update" : "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}