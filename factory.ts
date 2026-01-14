import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  DeployerOwnershipTransferred,
  ConfigUpdated,
  LotteryDeployed,
  RegistrationFailed
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer";
import { FactoryConfig, Raffle } from "../generated/schema";
import { LotterySingleWinner as LotteryTemplate } from "../generated/templates";
import { eventId, touchIndexing, newRaffleEvent } from "./_helpers";

function getFactory(factoryAddr: Bytes, eventBlock: BigInt, eventTs: BigInt, txHash: Bytes): FactoryConfig {
  let f = FactoryConfig.load(factoryAddr);
  if (f == null) {
    f = new FactoryConfig(factoryAddr);
    f.owner = Bytes.empty();
    f.registry = Bytes.empty();
    f.safeOwner = Bytes.empty();
    f.usdc = Bytes.empty();
    f.entropy = Bytes.empty();
    f.entropyProvider = Bytes.empty();
    f.feeRecipient = Bytes.empty();
    f.protocolFeePercent = BigInt.zero();
  }
  f.updatedAtBlock = eventBlock;
  f.updatedAtTimestamp = eventTs;
  f.updatedTxHash = txHash;
  return f as FactoryConfig;
}

export function handleDeployerOwnershipTransferred(event: DeployerOwnershipTransferred): void {
  let f = getFactory(event.address as Bytes, event.block.number, event.block.timestamp, event.transaction.hash);
  f.owner = event.params.newOwner as Bytes;
  f.save();
}

export function handleConfigUpdated(event: ConfigUpdated): void {
  let f = getFactory(event.address as Bytes, event.block.number, event.block.timestamp, event.transaction.hash);
  f.usdc = event.params.usdc as Bytes;
  f.entropy = event.params.entropy as Bytes;
  f.entropyProvider = event.params.provider as Bytes;
  f.feeRecipient = event.params.feeRecipient as Bytes;
  f.protocolFeePercent = event.params.protocolFeePercent;
  f.save();
}

export function handleRegistrationFailed(event: RegistrationFailed): void {
  let r = Raffle.load(event.params.lottery as Bytes);
  if (r == null) return;
  r.registrationFailed = true;
  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  let e = newRaffleEvent(event.params.lottery as Bytes, "REGISTRATION_FAILED", event);
  e.save();
}

export function handleLotteryDeployed(event: LotteryDeployed): void {
  let factoryAddr = event.address as Bytes;
  let f = getFactory(factoryAddr, event.block.number, event.block.timestamp, event.transaction.hash);

  let raffleAddr = event.params.lottery as Bytes;

  let r = new Raffle(raffleAddr);
  r.isRegistered = false;
  r.registrationFailed = false;

  r.registry = f.registry;     // optional: set if you fill FactoryConfig.registry via init call or constants
  r.safeOwner = f.safeOwner;   // optional: set if you fill FactoryConfig.safeOwner

  r.deployer = factoryAddr;
  r.creator = event.params.creator as Bytes;

  // admin gating: owner should be safeOwner after deployment
  r.owner = f.safeOwner != null ? (f.safeOwner as Bytes) : Bytes.empty();

  r.name = event.params.name;

  r.createdAtTimestamp = event.block.timestamp;
  r.createdAtBlock = event.block.number;
  r.createdTxHash = event.transaction.hash;

  r.usdc = event.params.usdc as Bytes;
  r.entropy = event.params.entropy as Bytes;
  r.entropyProvider = event.params.entropyProvider as Bytes;
  r.feeRecipient = event.params.feeRecipient as Bytes;
  r.protocolFeePercent = event.params.protocolFeePercent;

  r.ticketPrice = event.params.ticketPrice;
  r.winningPot = event.params.winningPot;
  r.deadline = BigInt.fromU64(event.params.deadline);
  r.minTickets = BigInt.fromU64(event.params.minTickets);
  r.maxTickets = BigInt.fromU64(event.params.maxTickets);
  r.minPurchaseAmount = BigInt.zero(); // if you want it, you need a read or an event (you don't emit it)

  // Because deployer calls confirmFunding() before emitting LotteryDeployed,
  // the raffle is already OPEN.
  r.status = "OPEN";
  r.paused = false;

  // analytics defaults
  r.sold = BigInt.zero();
  r.ticketRevenue = BigInt.zero();

  // lifecycle defaults
  r.finalizeRequestId = null;
  r.selectedProvider = null;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastEventId = eventId(event);

  r.save();

  // Create dynamic data source to track this raffle’s lifecycle events
  LotteryTemplate.create(event.params.lottery);

  // timeline
  let e = newRaffleEvent(raffleAddr, "CREATED", event);
  e.save();
}