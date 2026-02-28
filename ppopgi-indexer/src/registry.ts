// registry.ts
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  LotteryRegistered,
  OwnershipTransferred,
  RegistrarSet,
} from "../generated/LotteryRegistry/LotteryRegistry";

// ✅ NEW: template import (for registry-based spawning)
import { SingleWinnerLottery as SingleWinnerLotteryTemplate } from "../generated/templates";

import {
  Registry,
  Registrar,
  Lottery,
  RegistryEvent,
  GlobalStats,
} from "../generated/schema";

const REGISTRY_ID = "registry";
const GLOBAL_ID = "global";

// ✅ keep in sync with your deployer constant / registry type id
const SINGLE_WINNER_TYPE_ID = BigInt.fromI32(1);

function mkEventId(tx: Bytes, logIndex: BigInt): string {
  return tx.toHexString() + "-" + logIndex.toString();
}

/**
 * ✅ Load or create GlobalStats singleton
 */
function loadOrCreateGlobal(ts: BigInt, tx: Bytes): GlobalStats {
  let g = GlobalStats.load(GLOBAL_ID);
  if (g == null) {
    g = new GlobalStats(GLOBAL_ID);
    g.totalLotteriesCreated = BigInt.zero();
    g.totalLotteriesSettled = BigInt.zero();
    g.totalLotteriesCanceled = BigInt.zero();
    g.totalTicketsSold = BigInt.zero();
    g.totalTicketRevenueUSDC = BigInt.zero();
    g.totalPrizesSettledUSDC = BigInt.zero();
    g.activeVolumeUSDC = BigInt.zero();
  }

  g.updatedAt = ts;
  g.updatedTx = tx;
  return g as GlobalStats;
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
  let reg = Registry.load(REGISTRY_ID);
  if (reg == null) {
    reg = new Registry(REGISTRY_ID);
    reg.totalLotteries = BigInt.zero();
  }

  // ✅ Deterministic: registry emits the canonical index (0-based)
  reg.totalLotteries = event.params.index.plus(BigInt.fromI32(1));
  reg.latestLottery = event.params.lottery;
  reg.save();

  /**
   * ✅ GlobalStats: increment totalLotteriesCreated
   * (kept incremental as you had it; you could also set this to reg.totalLotteries if you prefer canonical)
   */
  const g = loadOrCreateGlobal(event.block.timestamp, event.transaction.hash);
  g.totalLotteriesCreated = g.totalLotteriesCreated.plus(BigInt.fromI32(1));
  g.save();

  const id = event.params.lottery.toHexString();
  let lot = Lottery.load(id);

  // This entity is typically created earlier by handleLotteryDeployed (deployer),
  // but we still support registry-only creation for robustness.
  if (lot == null) {
    lot = new Lottery(id);

    // required fields in your schema
    lot.sold = BigInt.zero();
    lot.ticketRevenue = BigInt.zero();

    // ✅ NEW required field from schema update
    lot.templateSpawned = false;
  } else {
    // safety: if older data exists (pre-migration), ensure the required field is set
    if (lot.templateSpawned == null) {
      lot.templateSpawned = false;
    }
  }

  // Canonical registry metadata
  lot.typeId = event.params.typeId;
  lot.creator = event.params.creator;
  lot.registeredAt = event.block.timestamp;
  lot.registryIndex = event.params.index;

  // ✅ Spawn template for typeId==1 lotteries if deployer didn't already do it
  if (event.params.typeId.equals(SINGLE_WINNER_TYPE_ID) && lot.templateSpawned == false) {
    SingleWinnerLotteryTemplate.create(event.params.lottery);
    lot.templateSpawned = true;
    lot.indexedAt = event.block.timestamp; // optional field in schema
  }

  lot.save();

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
}