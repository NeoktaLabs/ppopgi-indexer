import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ConfigUpdated,
  DeployerOwnershipTransferred,
  LotteryDeployed,
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer";

import { Deployer, Lottery, DeployerEvent } from "../generated/schema";

function mkEventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

export function handleDeployerOwnershipTransferred(event: DeployerOwnershipTransferred): void {
  const depId = event.address.toHexString();
  let d = Deployer.load(depId);
  if (d == null) d = new Deployer(depId);

  d.owner = event.params.newOwner;
  d.updatedAt = event.block.timestamp;
  d.updatedTx = event.transaction.hash;
  d.save();

  const e = new DeployerEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "DeployerOwnershipTransferred";
  e.deployer = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.oldOwner = event.params.oldOwner;
  e.newOwner = event.params.newOwner;
  e.save();
}

export function handleConfigUpdated(event: ConfigUpdated): void {
  const depId = event.address.toHexString();
  let d = Deployer.load(depId);
  if (d == null) d = new Deployer(depId);

  d.usdc = event.params.usdc;
  d.entropy = event.params.entropy;
  d.provider = event.params.provider;

  // uint32 -> BigInt
  d.callbackGasLimit = BigInt.fromI32(event.params.callbackGasLimit);

  d.feeRecipient = event.params.feeRecipient;
  d.protocolFeePercent = event.params.protocolFeePercent;

  d.updatedAt = event.block.timestamp;
  d.updatedTx = event.transaction.hash;
  d.save();

  const e = new DeployerEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "ConfigUpdated";
  e.deployer = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;

  e.usdc = event.params.usdc;
  e.entropy = event.params.entropy;
  e.provider = event.params.provider;

  // uint32 -> BigInt
  e.callbackGasLimit = BigInt.fromI32(event.params.callbackGasLimit);

  e.feeRecipient = event.params.feeRecipient;
  e.protocolFeePercent = event.params.protocolFeePercent;
  e.save();
}

export function handleLotteryDeployed(event: LotteryDeployed): void {
  // Upsert Lottery creation snapshot (may be created later by registry event too)
  const lotAddr = event.params.lottery;
  const id = lotAddr.toHexString();

  let lot = Lottery.load(id);
  if (lot == null) {
    lot = new Lottery(id);
    // defaults until registry arrives
    lot.typeId = BigInt.fromI32(1);
    lot.creator = event.params.creator;
    lot.registeredAt = event.block.timestamp; // placeholder
    lot.sold = BigInt.zero();
    lot.ticketRevenue = BigInt.zero();
  }

  lot.deployedBy = event.address;
  lot.deployedAt = event.block.timestamp;
  lot.deployedTx = event.transaction.hash;

  // Snapshot data from event
  lot.name = event.params.name;
  lot.usdcToken = event.params.usdc;
  lot.entropy = event.params.entropy;
  lot.entropyProvider = event.params.entropyProvider;

  // uint32 -> BigInt
  lot.callbackGasLimit = BigInt.fromI32(event.params.callbackGasLimit);

  lot.feeRecipient = event.params.feeRecipient;
  lot.protocolFeePercent = event.params.protocolFeePercent;

  lot.ticketPrice = event.params.ticketPrice;
  lot.winningPot = event.params.winningPot;

  // These are already BigInt in generated typings (uint64 -> BigInt)
  lot.deadline = event.params.deadline;
  lot.minTickets = event.params.minTickets;
  lot.maxTickets = event.params.maxTickets;

  lot.creator = event.params.creator;

  lot.save();

  // Deployer audit event row
  const e = new DeployerEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "LotteryDeployed";
  e.deployer = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;

  e.lottery = event.params.lottery;
  e.creator = event.params.creator;
  e.winningPot = event.params.winningPot;
  e.ticketPrice = event.params.ticketPrice;
  e.name = event.params.name;
  e.usdc = event.params.usdc;
  e.entropy = event.params.entropy;
  e.entropyProvider = event.params.entropyProvider;

  // uint32 -> BigInt
  e.callbackGasLimit = BigInt.fromI32(event.params.callbackGasLimit);

  e.feeRecipient = event.params.feeRecipient;
  e.protocolFeePercent = event.params.protocolFeePercent;

  // already BigInt (uint64 -> BigInt)
  e.deadline = event.params.deadline;
  e.minTickets = event.params.minTickets;
  e.maxTickets = event.params.maxTickets;

  e.save();
}