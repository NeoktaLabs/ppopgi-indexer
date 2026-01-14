import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  OwnershipTransferred,
  RegistrarSet,
  LotteryRegistered
} from "../generated/LotteryRegistry/LotteryRegistry";
import { RegistryConfig, RegistrarAuthorization, Raffle } from "../generated/schema";
import { eventId, touchIndexing, newRaffleEvent } from "./_helpers";

function getRegistryConfig(registry: Bytes, blockNumber: BigInt, timestamp: BigInt, txHash: Bytes): RegistryConfig {
  let cfg = RegistryConfig.load(registry);
  if (cfg == null) {
    cfg = new RegistryConfig(registry);
    cfg.owner = Bytes.empty();
    cfg.totalRegistered = BigInt.zero();
  }
  cfg.updatedAtBlock = blockNumber;
  cfg.updatedAtTimestamp = timestamp;
  cfg.updatedTxHash = txHash;
  return cfg as RegistryConfig;
}

export function handleRegistryOwnershipTransferred(event: OwnershipTransferred): void {
  let registryAddr = event.address as Bytes;
  let cfg = getRegistryConfig(registryAddr, event.block.number, event.block.timestamp, event.transaction.hash);
  cfg.owner = event.params.newOwner as Bytes;
  cfg.save();
}

export function handleRegistrarSet(event: RegistrarSet): void {
  let id = event.address.toHexString() + "-" + event.params.registrar.toHexString();
  let ra = new RegistrarAuthorization(id);
  ra.registry = event.address as Bytes;
  ra.registrar = event.params.registrar as Bytes;
  ra.authorized = event.params.authorized;
  ra.updatedAtBlock = event.block.number;
  ra.updatedAtTimestamp = event.block.timestamp;
  ra.txHash = event.transaction.hash;
  ra.save();
}

export function handleLotteryRegistered(event: LotteryRegistered): void {
  let raffleAddr = event.params.lottery as Bytes;

  let r = Raffle.load(raffleAddr);
  if (r == null) {
    // fallback stub: ideally this already exists from LotteryDeployed
    r = new Raffle(raffleAddr);
    r.isRegistered = false;
    r.registrationFailed = false;

    // minimal placeholders to satisfy non-null fields
    r.deployer = Bytes.empty();
    r.creator = event.params.creator as Bytes;
    r.owner = Bytes.empty();
    r.name = "";
    r.createdAtTimestamp = event.block.timestamp;
    r.createdAtBlock = event.block.number;
    r.createdTxHash = event.transaction.hash;

    r.usdc = Bytes.empty();
    r.entropy = Bytes.empty();
    r.entropyProvider = Bytes.empty();
    r.feeRecipient = Bytes.empty();
    r.protocolFeePercent = BigInt.zero();

    r.ticketPrice = BigInt.zero();
    r.winningPot = BigInt.zero();
    r.deadline = BigInt.zero();
    r.minTickets = BigInt.zero();
    r.maxTickets = BigInt.zero();
    r.minPurchaseAmount = BigInt.zero();

    r.status = "OPEN"; // will be corrected by later events if any
    r.paused = false;

    r.indexedAtBlock = event.block.number;
    r.indexedAtTimestamp = event.block.timestamp;
  }

  r.isRegistered = true;
  r.registry = event.address as Bytes;
  r.registryIndex = event.params.index;
  r.typeId = event.params.typeId;
  r.registryCreator = event.params.creator as Bytes;
  r.registeredAt = event.block.timestamp;
  r.registeredTxHash = event.transaction.hash;
  r.registrationFailed = false;

  touchIndexing(r, event);
  r.lastEventId = eventId(event);
  r.save();

  // also maintain registry totalRegistered (best-effort)
  let cfg = getRegistryConfig(event.address as Bytes, event.block.number, event.block.timestamp, event.transaction.hash);
  if (cfg.totalRegistered == null) cfg.totalRegistered = BigInt.zero();
  cfg.totalRegistered = (cfg.totalRegistered as BigInt).plus(BigInt.fromI32(1));
  cfg.save();

  // optional event feed record
  let e = newRaffleEvent(raffleAddr, "REGISTERED", event);
  e.save();
}