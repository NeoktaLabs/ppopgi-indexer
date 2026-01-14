import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  FundingConfirmed,
  TicketsPurchased,
  LotteryFinalized,
  WinnerPicked,
  LotteryCanceled,
  Paused,
  Unpaused,
  OwnershipTransferred
} from "../generated/templates/LotterySingleWinner/LotterySingleWinner";
import { Raffle } from "../generated/schema";
import { eventId, touchIndexing, newRaffleEvent } from "./_helpers";

function loadRaffle(addr: Bytes): Raffle | null {
  return Raffle.load(addr);
}

export function handleFundingConfirmed(event: FundingConfirmed): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;

  r.fundingConfirmedAt = event.block.timestamp;
  r.fundingConfirmedTxHash = event.transaction.hash;
  r.status = "OPEN";

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "FUNDING_CONFIRMED", event);
  e.save();
}

export function handleTicketsPurchased(event: TicketsPurchased): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;

  r.sold = event.params.totalSold;
  // display-only best effort accumulation
  if (r.ticketRevenue == null) r.ticketRevenue = BigInt.zero();
  r.ticketRevenue = (r.ticketRevenue as BigInt).plus(event.params.totalCost);

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "TICKETS_PURCHASED", event);
  e.buyer = event.params.buyer as Bytes;
  e.count = event.params.count;
  e.totalCost = event.params.totalCost;
  e.totalSold = event.params.totalSold;
  e.save();
}

export function handleLotteryFinalized(event: LotteryFinalized): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;

  r.status = "DRAWING";
  r.finalizeRequestId = BigInt.fromU64(event.params.requestId);
  r.selectedProvider = event.params.provider as Bytes;

  r.soldAtDrawing = event.params.totalSold;
  r.sold = event.params.totalSold;

  r.drawRequestedAt = event.block.timestamp;
  r.finalizedAt = event.block.timestamp;
  r.finalizedTxHash = event.transaction.hash;

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "FINALIZED", event);
  e.requestId = BigInt.fromU64(event.params.requestId);
  e.provider = event.params.provider as Bytes;
  e.totalSold = event.params.totalSold;
  e.save();
}

export function handleWinnerPicked(event: WinnerPicked): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;

  r.status = "COMPLETED";
  r.winner = event.params.winner as Bytes;
  r.winningTicketIndex = event.params.winningTicketIndex;
  r.sold = event.params.totalSold;

  r.completedAt = event.block.timestamp;
  r.winnerTxHash = event.transaction.hash;

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "WINNER_PICKED", event);
  e.winner = event.params.winner as Bytes;
  e.winningTicketIndex = event.params.winningTicketIndex;
  e.totalSold = event.params.totalSold;
  e.save();
}

export function handleLotteryCanceled(event: LotteryCanceled): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;

  r.status = "CANCELED";
  r.canceledReason = event.params.reason;
  r.soldAtCancel = event.params.sold;
  r.ticketRevenue = event.params.ticketRevenue;
  r.potRefund = event.params.potRefund;

  r.canceledAt = event.block.timestamp;
  r.canceledTxHash = event.transaction.hash;

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "CANCELED", event);
  e.canceledReason = event.params.reason;
  e.totalSold = event.params.sold;
  e.ticketRevenue = event.params.ticketRevenue;
  e.potRefund = event.params.potRefund;
  e.save();
}

export function handlePaused(event: Paused): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;
  r.paused = true;
  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "PAUSED", event);
  e.save();
}

export function handleUnpaused(event: Unpaused): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;
  r.paused = false;
  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "UNPAUSED", event);
  e.save();
}

export function handleRaffleOwnershipTransferred(event: OwnershipTransferred): void {
  let r = loadRaffle(event.address as Bytes);
  if (r == null) return;
  r.owner = event.params.newOwner as Bytes;
  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.address as Bytes, "OWNERSHIP_TRANSFERRED", event);
  e.oldOwner = event.params.oldOwner as Bytes;
  e.newOwner = event.params.newOwner as Bytes;
  e.save();
}