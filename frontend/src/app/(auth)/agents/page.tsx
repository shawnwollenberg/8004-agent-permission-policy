'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agents, type Agent } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { Plus, MoreVertical, Trash2, Link as LinkIcon, Bot, Shield, ShieldCheck, ArrowUpCircle, Rocket, Key, Download, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, formatEther, createWalletClient, http, encodeFunctionData, type Chain } from 'viem'
import { sepolia, base } from 'viem/chains'
import { useToast } from '@/hooks/useToast'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const SUPPORTED_CHAINS: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [base.id]: base,
}

function getViemChain(chainId: number): Chain {
  return SUPPORTED_CHAINS[chainId] ?? sepolia
}

const EXECUTE_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

export default function AgentsPage() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const chainId = useChainId()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [upgradeAgentId, setUpgradeAgentId] = useState<string | null>(null)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    agent_address: '',
    wallet_type: 'smart_account' as 'eoa' | 'smart_account',
  })

  // Bot signer state
  const [signerSource, setSignerSource] = useState<'wallet' | 'generated'>('wallet')
  const [generatedKey, setGeneratedKey] = useState<{ privateKey: string; address: string } | null>(null)
  const [showRevealDialog, setShowRevealDialog] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [revealSmartAccountAddress, setRevealSmartAccountAddress] = useState<string | null>(null)
  const [expandedBotDetails, setExpandedBotDetails] = useState<Set<string>>(new Set())

  // Withdraw state
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAgent, setWithdrawAgent] = useState<Agent | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [botKeyInput, setBotKeyInput] = useState('')
  const [showBotKeyInput, setShowBotKeyInput] = useState(false)
  const [botKeyTxHash, setBotKeyTxHash] = useState<string | null>(null)
  const [botKeyTxStatus, setBotKeyTxStatus] = useState<'idle' | 'sending' | 'confirming' | 'confirmed' | 'error'>('idle')
  const [withdrawChainId, setWithdrawChainId] = useState<number>(sepolia.id)

  const { toast } = useToast()

  // Withdraw hooks
  const { data: smartAccountBalance, refetch: refetchBalance } = useBalance({
    address: withdrawAgent?.smart_account_address as `0x${string}` | undefined,
    query: { enabled: !!withdrawAgent?.smart_account_address },
  })

  const { writeContract, data: withdrawTxHash, isPending: isWithdrawPending, reset: resetWithdraw } = useWriteContract()

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  })

  const { data: agentsList, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  // Fire-and-forget: sync on-chain agents on mount
  const syncMutation = useMutation({
    mutationFn: agents.sync,
    onSuccess: (synced) => {
      if (synced?.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['agents'] })
        toast({ title: `Synced ${synced.length} on-chain agent${synced.length > 1 ? 's' : ''}`, variant: 'success' })
      }
    },
  })

  useEffect(() => {
    syncMutation.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deployMutation = useMutation({
    mutationFn: ({ agentId, signerAddress, signerType, chainIdOverride }: { agentId: string; signerAddress: string; signerType?: string; chainIdOverride?: number }) =>
      agents.deploySmartAccount(agentId, { signer_address: signerAddress, signer_type: signerType, chain_id: chainIdOverride ?? chainId }),
    onSuccess: (sa) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      if (sa.signer_type === 'generated' && generatedKey) {
        setRevealSmartAccountAddress(sa.account_address)
        setShowRevealDialog(true)
      }
      toast({
        title: 'Secure Account deployed',
        description: `Address: ${sa.account_address.slice(0, 10)}...`,
        variant: 'success',
      })
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({
        title: 'Deployment failed',
        description: e.message + '. Retry from agent menu.',
        variant: 'destructive',
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: agents.create,
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreateOpen(false)

      let signerAddr: string
      let signerType: string | undefined
      if (agent.wallet_type === 'smart_account' && signerSource === 'generated' && generatedKey) {
        signerAddr = generatedKey.address
        signerType = 'generated'
      } else {
        signerAddr = agent.wallet_type === 'smart_account' ? (address || '') : (newAgent.agent_address || address || '')
        signerType = 'wallet'
      }

      setNewAgent({ name: '', description: '', agent_address: '', wallet_type: 'smart_account' })
      toast({ title: 'Agent registered', variant: 'success' })

      if (agent.wallet_type === 'smart_account' && signerAddr) {
        deployMutation.mutate({ agentId: agent.id, signerAddress: signerAddr, signerType })
      }
    },
    onError: (e: Error) => toast({ title: 'Failed to register agent', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: agents.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({ title: 'Agent deleted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to delete agent', description: e.message, variant: 'destructive' }),
  })

  const registerOnchainMutation = useMutation({
    mutationFn: (id: string) => agents.registerOnchain(id, chainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({ title: 'Agent registered on-chain', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to register on-chain', description: e.message, variant: 'destructive' }),
  })

  const upgradeMutation = useMutation({
    mutationFn: (id: string) => agents.upgradeToSmartAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsUpgradeOpen(false)
      setUpgradeAgentId(null)
      toast({ title: 'Upgraded to Secure Account', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to upgrade', description: e.message, variant: 'destructive' }),
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEnforcementBadge = (agent: Agent) => {
    if (agent.enforcement_level === 'enforced') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Enforced
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        <Shield className="mr-1 h-3 w-3" />
        Advisory
      </Badge>
    )
  }

  const handleGenerateKey = () => {
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)
    setGeneratedKey({ privateKey, address: account.address })
  }

  const handleCreate = () => {
    const data: { name: string; description?: string; agent_address?: string; wallet_type?: string } = {
      name: newAgent.name,
      wallet_type: newAgent.wallet_type,
    }
    if (newAgent.description) data.description = newAgent.description
    if (newAgent.wallet_type === 'smart_account') {
      if (signerSource === 'generated' && generatedKey) {
        data.agent_address = generatedKey.address
      } else if (address) {
        data.agent_address = address
      }
    } else {
      if (newAgent.agent_address) data.agent_address = newAgent.agent_address
    }
    createMutation.mutate(data)
  }

  const handleCloseCreateDialog = (open: boolean) => {
    setIsCreateOpen(open)
    if (!open) {
      setSignerSource('wallet')
      setGeneratedKey(null)
    }
  }

  const handleDownloadEnv = () => {
    if (!generatedKey || !revealSmartAccountAddress) return
    const content = [
      `BOT_PRIVATE_KEY=${generatedKey.privateKey}`,
      `BOT_ADDRESS=${generatedKey.address}`,
      `SMART_ACCOUNT_ADDRESS=${revealSmartAccountAddress}`,
      `ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`,
      `CHAIN_ID=${chainId}`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bot-signer.env'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCloseRevealDialog = () => {
    setShowRevealDialog(false)
    setShowPrivateKey(false)
    setGeneratedKey(null)
    setRevealSmartAccountAddress(null)
    setSignerSource('wallet')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copied`, variant: 'success' })
  }

  const toggleBotDetails = (agentId: string) => {
    setExpandedBotDetails(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  const handleOpenWithdraw = async (agent: Agent) => {
    setWithdrawAgent(agent)
    setWithdrawAmount('')
    setBotKeyInput('')
    setShowBotKeyInput(false)
    setBotKeyTxHash(null)
    setBotKeyTxStatus('idle')
    resetWithdraw()
    setWithdrawOpen(true)
    setTimeout(() => refetchBalance(), 100)

    // Fetch the smart account's chain_id for correct chain routing
    try {
      const sa = await agents.getSmartAccount(agent.id)
      setWithdrawChainId(sa.chain_id || sepolia.id)
    } catch {
      setWithdrawChainId(chainId || sepolia.id)
    }
  }

  const handleWithdraw = () => {
    if (!withdrawAgent?.smart_account_address || !address || !withdrawAmount) return

    if (withdrawAgent.signer_type === 'generated') {
      handleBotKeyWithdraw()
      return
    }

    try {
      const amountWei = parseEther(withdrawAmount)
      writeContract({
        address: withdrawAgent.smart_account_address as `0x${string}`,
        abi: EXECUTE_ABI,
        functionName: 'execute',
        args: [address, amountWei, '0x'],
      })
    } catch {
      toast({ title: 'Invalid amount', variant: 'destructive' })
    }
  }

  const handleBotKeyWithdraw = async () => {
    if (!withdrawAgent?.smart_account_address || !address || !withdrawAmount || !botKeyInput) return

    try {
      // Validate the private key matches the agent's signer
      const key = (botKeyInput.startsWith('0x') ? botKeyInput : `0x${botKeyInput}`) as `0x${string}`
      const account = privateKeyToAccount(key)

      if (withdrawAgent.signer_address && account.address.toLowerCase() !== withdrawAgent.signer_address.toLowerCase()) {
        toast({ title: 'Key mismatch', description: 'This private key does not match the bot signer address', variant: 'destructive' })
        return
      }

      setBotKeyTxStatus('sending')

      const walletClient = createWalletClient({
        account,
        chain: getViemChain(withdrawChainId),
        transport: http(),
      })

      const amountWei = parseEther(withdrawAmount)
      const data = encodeFunctionData({
        abi: EXECUTE_ABI,
        functionName: 'execute',
        args: [address, amountWei, '0x'],
      })

      const hash = await walletClient.sendTransaction({
        to: withdrawAgent.smart_account_address as `0x${string}`,
        data,
      })

      setBotKeyTxHash(hash)
      setBotKeyTxStatus('confirming')

      // Wait for confirmation by polling
      const { createPublicClient } = await import('viem')
      const publicClient = createPublicClient({
        chain: getViemChain(withdrawChainId),
        transport: http(),
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        setBotKeyTxStatus('confirmed')
        toast({ title: 'Withdrawal confirmed', description: 'Sent to your wallet', variant: 'success' })
        // Clear the bot key from memory
        setBotKeyInput('')
        setTimeout(() => {
          setWithdrawOpen(false)
          setWithdrawAgent(null)
          setWithdrawAmount('')
          setBotKeyTxHash(null)
          setBotKeyTxStatus('idle')
          refetchBalance()
        }, 1500)
      } else {
        setBotKeyTxStatus('error')
        toast({ title: 'Transaction reverted', variant: 'destructive' })
      }
    } catch (e) {
      setBotKeyTxStatus('error')
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast({ title: 'Withdrawal failed', description: msg.slice(0, 100), variant: 'destructive' })
    }
  }

  const handleCloseWithdraw = () => {
    setWithdrawOpen(false)
    setWithdrawAgent(null)
    setWithdrawAmount('')
    setBotKeyInput('')
    setShowBotKeyInput(false)
    setBotKeyTxHash(null)
    setBotKeyTxStatus('idle')
    setWithdrawChainId(sepolia.id)
    resetWithdraw()
  }

  // Auto-close and notify on successful withdraw
  useEffect(() => {
    if (isWithdrawConfirmed && withdrawOpen) {
      toast({ title: 'Withdrawal confirmed', description: `Sent to your wallet`, variant: 'success' })
      setWithdrawOpen(false)
      setWithdrawAgent(null)
      setWithdrawAmount('')
      resetWithdraw()
      refetchBalance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWithdrawConfirmed])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agents</h2>
          <p className="text-muted-foreground">
            Manage your AI agents and their identities
          </p>
        </div>
        <Dialog.Root open={isCreateOpen} onOpenChange={handleCloseCreateDialog}>
          <Dialog.Trigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold">
                Register New Agent
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Add an AI agent to your account to manage its permissions
              </Dialog.Description>

              <div className="space-y-4">
                {/* Wallet Type Selector */}
                <div>
                  <Label className="mb-2 block">Wallet Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAgent({ ...newAgent, wallet_type: 'eoa', agent_address: '' })
                        setSignerSource('wallet')
                        setGeneratedKey(null)
                      }}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        newAgent.wallet_type === 'eoa'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">External Wallet</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Monitor with advisory alerts and reconciliation
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, wallet_type: 'smart_account', agent_address: address || '' })}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        newAgent.wallet_type === 'smart_account'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">Secure Account</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">Recommended</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Guaranteed enforcement — unauthorized transactions cannot execute
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={newAgent.name}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, name: e.target.value })
                    }
                    placeholder="Trading Bot Alpha"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newAgent.description}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, description: e.target.value })
                    }
                    placeholder="Automated trading agent for DeFi"
                  />
                </div>

                {newAgent.wallet_type === 'smart_account' ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-2 block">Signer Source</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSignerSource('wallet')
                            setGeneratedKey(null)
                          }}
                          className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                            signerSource === 'wallet'
                              ? 'border-primary bg-primary/5 font-medium'
                              : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          Connected Wallet
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignerSource('generated')}
                          className={`rounded-md border px-3 py-2 text-sm transition-colors flex items-center justify-center gap-1.5 ${
                            signerSource === 'generated'
                              ? 'border-primary bg-primary/5 font-medium'
                              : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <Key className="h-3.5 w-3.5" />
                          Generate Bot Signer
                        </button>
                      </div>
                    </div>

                    {signerSource === 'wallet' ? (
                      <div>
                        <Label>Signer Address</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          {address || 'Connect wallet to continue'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your connected wallet will sign transactions for the Secure Account.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {!generatedKey ? (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              A new keypair will be generated for your bot. The private key will be shown once after account creation.
                            </p>
                            <Button type="button" variant="outline" size="sm" onClick={handleGenerateKey}>
                              <Key className="mr-2 h-3.5 w-3.5" />
                              Generate Key
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Label>Bot Signer Address</Label>
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono">
                              {generatedKey.address}
                            </div>
                            <div className="flex items-start gap-2 mt-2 rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                You must save the private key after creation — it cannot be recovered.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="agent_address">Agent Wallet Address (optional)</Label>
                    <Input
                      id="agent_address"
                      value={newAgent.agent_address}
                      onChange={(e) =>
                        setNewAgent({ ...newAgent, agent_address: e.target.value })
                      }
                      placeholder="0x..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The wallet address the agent uses for transactions. Leave empty to assign later.
                    </p>
                  </div>
                )}

                {newAgent.wallet_type === 'smart_account' && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      A Guardrail Secure Account will be deployed for this agent. Once assets are in a Guardrail
                      Secure Account, unauthorized transactions cannot execute.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={!newAgent.name || createMutation.isPending || (newAgent.wallet_type === 'smart_account' && signerSource === 'generated' && !generatedKey)}
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Agent'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Private Key Reveal Dialog */}
      <Dialog.Root open={showRevealDialog} onOpenChange={() => {}}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Save Your Bot&apos;s Private Key
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-1 mb-4">
              This is the ONLY time this key will be shown. It is not stored anywhere — if you close this dialog without saving, the key is lost forever.
            </Dialog.Description>

            {generatedKey && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Private Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">
                      {showPrivateKey ? generatedKey.privateKey : `${generatedKey.privateKey.slice(0, 10)}${'*'.repeat(54)}`}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      title={showPrivateKey ? 'Hide' : 'Show'}
                    >
                      {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(generatedKey.privateKey, 'Private key')}
                      title="Copy"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Bot Signer Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                      {generatedKey.address}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(generatedKey.address, 'Bot address')}
                      title="Copy"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {revealSmartAccountAddress && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Smart Account Address</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                        {revealSmartAccountAddress}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(revealSmartAccountAddress, 'Smart account address')}
                        title="Copy"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleDownloadEnv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .env file
                  </Button>
                  <Button className="flex-1" onClick={handleCloseRevealDialog}>
                    I&apos;ve Saved the Key
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Upgrade Confirmation Dialog */}
      <Dialog.Root open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Upgrade to Guardrail Secure Account
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              This will upgrade the agent to a Guardrail Secure Account with guaranteed enforcement.
            </Dialog.Description>
            <div className="space-y-3 mb-6">
              <div className="rounded-md bg-muted p-3 text-sm space-y-2">
                <p>This upgrade will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Deploy a Guardrail Secure Account controlled by the current wallet</li>
                  <li>The existing wallet becomes the signer for the Secure Account</li>
                  <li>All policies will be enforced on-chain going forward</li>
                  <li>Once assets are in the Secure Account, unauthorized transactions cannot execute</li>
                </ul>
              </div>
              <div className="rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                This is a one-way upgrade. You cannot downgrade back to advisory mode.
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button
                onClick={() => upgradeAgentId && upgradeMutation.mutate(upgradeAgentId)}
                disabled={upgradeMutation.isPending}
              >
                {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Withdraw Dialog */}
      <Dialog.Root open={withdrawOpen} onOpenChange={(open) => { if (!open) handleCloseWithdraw() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Withdraw from Secure Account
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-1 mb-4">
              Send ETH from the smart account back to your connected wallet.
            </Dialog.Description>

            {withdrawAgent && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-mono text-xs">{withdrawAgent.smart_account_address?.slice(0, 8)}...{withdrawAgent.smart_account_address?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-mono text-xs">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-mono">
                      {smartAccountBalance ? `${parseFloat(formatEther(smartAccountBalance.value)).toFixed(6)} ETH` : 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* Bot signer key input for generated signers */}
                {withdrawAgent.signer_type === 'generated' && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        This account uses a generated bot signer. Paste the bot&apos;s private key to sign the withdrawal. The key is used client-side only and is never sent to any server.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="bot-key">Bot Private Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="bot-key"
                          type={showBotKeyInput ? 'text' : 'password'}
                          value={botKeyInput}
                          onChange={(e) => setBotKeyInput(e.target.value)}
                          placeholder="0x..."
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowBotKeyInput(!showBotKeyInput)}
                          title={showBotKeyInput ? 'Hide' : 'Show'}
                        >
                          {showBotKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="withdraw-amount">Amount (ETH)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="withdraw-amount"
                      type="text"
                      inputMode="decimal"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.01"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (smartAccountBalance) {
                          setWithdrawAmount(formatEther(smartAccountBalance.value))
                        }
                      }}
                      disabled={!smartAccountBalance}
                    >
                      Max
                    </Button>
                  </div>
                </div>

                {/* Transaction status for wallet signer */}
                {withdrawTxHash && !isWithdrawConfirmed && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground">Transaction submitted, waiting for confirmation...</p>
                    <p className="font-mono text-xs mt-1 break-all">{withdrawTxHash}</p>
                  </div>
                )}

                {/* Transaction status for bot key signer */}
                {botKeyTxHash && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground">
                      {botKeyTxStatus === 'confirming' ? 'Transaction submitted, waiting for confirmation...' :
                       botKeyTxStatus === 'confirmed' ? 'Transaction confirmed!' :
                       botKeyTxStatus === 'error' ? 'Transaction failed' : 'Sending...'}
                    </p>
                    <p className="font-mono text-xs mt-1 break-all">{botKeyTxHash}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={handleCloseWithdraw}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    disabled={
                      !withdrawAmount ||
                      !smartAccountBalance ||
                      smartAccountBalance.value === BigInt(0) ||
                      (withdrawAgent.signer_type === 'generated'
                        ? !botKeyInput || botKeyTxStatus === 'sending' || botKeyTxStatus === 'confirming'
                        : isWithdrawPending || isWithdrawConfirming)
                    }
                  >
                    {withdrawAgent.signer_type === 'generated'
                      ? (botKeyTxStatus === 'sending' ? 'Signing...' : botKeyTxStatus === 'confirming' ? 'Confirming...' : 'Withdraw')
                      : (isWithdrawPending ? 'Confirm in wallet...' : isWithdrawConfirming ? 'Confirming...' : 'Withdraw')
                    }
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : agentsList?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No agents yet</h3>
            <p className="text-muted-foreground mb-4">
              Register your first AI agent to start managing permissions
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentsList?.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    {agent.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agent.description || 'No description'}
                  </p>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="min-w-[200px] rounded-md bg-popover p-1 shadow-md">
                      {!agent.onchain_registry_id && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() =>
                            registerOnchainMutation.mutate(agent.id)
                          }
                        >
                          <LinkIcon className="h-4 w-4" />
                          Register On-chain
                        </DropdownMenu.Item>
                      )}
                      {agent.wallet_type === 'smart_account' && !agent.smart_account_address && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => {
                            const signerAddr = agent.agent_address || address || ''
                            if (signerAddr) {
                              deployMutation.mutate({ agentId: agent.id, signerAddress: signerAddr })
                            } else {
                              toast({ title: 'No signer address available', variant: 'destructive' })
                            }
                          }}
                        >
                          <Rocket className="h-4 w-4" />
                          Deploy Secure Account
                        </DropdownMenu.Item>
                      )}
                      {agent.wallet_type === 'smart_account' && agent.smart_account_address && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => handleOpenWithdraw(agent)}
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Withdraw
                        </DropdownMenu.Item>
                      )}
                      {agent.wallet_type === 'eoa' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => {
                            setUpgradeAgentId(agent.id)
                            setIsUpgradeOpen(true)
                          }}
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                          Upgrade to Secure Account
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                        onClick={() => deleteMutation.mutate(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(agent.status)}
                    {getEnforcementBadge(agent)}
                    {agent.onchain_registry_id && (
                      <Badge variant="outline">On-chain</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {agent.wallet_type === 'smart_account' ? 'Secure Account' : 'External Wallet'}
                    </p>
                    {agent.wallet_type === 'smart_account' && !agent.smart_account_address ? (
                      <p className="text-sm font-mono text-amber-500 animate-pulse">
                        Deploying...
                      </p>
                    ) : agent.wallet_type === 'smart_account' && agent.smart_account_address ? (
                      <CopyableAddress address={agent.smart_account_address} />
                    ) : agent.agent_address ? (
                      <CopyableAddress address={agent.agent_address} />
                    ) : null}
                  </div>
                  {agent.wallet_type === 'smart_account' && agent.signer_address && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        Signer
                        {agent.signer_type === 'generated' && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            <Key className="mr-0.5 h-2.5 w-2.5" />
                            Generated
                          </Badge>
                        )}
                      </p>
                      <CopyableAddress address={agent.signer_address} />
                    </div>
                  )}

                  {/* Bot Connection Details for generated signers */}
                  {agent.signer_type === 'generated' && agent.smart_account_address && agent.signer_address && (
                    <div>
                      <button
                        onClick={() => toggleBotDetails(agent.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {expandedBotDetails.has(agent.id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Bot Connection Details
                      </button>
                      {expandedBotDetails.has(agent.id) && (
                        <div className="mt-2 rounded-md border bg-muted/50 p-3 space-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Smart Account:</span>
                            <CopyableAddress address={agent.smart_account_address} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bot Signer:</span>
                            <CopyableAddress address={agent.signer_address} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">EntryPoint:</span>
                            <CopyableAddress address="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" />
                          </div>
                          <div>
                            <span className="text-muted-foreground">Chain: </span>
                            <span className="font-mono">{chainId} ({getViemChain(chainId).name})</span>
                          </div>
                          <p className="text-muted-foreground italic">
                            Give these details to your bot along with the private key.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {agent.onchain_registry_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Registry ID
                      </p>
                      <CopyableAddress address={agent.onchain_registry_id} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Registered {formatDate(agent.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
