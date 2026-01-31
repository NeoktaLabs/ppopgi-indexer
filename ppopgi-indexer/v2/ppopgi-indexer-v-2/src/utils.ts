// src/utils.ts
import { Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { RaffleEvent, Raffle } from "../generated/schema";

export function eventId(event: ethereum.Event): Bytes {
  // Unique per log: txHash + logIndex
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

export function touchRaffle(raffle: Raffle, event: ethereum.Event): void {
  raffle.lastUpdatedBlock = event.block.number;
  raffle.lastUpdatedTimestamp = event.block.timestamp;
}

/**
 * Ensures we only write valid enum values into RaffleEvent.type.
 * If an unknown string is passed, we fall back to a safe enum value
 * instead of crashing indexing.
 *
 * IMPORTANT: You should still add the missing enum values in schema.graphql.
 */
function normalizeEventType(t: string): string {
  // ✅ Keep this list in sync with schema.graphql enum RaffleEventType
  if (t == "FACTORY_CONFIG_UPDATED") return t;
  if (t == "FACTORY_OWNER_CHANGED") return t;
  if (t == "REGISTRY_OWNER_CHANGED") return t;
  if (t == "REGISTRAR_SET") return t;
  if (t == "LOTTERY_REGISTERED") return t;
  if (t == "LOTTERY_DEPLOYED") return t;
  if (t == "REGISTRATION_FAILED") return t;

  // funding/open transition (add to schema!)
  if (t == "FUNDING_CONFIRMED") return t;

  // participation
  if (t == "TICKETS_PURCHASED") return t;

  // draw lifecycle
  if (t == "LOTTERY_FINALIZED") return t;
  if (t == "CALLBACK_REJECTED") return t;
  if (t == "WINNER_PICKED") return t;
  if (t == "GOVERNANCE_LOCK_UPDATED") return t;

  // cancellation / recovery
  if (t == "LOTTERY_CANCELED") return t;
  if (t == "EMERGENCY_RECOVERY") return t;

  // allocations / claims
  if (t == "PRIZE_ALLOCATED") return t;
  if (t == "REFUND_ALLOCATED") return t;
  if (t == "FUNDS_CLAIMED") return t;
  if (t == "NATIVE_REFUND_ALLOCATED") return t;
  if (t == "NATIVE_CLAIMED") return t;
  if (t == "PROTOCOL_FEES_COLLECTED") return t;

  // admin / maintenance
  if (t == "ENTROPY_PROVIDER_UPDATED") return t;
  if (t == "ENTROPY_CONTRACT_UPDATED") return t;
  if (t == "CALLBACK_GAS_LIMIT_UPDATED") return t;
  if (t == "LOTTERY_OWNER_CHANGED") return t;
  if (t == "PAUSED") return t;
  if (t == "UNPAUSED") return t;
  if (t == "SURPLUS_SWEPT") return t;
  if (t == "NATIVE_SURPLUS_SWEPT") return t;

  // ✅ fallback: don't crash indexing
  log.warning("[utils] Unknown RaffleEventType '{}', falling back to REGISTRATION_FAILED", [t]);
  return "REGISTRATION_FAILED";
}

export function createRaffleEvent(raffleId: Bytes, t: string, event: ethereum.Event): RaffleEvent {
  const e = new RaffleEvent(eventId(event));
  e.raffle = raffleId;
  e.type = normalizeEventType(t);

  e.blockNumber = event.block.number;
  e.blockTimestamp = event.block.timestamp;
  e.txHash = event.transaction.hash;
  e.logIndex = event.logIndex;

  return e;
}