import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { RaffleEvent } from "../generated/schema";

export function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

export function touchIndexing(entity: { indexedAtBlock: BigInt; indexedAtTimestamp: BigInt }, event: ethereum.Event): void {
  entity.indexedAtBlock = event.block.number;
  entity.indexedAtTimestamp = event.block.timestamp;
}

export function newRaffleEvent(raffle: Bytes, kind: string, event: ethereum.Event): RaffleEvent {
  let e = new RaffleEvent(eventId(event));
  e.raffle = raffle;
  e.kind = kind;
  e.blockNumber = event.block.number;
  e.timestamp = event.block.timestamp;
  e.txHash = event.transaction.hash;
  return e;
}