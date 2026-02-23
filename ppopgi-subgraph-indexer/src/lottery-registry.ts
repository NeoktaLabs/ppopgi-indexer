import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  LotteryRegistered,
  OwnershipTransferred,
  RegistrarSet,
} from "../generated/LotteryRegistry/LotteryRegistry";

import { Registry, Registrar, Lottery, RegistryEvent } from "../generated/schema";
import { SingleWinnerLottery as SingleWinnerLotteryTemplate } from "../generated/templates";

const REGISTRY_ID = "registry";
const TYPE_SINGLE_WINNER = BigInt.fromI32(1);

function mkEventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

export function handleRegistryOwnershipTransferred(event: OwnershipTransferred): void {
  let reg = Registry.load(REGISTRY_ID);
  if (reg == null) {
    reg = new Registry(REGISTRY_ID);
    reg.totalLotteries = BigInt.zero();
  }
  reg.owner = event.params.newOwner;
  reg.save();

  const e = new RegistryEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "OwnershipTransferred";
  e.registry = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.oldOwner = event.params.oldOwner;
  e.newOwner = event.params.newOwner;
  e.save();
}

export function handleRegistrarSet(event: RegistrarSet): void {
  // Registrar entity
  const id = event.params.registrar.toHexString();
  let r = Registrar.load(id);
  if (r == null) {
    r = new Registrar(id);
  }
  r.authorized = event.params.authorized;
  r.updatedAt = event.block.timestamp;
  r.updatedTx = event.transaction.hash;
  r.save();

  const e = new RegistryEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "RegistrarSet";
  e.registry = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.registrar = event.params.registrar;
  e.authorized = event.params.authorized;
  e.save();
}

export function handleLotteryRegistered(event: LotteryRegistered): void {
  // Registry singleton
  let reg = Registry.load(REGISTRY_ID);
  if (reg == null) {
    reg = new Registry(REGISTRY_ID);
    reg.totalLotteries = BigInt.zero();
  }
  reg.totalLotteries = reg.totalLotteries.plus(BigInt.fromI32(1));
  reg.latestLottery = event.params.lottery;
  reg.save();

  // Lottery entity (canonical upsert)
  const lotAddr = event.params.lottery;
  const id = lotAddr.toHexString();

  let lot = Lottery.load(id);
  if (lot == null) {
    lot = new Lottery(id);

    // defaults
    lot.typeId = event.params.typeId;
    lot.creator = event.params.creator;
    lot.registeredAt = event.block.timestamp;
    lot.sold = BigInt.zero();
    lot.ticketRevenue = BigInt.zero();
  }

  lot.typeId = event.params.typeId;
  lot.creator = event.params.creator;
  lot.registeredAt = event.block.timestamp;
  lot.registryIndex = event.params.index;

  lot.save();

  // Audit event row
  const e = new RegistryEvent(mkEventId(event.transaction.hash, event.logIndex));
  e.kind = "LotteryRegistered";
  e.registry = event.address;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.lottery = event.params.lottery;
  e.typeId = event.params.typeId;
  e.creator = event.params.creator;
  e.registryIndex = event.params.index;
  e.save();

  // Spawn template for SingleWinnerLottery only (typeId == 1)
  if (event.params.typeId.equals(TYPE_SINGLE_WINNER)) {
    SingleWinnerLotteryTemplate.create(Address.fromBytes(lotAddr));
  }
}