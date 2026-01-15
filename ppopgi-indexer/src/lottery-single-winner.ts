import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  TicketsPurchased as TicketsPurchasedEvent,
  LotteryFinalized as LotteryFinalizedEvent,
  WinnerPicked as WinnerPickedEvent,
  LotteryCanceled as LotteryCanceledEvent,
  PrizeAllocated as PrizeAllocatedEvent,
  GovernanceLockUpdated as GovernanceLockUpdatedEvent,
  CallbackRejected as CallbackRejectedEvent,
  EntropyProviderUpdated as EntropyProviderUpdatedEvent,
  EntropyContractUpdated as EntropyContractUpdatedEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
} from "../generated/templates/LotterySingleWinner/LotterySingleWinner";

import { Raffle, RaffleEvent } from "../generated/schema";

function raffleId(addr: Address): Bytes {
  return addr as Bytes;
}

function eventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

function mustLoadRaffle(addr: Address): Raffle {
  let id = raffleId(addr);
  let r = Raffle.load(id);
  if (r == null) {
    // This should be rare (template created without deployer event).
    r = new Raffle(id);

    r.deployer = Bytes.empty();
    r.registry = null;
    r.isRegistered = false;
    r.typeId = null;
    r.registryIndex = null;
    r.registeredAt = null;

    r.creator = Bytes.empty();
    r.name = "";
    r.createdAt = BigInt.zero();
    r.deploymentTx = Bytes.empty();

    r.winningPot = BigInt.zero();
    r.ticketPrice = BigInt.zero();
    r.protocolFeePercent = BigInt.zero();
    r.feeRecipient = Bytes.empty();
    r.usdc = Bytes.empty();
    r.entropy = Bytes.empty();
    r.entropyProvider = Bytes.empty();

    r.selectedProvider = null;
    r.finalizeRequestId = null;
    r.drawingRequestedAt = null;
    r.callbackRejectedCount = BigInt.zero();

    r.status = "OPEN";
    r.deadline = BigInt.zero();

    r.sold = BigInt.zero();
    r.soldAtDrawing = null;
    r.soldAtCancel = null;
    r.ticketRevenue = BigInt.zero();

    r.winner = null;
    r.winningTicketIndex = null;
    r.completedAt = null;

    r.canceledReason = null;
    r.canceledAt = null;
    r.potRefund = null;

    r.paused = false;
    r.lastPauseChangedAt = null;

    r.minTickets = BigInt.zero();
    r.maxTickets = BigInt.zero();

    r.indexedAtBlock = BigInt.zero();
    r.indexedAtTimestamp = BigInt.zero();
    r.lastUpdatedTx = Bytes.empty();
  }
  return r as Raffle;
}

export function handleTicketsPurchased(event: TicketsPurchasedEvent): void {
  let r = mustLoadRaffle(event.address);

  // totalSold is provided in the event (best for indexer)
  r.sold = event.params.totalSold;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  // Optional audit event
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "PURCHASED";
  ev.actor = event.params.buyer;
  ev.amount = event.params.totalCost;
  ev.aux = event.params.totalSold;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleLotteryFinalized(event: LotteryFinalizedEvent): void {
  let r = mustLoadRaffle(event.address);

  r.status = "DRAWING";
  r.finalizeRequestId = BigInt.fromU64(event.params.requestId);
  r.soldAtDrawing = event.params.totalSold;
  r.drawingRequestedAt = event.block.timestamp;
  r.selectedProvider = event.params.provider;

  // Also set sold if it wasn’t set earlier
  r.sold = event.params.totalSold;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "FINALIZED";
  ev.addressValue = event.params.provider;
  ev.aux = BigInt.fromU64(event.params.requestId);
  ev.amount = event.params.totalSold;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleWinnerPicked(event: WinnerPickedEvent): void {
  let r = mustLoadRaffle(event.address);

  r.status = "COMPLETED";
  r.winner = event.params.winner;
  r.winningTicketIndex = event.params.winningTicketIndex;
  r.completedAt = event.block.timestamp;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "WINNER_PICKED";
  ev.actor = event.params.winner;
  ev.aux = event.params.winningTicketIndex;
  ev.amount = event.params.totalSold;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleLotteryCanceled(event: LotteryCanceledEvent): void {
  let r = mustLoadRaffle(event.address);

  r.status = "CANCELED";
  r.canceledReason = event.params.reason;
  r.canceledAt = event.block.timestamp;
  r.soldAtCancel = event.params.sold;
  r.ticketRevenue = event.params.ticketRevenue;
  r.potRefund = event.params.potRefund;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "CANCELED";
  ev.text = event.params.reason;
  ev.amount = event.params.sold;
  ev.aux = event.params.ticketRevenue;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handlePrizeAllocated(event: PrizeAllocatedEvent): void {
  // This event is your best “trust + transparency” primitive.
  // We don’t store per-user balances in the indexer (by design),
  // but we DO store an audit trail of payouts / allocations.
  let r = mustLoadRaffle(event.address);

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "PRIZE_ALLOCATED";
  ev.actor = event.params.user;
  ev.amount = event.params.amount;
  ev.aux = BigInt.fromI32(event.params.reason); // 1=winner,2=creator,3=refund,4=protocol,5=creatorPotRefund
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleGovernanceLockUpdated(event: GovernanceLockUpdatedEvent): void {
  // Optional, but useful if you want to show “draw in progress” signals
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "GOVERNANCE_LOCK_UPDATED";
  ev.aux = event.params.activeDrawings;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleCallbackRejected(event: CallbackRejectedEvent): void {
  let r = mustLoadRaffle(event.address);
  r.callbackRejectedCount = r.callbackRejectedCount.plus(BigInt.fromI32(1));
  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "CALLBACK_REJECTED";
  ev.aux = BigInt.fromI32(event.params.reasonCode);
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleEntropyProviderUpdated(event: EntropyProviderUpdatedEvent): void {
  let r = mustLoadRaffle(event.address);
  r.entropyProvider = event.params.newProvider;
  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "ENTROPY_PROVIDER_UPDATED";
  ev.addressValue = event.params.newProvider;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleEntropyContractUpdated(event: EntropyContractUpdatedEvent): void {
  let r = mustLoadRaffle(event.address);
  r.entropy = event.params.newContract;
  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();

  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.address);
  ev.type = "ENTROPY_CONTRACT_UPDATED";
  ev.addressValue = event.params.newContract;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handlePaused(event: PausedEvent): void {
  let r = mustLoadRaffle(event.address);
  r.paused = true;
  r.lastPauseChangedAt = event.block.timestamp;
  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  let r = mustLoadRaffle(event.address);
  r.paused = false;
  r.lastPauseChangedAt = event.block.timestamp;
  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;
  r.save();
}