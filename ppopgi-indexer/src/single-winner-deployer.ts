import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent,
  RegistrationFailed as RegistrationFailedEvent,
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer";

import { LotterySingleWinner as LotteryTemplate } from "../generated/templates";

import {
  FactoryConfig,
  Raffle,
  RaffleEvent,
  DeployerOwner,
} from "../generated/schema";

function raffleId(addr: Address): Bytes {
  return addr as Bytes;
}

function eventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

export function handleConfigUpdated(event: ConfigUpdatedEvent): void {
  let id = event.address as Bytes; // deployer address as ID
  let cfg = FactoryConfig.load(id);
  if (cfg == null) {
    cfg = new FactoryConfig(id);
  }

  cfg.usdc = event.params.usdc;
  cfg.entropy = event.params.entropy;
  cfg.entropyProvider = event.params.provider;
  cfg.feeRecipient = event.params.feeRecipient;
  cfg.protocolFeePercent = event.params.protocolFeePercent;

  cfg.updatedAtBlock = event.block.number;
  cfg.updatedAtTimestamp = event.block.timestamp;
  cfg.lastUpdatedTx = event.transaction.hash;

  cfg.save();

  // Optional audit event
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = Bytes.empty(); // no specific raffle
  ev.type = "FACTORY_CONFIG_UPDATED";
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.addressValue = event.params.feeRecipient;
  ev.aux = event.params.protocolFeePercent;
  ev.save();
}

export function handleDeployerOwnershipTransferred(
  event: DeployerOwnershipTransferredEvent
): void {
  let owner = DeployerOwner.load("DEPLOYER_OWNER");
  if (owner == null) {
    owner = new DeployerOwner("DEPLOYER_OWNER");
  }

  owner.owner = event.params.newOwner;
  owner.updatedAtBlock = event.block.number;
  owner.updatedAtTimestamp = event.block.timestamp;
  owner.lastUpdatedTx = event.transaction.hash;
  owner.save();

  // Optional audit event
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = Bytes.empty();
  ev.type = "DEPLOYER_OWNER_CHANGED";
  ev.actor = event.params.newOwner;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleLotteryDeployed(event: LotteryDeployedEvent): void {
  // 1) Create / update the main Raffle row
  let id = raffleId(event.params.lottery);
  let r = Raffle.load(id);

  if (r == null) {
    r = new Raffle(id);

    r.deployer = event.address; // deployer address
    r.registry = null;
    r.isRegistered = false;
    r.typeId = null;
    r.registryIndex = null;
    r.registeredAt = null;

    r.createdAt = event.block.timestamp;
    r.deploymentTx = event.transaction.hash;

    // Event-derived defaults
    r.status = "OPEN"; // after confirmFunding in deployer flow
    r.paused = false;
    r.lastPauseChangedAt = null;

    r.sold = BigInt.zero();
    r.soldAtDrawing = null;
    r.soldAtCancel = null;
    r.ticketRevenue = BigInt.zero();

    r.winner = null;
    r.winningTicketIndex = null;
    r.completedAt = null;

    r.selectedProvider = null;
    r.finalizeRequestId = null;
    r.drawingRequestedAt = null;
    r.callbackRejectedCount = BigInt.zero();

    r.canceledReason = null;
    r.canceledAt = null;
    r.potRefund = null;
  }

  r.creator = event.params.creator;
  r.name = event.params.name;

  r.winningPot = event.params.winningPot;
  r.ticketPrice = event.params.ticketPrice;

  r.usdc = event.params.usdc;
  r.entropy = event.params.entropy;
  r.entropyProvider = event.params.entropyProvider;
  r.feeRecipient = event.params.feeRecipient;
  r.protocolFeePercent = event.params.protocolFeePercent;

  r.deadline = event.params.deadline;
  r.minTickets = event.params.minTickets;
  r.maxTickets = event.params.maxTickets;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;

  r.save();

  // 2) Create an audit event row (optional but great for "not a scam" UX)
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = id;
  ev.type = "DEPLOYED";
  ev.actor = event.params.creator;
  ev.amount = event.params.winningPot; // pot size
  ev.aux = event.params.ticketPrice; // ticket price
  ev.addressValue = event.params.feeRecipient;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  // 3) Instantiate the dynamic template so we index this lottery’s events
  LotteryTemplate.create(event.params.lottery);
}

export function handleRegistrationFailed(event: RegistrationFailedEvent): void {
  // Optional audit event: shows registry failure happened
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId(event.params.lottery);
  ev.type = "REGISTRATION_FAILED";
  ev.actor = event.params.creator;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}