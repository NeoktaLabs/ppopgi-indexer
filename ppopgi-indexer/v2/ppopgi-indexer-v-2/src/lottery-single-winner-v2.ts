// src/lottery-single-winner.ts (V2-adapted, updated full file, SAME NAMES)

import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import {
  FundingConfirmed as FundingConfirmedEvent,
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
  CallbackGasLimitUpdated as CallbackGasLimitUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
  SurplusSwept as SurplusSweptEvent,
  NativeSurplusSwept as NativeSurplusSweptEvent,
  LotterySingleWinnerV2 as LotteryContract,
} from "../generated/templates/LotterySingleWinner/LotterySingleWinnerV2";

import { Raffle } from "../generated/schema";
import { createRaffleEvent, touchRaffle } from "./utils";

/**
 * Backfill missing raffle fields directly from the lottery contract.
 * This is critical when your subgraph startBlock skips older deployer events:
 * the registry/template can discover a raffle, but without deployer metadata it stays at zeros.
 */
function backfillFromContract(r: Raffle, lotteryAddr: Address): void {
  const lot = LotteryContract.bind(lotteryAddr);

  // numbers
  if (r.ticketPrice.equals(BigInt.zero())) {
    const v = lot.try_ticketPrice();
    if (!v.reverted) r.ticketPrice = v.value;
  }

  if (r.winningPot.equals(BigInt.zero())) {
    const v = lot.try_winningPot();
    if (!v.reverted) r.winningPot = v.value;
  }

  if (r.deadline.equals(BigInt.zero())) {
    const v = lot.try_deadline();
    if (!v.reverted) r.deadline = v.value;
  }

  if (r.minTickets.equals(BigInt.zero())) {
    const v = lot.try_minTickets();
    if (!v.reverted) r.minTickets = v.value;
  }

  if (r.maxTickets.equals(BigInt.zero())) {
    const v = lot.try_maxTickets();
    if (!v.reverted) r.maxTickets = v.value;
  }

  if (r.minPurchaseAmount.equals(BigInt.zero())) {
    const v = lot.try_minPurchaseAmount();
    if (!v.reverted) r.minPurchaseAmount = v.value;
  }

  // addresses
  if (r.usdc.equals(Address.zero())) {
    const v = lot.try_usdcToken();
    if (!v.reverted) r.usdc = v.value;
  }

  if (r.entropy.equals(Address.zero())) {
    const v = lot.try_entropy();
    if (!v.reverted) r.entropy = v.value;
  }

  if (r.entropyProvider.equals(Address.zero())) {
    const v = lot.try_entropyProvider();
    if (!v.reverted) r.entropyProvider = v.value;
  }

  if (r.feeRecipient.equals(Address.zero())) {
    const v = lot.try_feeRecipient();
    if (!v.reverted) r.feeRecipient = v.value;
  }

  if (r.protocolFeePercent.equals(BigInt.zero())) {
    const v = lot.try_protocolFeePercent();
    if (!v.reverted) r.protocolFeePercent = v.value;
  }

  // nice-to-have: creator + name if fallback was used
  const c = lot.try_creator();
  if (!c.reverted) r.creator = c.value;

  if (r.name == "Unknown" || r.name == "Unnamed" || r.name.length == 0) {
    const n = lot.try_name();
    if (!n.reverted) r.name = n.value;
  }

  // callbackGasLimit can be updated after deploy; try to backfill too
  if (r.callbackGasLimit.equals(BigInt.zero())) {
    const g = lot.try_callbackGasLimit();
    if (!g.reverted) r.callbackGasLimit = g.value;
  }

  // ✅ safety net: if status stuck in FUNDING_PENDING (due to missing event),
  // backfill it from the contract's status() value.
  if (r.status == "FUNDING_PENDING") {
    const s = lot.try_status();
    if (!s.reverted) {
      const n = s.value.toI32();
      if (n == 1) r.status = "OPEN";
      else if (n == 2) r.status = "DRAWING";
      else if (n == 3) r.status = "COMPLETED";
      else if (n == 4) r.status = "CANCELED";
    }
  }
}

function mustLoadRaffle(id: Bytes, event: ethereum.Event): Raffle {
  let r = Raffle.load(id);

  if (r == null) {
    // Should not happen if registry/deployer are indexed, but keep safe.
    r = new Raffle(id);

    r.creator = event.transaction.from;
    r.name = "Unknown";
    r.createdAtBlock = event.block.number;
    r.createdAtTimestamp = event.block.timestamp;
    r.creationTx = event.transaction.hash;

    // ✅ correct defaults (event.address is the lottery contract address, NOT these fields)
    r.usdc = Address.zero();
    r.entropy = Address.zero();
    r.entropyProvider = Address.zero();
    r.feeRecipient = Address.zero();
    r.protocolFeePercent = BigInt.zero();

    // ✅ V2 required fields
    r.callbackGasLimit = BigInt.zero();
    r.minPurchaseAmount = BigInt.zero();

    r.winningPot = BigInt.zero();
    r.ticketPrice = BigInt.zero();
    r.deadline = BigInt.zero();
    r.minTickets = BigInt.zero();
    r.maxTickets = BigInt.zero();

    r.isRegistered = false;
    r.paused = false;
    r.status = "FUNDING_PENDING";
    r.sold = BigInt.zero();
    r.ticketRevenue = BigInt.zero();

    r.lastUpdatedBlock = event.block.number;
    r.lastUpdatedTimestamp = event.block.timestamp;
  }

  // ✅ critical: fill missing creation metadata from on-chain contract
  backfillFromContract(r as Raffle, event.address);

  return r as Raffle;
}

// --- funding / open transition
export function handleFundingConfirmed(event: FundingConfirmedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  // ✅ missing transition that makes cards show "Open"
  raffle.status = "OPEN";

  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "FUNDING_CONFIRMED", event);
  ev.actor = event.params.funder;
  ev.amount = event.params.amount;
  ev.save();
}

// --- participation
export function handleTicketsPurchased(event: TicketsPurchasedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.sold = event.params.totalSold;

  // ✅ safer than incrementing by totalCost (avoids drift)
  const lot = LotteryContract.bind(event.address);
  const rev = lot.try_ticketRevenue();
  if (!rev.reverted) {
    raffle.ticketRevenue = rev.value;
  } else {
    // fallback: keep previous behavior if read fails
    raffle.ticketRevenue = raffle.ticketRevenue.plus(event.params.totalCost);
  }

  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "TICKETS_PURCHASED", event);
  ev.actor = event.params.buyer;
  ev.amount = event.params.totalCost;
  ev.uintValue = event.params.count;
  ev.amount2 = event.params.totalSold;
  ev.save();
}

// --- draw lifecycle
export function handleLotteryFinalized(event: LotteryFinalizedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.status = "DRAWING";
  raffle.finalizeRequestId = event.params.requestId;
  raffle.finalizedAt = event.block.timestamp;
  raffle.selectedProvider = event.params.provider;
  raffle.sold = event.params.totalSold;

  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "LOTTERY_FINALIZED", event);
  ev.requestId = event.params.requestId;
  ev.amount2 = event.params.totalSold;
  ev.target = event.params.provider;
  ev.save();
}

export function handleWinnerPicked(event: WinnerPickedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.status = "COMPLETED";
  raffle.winner = event.params.winner;
  raffle.winningTicketIndex = event.params.winningTicketIndex;
  raffle.sold = event.params.totalSold;
  raffle.completedAt = event.block.timestamp;

  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "WINNER_PICKED", event);
  ev.actor = event.params.winner;
  ev.uintValue = event.params.winningTicketIndex;
  ev.amount2 = event.params.totalSold;
  ev.save();
}

export function handleCallbackRejected(event: CallbackRejectedEvent): void {
  const raffleId = event.address;

  const ev = createRaffleEvent(raffleId, "CALLBACK_REJECTED", event);
  ev.requestId = event.params.sequenceNumber;
  ev.reasonCode = event.params.reasonCode;
  ev.save();
}

export function handleGovernanceLockUpdated(event: GovernanceLockUpdatedEvent): void {
  // This is global in contract, but emitted per-lottery instance.
  const raffleId = event.address;

  const ev = createRaffleEvent(raffleId, "GOVERNANCE_LOCK_UPDATED", event);
  ev.uintValue = event.params.activeDrawings;
  ev.save();
}

// --- cancellation / recovery
export function handleLotteryCanceled(event: LotteryCanceledEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.status = "CANCELED";
  raffle.canceledReason = event.params.reason;
  raffle.canceledAt = event.block.timestamp;
  raffle.soldAtCancel = event.params.sold;
  raffle.sold = event.params.sold;
  raffle.ticketRevenue = event.params.ticketRevenue;

  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "LOTTERY_CANCELED", event);
  ev.text = event.params.reason;
  ev.amount2 = event.params.sold;
  ev.amount = event.params.ticketRevenue;
  ev.save();
}

export function handleEmergencyRecovery(event: EmergencyRecoveryEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "EMERGENCY_RECOVERY", event);
  ev.save();
}

// --- allocations / claims
export function handlePrizeAllocated(event: PrizeAllocatedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "PRIZE_ALLOCATED", event);
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.reasonCode = event.params.reason;
  ev.save();
}

export function handleRefundAllocated(event: RefundAllocatedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "REFUND_ALLOCATED", event);
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.save();
}

export function handleFundsClaimed(event: FundsClaimedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "FUNDS_CLAIMED", event);
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.save();
}

export function handleNativeRefundAllocated(event: NativeRefundAllocatedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "NATIVE_REFUND_ALLOCATED", event);
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.save();
}

export function handleNativeClaimed(event: NativeClaimedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "NATIVE_CLAIMED", event);
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.save();
}

export function handleProtocolFeesCollected(event: ProtocolFeesCollectedEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "PROTOCOL_FEES_COLLECTED", event);
  ev.amount = event.params.amount;
  ev.save();
}

// --- configuration changes
export function handleEntropyProviderUpdated(event: EntropyProviderUpdatedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.entropyProvider = event.params.newProvider;
  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "ENTROPY_PROVIDER_UPDATED", event);
  ev.target = event.params.newProvider;
  ev.save();
}

export function handleEntropyContractUpdated(event: EntropyContractUpdatedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.entropy = event.params.newContract;
  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "ENTROPY_CONTRACT_UPDATED", event);
  ev.target = event.params.newContract;
  ev.save();
}

export function handleCallbackGasLimitUpdated(event: CallbackGasLimitUpdatedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  // ✅ In your generated bindings, newGasLimit is BigInt
  raffle.callbackGasLimit = event.params.newGasLimit;
  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "CALLBACK_GAS_LIMIT_UPDATED", event);
  ev.uintValue = event.params.newGasLimit;
  ev.save();
}

export function handleLotteryOwnershipTransferred(event: OwnershipTransferredEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "LOTTERY_OWNER_CHANGED", event);
  ev.actor = event.params.previousOwner;
  ev.target = event.params.newOwner;
  ev.save();
}

// --- admin safety
export function handlePaused(event: PausedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.paused = true;
  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "PAUSED", event);
  ev.actor = event.params.account;
  ev.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  const raffleId = event.address;
  const raffle = mustLoadRaffle(raffleId, event);

  raffle.paused = false;
  touchRaffle(raffle, event);
  raffle.save();

  const ev = createRaffleEvent(raffleId, "UNPAUSED", event);
  ev.actor = event.params.account;
  ev.save();
}

export function handleSurplusSwept(event: SurplusSweptEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "SURPLUS_SWEPT", event);
  ev.target = event.params.to;
  ev.amount = event.params.amount;
  ev.save();
}

export function handleNativeSurplusSwept(event: NativeSurplusSweptEvent): void {
  const raffleId = event.address;
  const ev = createRaffleEvent(raffleId, "NATIVE_SURPLUS_SWEPT", event);
  ev.target = event.params.to;
  ev.amount = event.params.amount;
  ev.save();
}