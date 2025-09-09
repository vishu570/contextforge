"use client"

import { useState, useEffect } from "react"
import { ApiKey, ApiKeyForm } from "@/types/api-keys"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ApiKeyDialog } from "@/components/api-key-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Edit, TestTube2 } from "lucide-react"
import { maskApiKey } from "@/lib/utils"
import toast from "react-hot-toast"

interface ApiKeyManagementProps {
  initialApiKeys: ApiKey[]
}

// Provider configurations
const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Used for GPT models and embeddings",
  },
  {
    id: "anthropic", 
    name: "Anthropic",
    description: "Used for Claude models",
  },
  {
    id: "gemini",
    name: "Google Generative AI",
    description: "Used for Gemini models",
  },
  {
    id: "github",
    name: "GitHub Token",
    description: "For importing from private repositories",
  },
] as const

export function ApiKeyManagement({ initialApiKeys }: ApiKeyManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKeyForm | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const refreshApiKeys = async () => {
    try {
      const response = await fetch("/api/settings/api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys)
      }
    } catch (error) {
      console.error("Failed to refresh API keys:", error)
    }
  }

  // Load API keys on component mount
  useEffect(() => {
    refreshApiKeys()
  }, [])

  const handleAddKey = (provider: string) => {
    // Check if key already exists for this provider
    const existingKey = apiKeys.find(key => key.provider === provider)
    if (existingKey) {
      // Convert existing key to form format
      const formData: ApiKeyForm = {
        id: existingKey.id,
        name: existingKey.name,
        provider: existingKey.provider,
        lastUsedAt: existingKey.lastUsedAt ? new Date(existingKey.lastUsedAt).toISOString() : undefined,
        createdAt: new Date(existingKey.createdAt).toISOString()
      }
      setSelectedApiKey(formData)
    } else {
      // Create a new API key form object
      setSelectedApiKey({
        id: '',
        name: '',
        provider: provider,
        createdAt: new Date().toISOString(),
      })
    }
    setDialogOpen(true)
  }

  const handleEditKey = (apiKey: ApiKey) => {
    // Convert ApiKey to ApiKeyForm for editing
    const formData: ApiKeyForm = {
      id: apiKey.id,
      name: apiKey.name,
      provider: apiKey.provider,
      lastUsedAt: apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toISOString() : undefined,
      createdAt: new Date(apiKey.createdAt).toISOString()
    }
    setSelectedApiKey(formData)
    setDialogOpen(true)
  }

  const handleDeleteKey = (apiKey: ApiKey) => {
    setKeyToDelete(apiKey)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!keyToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/settings/api-keys/${keyToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("API key deleted successfully")
        await refreshApiKeys()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to delete API key")
      }
    } catch (error) {
      toast.error("An error occurred while deleting the API key")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setKeyToDelete(null)
    }
  }

  const handleSuccess = () => {
    refreshApiKeys()
  }

  return (
    <>
      <div className="space-y-6">
        {PROVIDERS.map((provider, index) => {
          const existingKey = apiKeys.find(key => key.provider === provider.id)
          
          return (
            <div key={provider.id}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddKey(provider.id)}
                    >
                      {existingKey ? 'Update' : 'Add'}
                    </Button>
                    {existingKey && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditKey(existingKey)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteKey(existingKey)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                {existingKey && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      <div>Name: {existingKey.name}</div>
                      <div>
                        Last used: {existingKey.lastUsedAt ? 
                          new Date(existingKey.lastUsedAt).toLocaleDateString() :
                          'Never'
                        }
                      </div>
                      <div>
                        Added: {new Date(existingKey.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {index < PROVIDERS.length - 1 && <Separator />}
            </div>
          )
        })}
      </div>

      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={selectedApiKey}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API key "{keyToDelete?.name}" for {keyToDelete?.provider}? 
              This action cannot be undone and may affect any integrations using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}