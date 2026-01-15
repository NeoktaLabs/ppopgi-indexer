import { Bytes } from "@graphprotocol/graph-ts";

import {
  LotteryRegistered as LotteryRegisteredEvent,
  RegistrarSet as RegistrarSetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/LotteryRegistry/LotteryRegistry";

import { Raffle, RaffleEvent, Registrar, RegistryOwner } from "../generated/schema";

function eventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

export function handleLotteryRegistered(event: LotteryRegisteredEvent): void {
  let raffleId = event.params.lottery as Bytes;
  let r = Raffle.load(raffleId);

  // It’s possible the registry registers something the deployer didn’t index (rare), but handle it.
  if (r == null) {
    r = new Raffle(raffleId);

    // Minimal defaults so the subgraph does not crash
    r.deployer = Bytes.empty();
    r.creator = event.params.creator;
    r.name = "";
    r.createdAt = event.block.timestamp;
    r.deploymentTx = event.transaction.hash;

    r.winningPot = BigInt.zero();
    r.ticketPrice = BigInt.zero();
    r.protocolFeePercent = BigInt.zero();
    r.feeRecipient = Bytes.empty();
    r.usdc = Bytes.empty();
    r.entropy = Bytes.empty();
    r.entropyProvider = Bytes.empty();
    r.deadline = BigInt.zero();
    r.minTickets = BigInt.zero();
    r.maxTickets = BigInt.zero();

    r.status = "OPEN";
    r.paused = false;

    r.sold = BigInt.zero();
    r.ticketRevenue = BigInt.zero();

    r.callbackRejectedCount = BigInt.zero();
    r.indexedAtBlock = event.block.number;
    r.indexedAtTimestamp = event.block.timestamp;
    r.lastUpdatedTx = event.transaction.hash;
  }

  r.registry = event.address; // registry address
  r.isRegistered = true;
  r.typeId = event.params.typeId;
  r.registryIndex = event.params.index;
  r.registeredAt = event.block.timestamp;

  r.indexedAtBlock = event.block.number;
  r.indexedAtTimestamp = event.block.timestamp;
  r.lastUpdatedTx = event.transaction.hash;

  r.save();

  // Optional audit event
  let ev = new RaffleEvent(eventId(event.transaction.hash, event.logIndex));
  ev.raffle = raffleId;
  ev.type = "REGISTERED";
  ev.actor = event.params.creator;
  ev.aux = event.params.typeId;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();
}

export function handleRegistrarSet(event: RegistrarSetEvent): void {
  let id = event.params.registrar as Bytes;
  let reg = Registrar.load(id);
  if (reg == null) reg = new Registrar(id);

  reg.authorized = event.params.authorized;
  reg.updatedAtBlock = event.block.number;
  reg.updatedAtTimestamp = event.block.timestamp;
  reg.lastUpdatedTx = event.transaction.hash;
  reg.save();
}

export function handleRegistryOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let o = RegistryOwner.load("REGISTRY_OWNER");
  if (o == null) o = new RegistryOwner("REGISTRY_OWNER");

  o.owner = event.params.newOwner;
  o.updatedAtBlock = event.block.number;
  o.updatedAtTimestamp = event.block.timestamp;
  o.lastUpdatedTx = event.transaction.hash;
  o.save();
}