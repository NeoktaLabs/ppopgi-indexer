import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  CallbackRejected,
  Claimed,
  EmergencyRecovery,
  FundingConfirmed,
  FundsClaimed,
  LotteryCanceled,
  LotteryFinalized,
  PrizeAllocated,
  ProtocolFeesCollected,
  RefundAllocated,
  TicketRefundClaimed,
  TicketsPurchased,
  WinnerPicked,
  SingleWinnerLottery,
} from "../generated/templates/SingleWinnerLottery/SingleWinnerLottery";

import {
  Lottery,
  UserLottery,
  TicketPurchaseEvent,
  LotteryFinalizedEvent,
  WinnerPickedEvent,
  LotteryCanceledEvent,
  CallbackRejectedEvent,
  PrizeAllocatedEvent,
  RefundAllocatedEvent,
  ProtocolFeesCollectedEvent,
  FundingConfirmedEvent,
  FundsClaimedEvent,
  TicketRefundClaimedEvent,
  ClaimedEvent,
  EmergencyRecoveryEvent,
} from "../generated/schema";

function mkEventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

function mkUserLotteryId(lottery: Address, user: Address): string {
  return lottery.toHexString() + "-" + user.toHexString();
}

function loadOrCreateLottery(addr: Address, ts: BigInt): Lottery {
  const id = addr.toHexString();
  let lot = Lottery.load(id);
  if (lot == null) {
    lot = new Lottery(id);
    lot.typeId = BigInt.fromI32(1);
    lot.creator = Address.zero();
    lot.registeredAt = ts;
    lot.sold = BigInt.zero();
    lot.ticketRevenue = BigInt.zero();
  }

  // Best-effort sync from contract for “100% match”
  const c = SingleWinnerLottery.bind(addr);

  const s = c.try_status();
  if (!s.reverted) lot.status = s.value as i32;

  const nm = c.try_name();
  if (!nm.reverted) lot.name = nm.value;

  const creator = c.try_creator();
  if (!creator.reverted) lot.creator = creator.value;

  const usdc = c.try_usdcToken();
  if (!usdc.reverted) lot.usdcToken = usdc.value;

  const feeRec = c.try_feeRecipient();
  if (!feeRec.reverted) lot.feeRecipient = feeRec.value;

  const feePct = c.try_protocolFeePercent();
  if (!feePct.reverted) lot.protocolFeePercent = feePct.value;

  const ent = c.try_entropy();
  if (!ent.reverted) lot.entropy = ent.value;

  const prov = c.try_entropyProvider();
  if (!prov.reverted) lot.entropyProvider = prov.value;

  const gas = c.try_callbackGasLimit();
  if (!gas.reverted) lot.callbackGasLimit = gas.value; // already BigInt

  const createdAt = c.try_createdAt();
  if (!createdAt.reverted) lot.createdAt = createdAt.value; // already BigInt

  const deadline = c.try_deadline();
  if (!deadline.reverted) lot.deadline = deadline.value; // already BigInt

  const ticketPrice = c.try_ticketPrice();
  if (!ticketPrice.reverted) lot.ticketPrice = ticketPrice.value;

  const winningPot = c.try_winningPot();
  if (!winningPot.reverted) lot.winningPot = winningPot.value;

  const minTickets = c.try_minTickets();
  if (!minTickets.reverted) lot.minTickets = minTickets.value; // already BigInt

  const maxTickets = c.try_maxTickets();
  if (!maxTickets.reverted) lot.maxTickets = maxTickets.value; // already BigInt

  const minBuy = c.try_minPurchaseAmount();
  if (!minBuy.reverted) lot.minPurchaseAmount = minBuy.value; // already BigInt

  const winner = c.try_winner();
  if (!winner.reverted) lot.winner = winner.value;

  const sel = c.try_selectedProvider();
  if (!sel.reverted) lot.selectedProvider = sel.value;

  const req = c.try_entropyRequestId();
  if (!req.reverted) lot.entropyRequestId = req.value; // already BigInt

  const drawAt = c.try_drawingRequestedAt();
  if (!drawAt.reverted) lot.drawingRequestedAt = drawAt.value; // already BigInt

  const soldAtDrawing = c.try_soldAtDrawing();
  if (!soldAtDrawing.reverted) lot.soldAtDrawing = soldAtDrawing.value;

  const soldAtCancel = c.try_soldAtCancel();
  if (!soldAtCancel.reverted) lot.soldAtCancel = soldAtCancel.value;

  const canceledAt = c.try_canceledAt();
  if (!canceledAt.reverted) lot.canceledAt = canceledAt.value; // already BigInt

  const cpr = c.try_creatorPotRefunded();
  if (!cpr.reverted) lot.creatorPotRefunded = cpr.value;

  const rev = c.try_ticketRevenue();
  if (!rev.reverted) lot.ticketRevenue = rev.value;

  const sold = c.try_getSold();
  if (!sold.reverted) lot.sold = sold.value;

  const reserved = c.try_totalReservedUSDC();
  if (!reserved.reverted) lot.totalReservedUSDC = reserved.value;

  lot.save();
  return lot;
}

function loadOrCreateUserLottery(lottery: Lottery, user: Address, ts: BigInt, tx: Bytes): UserLottery {
  const id = mkUserLotteryId(Address.fromString(lottery.id), user);
  let ul = UserLottery.load(id);
  if (ul == null) {
    ul = new UserLottery(id);
    ul.lottery = lottery.id;
    ul.user = user;
    ul.ticketsPurchased = BigInt.zero();
    ul.usdcSpent = BigInt.zero();
    ul.ticketRefundAmount = BigInt.zero();
    ul.fundsClaimedAmount = BigInt.zero();
  }
  ul.updatedAt = ts;
  ul.updatedTx = tx;
  ul.save();
  return ul;
}

export function handleTicketsPurchased(event: TicketsPurchased): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  // Update state from event (authoritative and cheaper)
  lot.sold = event.params.totalSold;
  lot.ticketRevenue = lot.ticketRevenue.plus(event.params.totalCost);
  lot.save();

  // Per-user rollup
  const ul = loadOrCreateUserLottery(lot, event.params.buyer, event.block.timestamp, event.transaction.hash);
  ul.ticketsPurchased = ul.ticketsPurchased.plus(event.params.count);
  ul.usdcSpent = ul.usdcSpent.plus(event.params.totalCost);
  ul.save();

  // Event entity
  const e = new TicketPurchaseEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.buyer = event.params.buyer;
  e.count = event.params.count;
  e.totalCost = event.params.totalCost;
  e.totalSold = event.params.totalSold;
  e.rangeIndex = event.params.rangeIndex;
  e.isNewRange = event.params.isNewRange;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleLotteryFinalized(event: LotteryFinalized): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  // requestId is already BigInt in your generated bindings
  lot.entropyRequestId = event.params.requestId;
  lot.selectedProvider = event.params.provider;
  lot.drawingRequestedAt = event.block.timestamp;
  lot.sold = event.params.totalSold;
  lot.status = 2; // Drawing
  lot.save();

  const e = new LotteryFinalizedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.requestId = event.params.requestId; // already BigInt
  e.totalSold = event.params.totalSold;
  e.provider = event.params.provider;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleWinnerPicked(event: WinnerPicked): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  lot.winner = event.params.winner;
  lot.sold = event.params.totalSold;
  lot.status = 3; // Completed
  lot.save();

  const e = new WinnerPickedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.winner = event.params.winner;
  e.winningTicketIndex = event.params.winningTicketIndex;
  e.totalSold = event.params.totalSold;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleLotteryCanceled(event: LotteryCanceled): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  lot.status = 4; // Canceled
  lot.cancelReason = event.params.reason;
  lot.sold = event.params.sold;
  lot.ticketRevenue = event.params.ticketRevenue;
  lot.canceledAt = event.block.timestamp;
  lot.save();

  const e = new LotteryCanceledEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.reason = event.params.reason;
  e.sold = event.params.sold;
  e.ticketRevenue = event.params.ticketRevenue;
  e.potRefund = event.params.potRefund;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleCallbackRejected(event: CallbackRejected): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const e = new CallbackRejectedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.sequenceNumber = event.params.sequenceNumber; // already BigInt
  e.reasonCode = event.params.reasonCode as i32;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handlePrizeAllocated(event: PrizeAllocated): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const e = new PrizeAllocatedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.user = event.params.user;
  e.amount = event.params.amount;
  e.reason = event.params.reason as i32;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleRefundAllocated(event: RefundAllocated): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const e = new RefundAllocatedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.user = event.params.user;
  e.amount = event.params.amount;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleProtocolFeesCollected(event: ProtocolFeesCollected): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const e = new ProtocolFeesCollectedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.amount = event.params.amount;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleFundingConfirmed(event: FundingConfirmed): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  // FundingConfirmed implies Open
  lot.status = 1;
  lot.save();

  const e = new FundingConfirmedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.funder = event.params.funder;
  e.amount = event.params.amount;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleFundsClaimed(event: FundsClaimed): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const ul = loadOrCreateUserLottery(lot, event.params.user, event.block.timestamp, event.transaction.hash);
  ul.fundsClaimedAmount = ul.fundsClaimedAmount.plus(event.params.amount);
  ul.save();

  const e = new FundsClaimedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.user = event.params.user;
  e.amount = event.params.amount;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleTicketRefundClaimed(event: TicketRefundClaimed): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const ul = loadOrCreateUserLottery(lot, event.params.user, event.block.timestamp, event.transaction.hash);
  ul.ticketRefundAmount = ul.ticketRefundAmount.plus(event.params.amount);
  ul.save();

  const e = new TicketRefundClaimedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.user = event.params.user;
  e.amount = event.params.amount;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleClaimed(event: Claimed): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const ul = loadOrCreateUserLottery(lot, event.params.user, event.block.timestamp, event.transaction.hash);
  ul.fundsClaimedAmount = ul.fundsClaimedAmount.plus(event.params.funds);
  ul.ticketRefundAmount = ul.ticketRefundAmount.plus(event.params.ticketRefund);
  ul.save();

  const e = new ClaimedEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;
  e.user = event.params.user;
  e.funds = event.params.funds;
  e.ticketRefund = event.params.ticketRefund;
  e.total = event.params.total;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}

export function handleEmergencyRecovery(event: EmergencyRecovery): void {
  const lot = loadOrCreateLottery(event.address, event.block.timestamp);

  const e = new EmergencyRecoveryEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.lottery = lot.id;

  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.save();
}