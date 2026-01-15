import { BigInt } from "@graphprotocol/graph-ts"
import {
  TicketsPurchased as TicketsPurchasedEvent,
  LotteryFinalized as LotteryFinalizedEvent,
  WinnerPicked as WinnerPickedEvent,
  LotteryCanceled as LotteryCanceledEvent,
  PrizeAllocated as PrizeAllocatedEvent,
  RefundAllocated as RefundAllocatedEvent,
  FundsClaimed as FundsClaimedEvent,
  NativeRefundAllocated as NativeRefundAllocatedEvent,
  NativeClaimed as NativeClaimedEvent,
  ProtocolFeesCollected as ProtocolFeesCollectedEvent,
  GovernanceLockUpdated as GovernanceLockUpdatedEvent,
  CallbackRejected as CallbackRejectedEvent,
  EmergencyRecovery as EmergencyRecoveryEvent,
  EntropyProviderUpdated as EntropyProviderUpdatedEvent,
  EntropyContractUpdated as EntropyContractUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
  SurplusSwept as SurplusSweptEvent,
  NativeSurplusSwept as NativeSurplusSweptEvent
} from "../generated/templates/LotterySingleWinner/LotterySingleWinner"

import {
  Raffle,
  RaffleStatus,
  RaffleEventType
} from "../generated/schema"

import { createRaffleEvent, touchRaffle } from "./utils"

function mustLoadRaffle(id: Bytes, event: ethereum.Event): Raffle {
  let r = Raffle.load(id)
  if (r == null) {
    // Should not happen if deployer is indexed, but keep safe.
    r = new Raffle(id)
    r.creator = event.transaction.from
    r.name = "Unknown"
    r.createdAtBlock = event.block.number
    r.createdAtTimestamp = event.block.timestamp
    r.creationTx = event.transaction.hash

    r.usdc = event.address
    r.entropy = event.address
    r.entropyProvider = event.address
    r.feeRecipient = event.address
    r.protocolFeePercent = BigInt.zero()

    r.winningPot = BigInt.zero()
    r.ticketPrice = BigInt.zero()
    r.deadline = BigInt.zero()
    r.minTickets = BigInt.zero()
    r.maxTickets = BigInt.zero()

    r.isRegistered = false
    r.paused = false
    r.status = RaffleStatus.OPEN
    r.sold = BigInt.zero()
    r.ticketRevenue = BigInt.zero()
    r.lastUpdatedBlock = event.block.number
    r.lastUpdatedTimestamp = event.block.timestamp
  }
  return r as Raffle
}

// --- participation
export function handleTicketsPurchased(event: TicketsPurchasedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.sold = event.params.totalSold
  raffle.ticketRevenue = raffle.ticketRevenue.plus(event.params.totalCost)

  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.TICKETS_PURCHASED, event)
  ev.actor = event.params.buyer
  ev.amount = event.params.totalCost
  ev.uintValue = event.params.count
  ev.amount2 = event.params.totalSold
  ev.save()
}

// --- draw lifecycle
export function handleLotteryFinalized(event: LotteryFinalizedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.status = RaffleStatus.DRAWING
  raffle.finalizeRequestId = BigInt.fromU64(event.params.requestId)
  raffle.finalizedAt = event.block.timestamp
  raffle.selectedProvider = event.params.provider
  raffle.sold = event.params.totalSold

  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.LOTTERY_FINALIZED, event)
  ev.requestId = BigInt.fromU64(event.params.requestId)
  ev.amount2 = event.params.totalSold
  ev.target = event.params.provider
  ev.save()
}

export function handleWinnerPicked(event: WinnerPickedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.status = RaffleStatus.COMPLETED
  raffle.winner = event.params.winner
  raffle.winningTicketIndex = event.params.winningTicketIndex
  raffle.sold = event.params.totalSold
  raffle.completedAt = event.block.timestamp

  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.WINNER_PICKED, event)
  ev.actor = event.params.winner
  ev.uintValue = event.params.winningTicketIndex
  ev.amount2 = event.params.totalSold
  ev.save()
}

export function handleCallbackRejected(event: CallbackRejectedEvent): void {
  let raffleId = event.address

  let ev = createRaffleEvent(raffleId, RaffleEventType.CALLBACK_REJECTED, event)
  ev.requestId = BigInt.fromU64(event.params.sequenceNumber)
  ev.reasonCode = event.params.reasonCode
  ev.save()
}

export function handleGovernanceLockUpdated(event: GovernanceLockUpdatedEvent): void {
  // This is global in contract, but emitted per-lottery instance.
  let raffleId = event.address

  let ev = createRaffleEvent(raffleId, RaffleEventType.GOVERNANCE_LOCK_UPDATED, event)
  ev.uintValue = event.params.activeDrawings
  ev.save()
}

// --- cancellation / recovery
export function handleLotteryCanceled(event: LotteryCanceledEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.status = RaffleStatus.CANCELED
  raffle.canceledReason = event.params.reason
  raffle.canceledAt = event.block.timestamp
  raffle.soldAtCancel = event.params.sold
  raffle.sold = event.params.sold
  raffle.ticketRevenue = event.params.ticketRevenue

  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.LOTTERY_CANCELED, event)
  ev.text = event.params.reason
  ev.amount2 = event.params.sold
  ev.amount = event.params.ticketRevenue
  ev.save()
}

export function handleEmergencyRecovery(event: EmergencyRecoveryEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.EMERGENCY_RECOVERY, event)
  ev.save()
}

// --- allocations / claims (shield modal gold)
export function handlePrizeAllocated(event: PrizeAllocatedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.PRIZE_ALLOCATED, event)
  ev.actor = event.params.user
  ev.amount = event.params.amount
  ev.reasonCode = event.params.reason
  ev.save()
}

export function handleRefundAllocated(event: RefundAllocatedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.REFUND_ALLOCATED, event)
  ev.actor = event.params.user
  ev.amount = event.params.amount
  ev.save()
}

export function handleFundsClaimed(event: FundsClaimedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.FUNDS_CLAIMED, event)
  ev.actor = event.params.user
  ev.amount = event.params.amount
  ev.save()
}

export function handleNativeRefundAllocated(event: NativeRefundAllocatedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.NATIVE_REFUND_ALLOCATED, event)
  ev.actor = event.params.user
  ev.amount = event.params.amount
  ev.save()
}

export function handleNativeClaimed(event: NativeClaimedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.NATIVE_CLAIMED, event)
  ev.actor = event.params.user
  ev.amount = event.params.amount
  ev.save()
}

export function handleProtocolFeesCollected(event: ProtocolFeesCollectedEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.PROTOCOL_FEES_COLLECTED, event)
  ev.amount = event.params.amount
  ev.save()
}

// --- configuration changes
export function handleEntropyProviderUpdated(event: EntropyProviderUpdatedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.entropyProvider = event.params.newProvider
  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.ENTROPY_PROVIDER_UPDATED, event)
  ev.target = event.params.newProvider
  ev.save()
}

export function handleEntropyContractUpdated(event: EntropyContractUpdatedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.entropy = event.params.newContract
  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.ENTROPY_CONTRACT_UPDATED, event)
  ev.target = event.params.newContract
  ev.save()
}

export function handleLotteryOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.LOTTERY_OWNER_CHANGED, event)
  ev.actor = event.params.previousOwner
  ev.target = event.params.newOwner
  ev.save()
}

// --- admin safety
export function handlePaused(event: PausedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.paused = true
  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.PAUSED, event)
  ev.actor = event.params.account
  ev.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let raffleId = event.address
  let raffle = mustLoadRaffle(raffleId, event)

  raffle.paused = false
  touchRaffle(raffle, event)
  raffle.save()

  let ev = createRaffleEvent(raffleId, RaffleEventType.UNPAUSED, event)
  ev.actor = event.params.account
  ev.save()
}

export function handleSurplusSwept(event: SurplusSweptEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.SURPLUS_SWEPT, event)
  ev.target = event.params.to
  ev.amount = event.params.amount
  ev.save()
}

export function handleNativeSurplusSwept(event: NativeSurplusSweptEvent): void {
  let raffleId = event.address
  let ev = createRaffleEvent(raffleId, RaffleEventType.NATIVE_SURPLUS_SWEPT, event)
  ev.target = event.params.to
  ev.amount = event.params.amount
  ev.save()
}